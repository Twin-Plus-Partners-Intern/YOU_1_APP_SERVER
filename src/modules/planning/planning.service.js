const { Op } = require("sequelize");
const { sequelize, User, Plan, PlanDay, PlanTask } = require("../../models");
const { AppError } = require("../../core/middlewares/error.middleware");

const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

class PlanningService {
  async createPlan(userId, input) {
    return sequelize.transaction(async (transaction) => {
      await this._ensureUser(userId, transaction);
      const { status, ...planInput } = input;
      this._assertPlanHasAvailableDay(planInput);
      const plan = await Plan.create({
        ...planInput,
        user_id: userId,
        status: "draft",
        available_days: this._normalizeAvailableDays(input.available_days),
      }, { transaction });
      await this._generatePlanDays(plan, transaction);
      return this._getPlan(userId, plan.id, transaction);
    });
  }

  async listPlans(userId, options = {}) {
    const { limit, offset } = this._getPagination(options);
    const where = { user_id: userId };
    if (options.status) where.status = options.status;
    const result = await Plan.findAndCountAll({
      where,
      include: [{ model: PlanDay, as: "days", include: [{ model: PlanTask, as: "tasks" }] }],
      order: [["start_date", "DESC"], ["created_at", "DESC"]],
      limit,
      offset,
      distinct: true,
    });
    return this._withPagination(result, limit, offset);
  }

  async getPlan(userId, planId) {
    return this._getPlan(userId, planId);
  }

  async listPlanDays(userId, planId, options = {}) {
    await this._getOwnedPlan(userId, planId);
    const { limit, offset } = this._getPagination(options);
    const where = { plan_id: planId };
    if (options.status) where.status = options.status;
    const result = await PlanDay.findAndCountAll({
      where,
      include: [{ model: PlanTask, as: "tasks" }],
      order: [["scheduled_date", "ASC"]],
      limit,
      offset,
      distinct: true,
    });
    return this._withPagination(result, limit, offset);
  }

  async updatePlan(userId, planId, input) {
    return sequelize.transaction(async (transaction) => {
      const plan = await this._getOwnedPlan(userId, planId, transaction);
      const next = { ...input };
      if (next.available_days) next.available_days = this._normalizeAvailableDays(next.available_days);
      if (next.start_date && next.end_date && next.end_date < next.start_date) {
        throw new AppError(400, "end_date must be on or after start_date");
      }
      if (next.start_date || next.end_date || next.available_days) {
        const dayCount = await PlanDay.count({ where: { plan_id: plan.id }, transaction });
        if (dayCount > 0) {
          throw new AppError(409, "Plan dates and available days cannot be changed after plan days are created");
        }
      }
      Object.assign(plan, next);
      await plan.save({ transaction });
      return this._getPlan(userId, planId, transaction);
    });
  }

  async transitionPlan(userId, planId, status) {
    return sequelize.transaction(async (transaction) => {
      const plan = await this._getOwnedPlan(userId, planId, transaction);
      this._assertPlanTransition(plan.status, status);
      plan.status = status;
      await plan.save({ transaction });

      if (status === "active") {
        return this._getPlan(userId, planId, transaction);
      }

      const dayStatus = status === "cancelled" ? "cancelled" : "completed";
      const taskStatus = dayStatus;
      const dayWhere = {
        plan_id: plan.id,
        status: status === "cancelled" ? { [Op.ne]: "cancelled" } : "pending",
      };
      const days = await PlanDay.findAll({ where: dayWhere, attributes: ["id"], transaction });
      await PlanDay.update({ status: dayStatus }, { where: dayWhere, transaction });
      if (days.length) {
        await PlanTask.update(
          { status: taskStatus },
          {
            where: {
              plan_day_id: { [Op.in]: days.map((day) => day.id) },
              status: "pending",
            },
            transaction,
          }
        );
      }
      return this._getPlan(userId, planId, transaction);
    });
  }

  async deletePlan(userId, planId) {
    return sequelize.transaction(async (transaction) => {
      const plan = await this._getOwnedPlan(userId, planId, transaction);
      await plan.destroy({ transaction });
      return { id: planId };
    });
  }

  async updatePlanDay(userId, dayId, input) {
    return sequelize.transaction(async (transaction) => {
      const day = await this._getOwnedPlanDay(userId, dayId, transaction);
      if (input.scheduled_date && input.scheduled_date !== day.scheduled_date) {
        await this._assertDateAvailable(userId, day.plan_id, input.scheduled_date, transaction);
        const position = this._getWeekPosition(day.plan.start_date, input.scheduled_date);
        await this._assertPlanSlotAvailable(day.plan_id, position, day.id, transaction);
      }

      Object.assign(day, input);
      await day.save({ transaction });
      return this._getOwnedPlanDay(userId, dayId, transaction);
    });
  }

  async getPlanDay(userId, dayId) {
    return this._getOwnedPlanDay(userId, dayId);
  }

  async completePlanDay(userId, dayId) {
    return sequelize.transaction(async (transaction) => {
      const day = await this._getOwnedPlanDay(userId, dayId, transaction);
      if (!day.plan || day.plan.status !== "active" || day.status !== "pending") {
        throw new AppError(409, "Plan day can only be completed while the plan is active");
      }
      day.status = "completed";
      await day.save({ transaction });
      await PlanTask.update(
        { status: "completed" },
        { where: { plan_day_id: day.id, status: "pending" }, transaction }
      );
      return this._getOwnedPlanDay(userId, dayId, transaction);
    });
  }

  async deletePlanDay(userId, dayId) {
    return sequelize.transaction(async (transaction) => {
      const day = await this._getOwnedPlanDay(userId, dayId, transaction);
      if (day.status !== "cancelled") {
        day.status = "cancelled";
        await day.save({ transaction });
      }
      await PlanTask.update({ status: "cancelled" }, {
        where: { plan_day_id: day.id, status: { [Op.ne]: "cancelled" } },
        transaction,
      });
      return this._getOwnedPlanDay(userId, dayId, transaction);
    });
  }

  async reschedulePlanDay(userId, dayId, input) {
    return sequelize.transaction(async (transaction) => {
      const day = await this._getOwnedPlanDay(userId, dayId, transaction);
      const plan = await this._getOwnedPlan(userId, day.plan_id, transaction);
      if (plan.status === "completed" || plan.status === "cancelled") {
        throw new AppError(409, "Plan cannot be rescheduled in its current status");
      }

      if (input.target_plan_day_id) {
        const target = await this._getOwnedPlanDay(userId, input.target_plan_day_id, transaction);
        if (target.plan_id !== day.plan_id) {
          throw new AppError(400, "Target plan day must belong to the same plan");
        }
        const oldDate = day.scheduled_date;
        day.scheduled_date = target.scheduled_date;
        target.scheduled_date = oldDate;
        [day.week_num, target.week_num] = [target.week_num, day.week_num];
        [day.day_num, target.day_num] = [target.day_num, day.day_num];
        await day.save({ transaction });
        await target.save({ transaction });
        return { day, swapped_with: target };
      }

      await this._assertDateAvailable(userId, plan.id, input.scheduled_date, transaction);
      const samePlanDay = await PlanDay.findOne({
        where: { plan_id: plan.id, scheduled_date: input.scheduled_date, id: { [Op.ne]: day.id } },
        transaction,
      });
      if (samePlanDay) {
        const oldDate = day.scheduled_date;
        day.scheduled_date = samePlanDay.scheduled_date;
        samePlanDay.scheduled_date = oldDate;
        await day.save({ transaction });
        await samePlanDay.save({ transaction });
        return { day, swapped_with: samePlanDay };
      }
      day.scheduled_date = input.scheduled_date;
      const parts = this._getWeekPosition(plan.start_date, input.scheduled_date);
      await this._assertPlanSlotAvailable(plan.id, parts, day.id, transaction);
      day.week_num = parts.week_num;
      day.day_num = parts.day_num;
      await day.save({ transaction });
      return { day };
    });
  }

  async cancelPlanDay(userId, dayId, fillGap = false) {
    return sequelize.transaction(async (transaction) => {
      const day = await this._getOwnedPlanDay(userId, dayId, transaction);
      const plan = await this._getOwnedPlan(userId, day.plan_id, transaction);
      if (plan.status !== "active") {
        throw new AppError(409, "Plan day can only be cancelled while the plan is active");
      }
      day.status = "cancelled";
      await day.save({ transaction });
      await PlanTask.update({ status: "cancelled" }, { where: { plan_day_id: day.id }, transaction });
      if (fillGap) await this._fillPlanDayGap(plan, day.scheduled_date, transaction);
      return this._getOwnedPlanDay(userId, dayId, transaction);
    });
  }

  async createPlanDay(userId, planId, input) {
    return sequelize.transaction(async (transaction) => {
      const plan = await this._getOwnedPlan(userId, planId, transaction);
      await this._assertDateAvailable(userId, planId, input.scheduled_date, transaction);
      const parts = this._getWeekPosition(plan.start_date, input.scheduled_date);
      const { status, ...dayInput } = input;
      const day = await PlanDay.create({
        ...dayInput, plan_id: plan.id, week_num: parts.week_num, day_num: parts.day_num,
        status: "pending",
      }, { transaction });
      return day;
    });
  }

  async _generatePlanDays(plan, transaction) {
    const available = this._normalizeAvailableDays(plan.available_days);
    const days = [];
    let current = this._dateAtUtc(plan.start_date);
    const end = this._dateAtUtc(plan.end_date);
    while (current <= end) {
      const weekday = current.getUTCDay();
      if (available.includes(weekday)) {
        const date = current.toISOString().slice(0, 10);
        const position = this._getWeekPosition(plan.start_date, date);
        days.push({
          plan_id: plan.id, week_num: position.week_num, day_num: position.day_num,
          scheduled_date: date, title: `Day ${days.length + 1}`, status: "pending",
        });
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }
    await PlanDay.bulkCreate(days, { transaction });
  }

  _assertPlanHasAvailableDay(input) {
    const available = this._normalizeAvailableDays(input.available_days);
    let current = this._dateAtUtc(input.start_date);
    const end = this._dateAtUtc(input.end_date);
    while (current <= end) {
      if (available.includes(current.getUTCDay())) return;
      current.setUTCDate(current.getUTCDate() + 1);
    }
    throw new AppError(400, "Plan range does not contain any available day", {
      warning: "plan_has_no_available_days",
    });
  }

  _assertPlanTransition(currentStatus, nextStatus) {
    const allowed = {
      draft: ["active", "cancelled"],
      active: ["completed", "cancelled"],
    };
    if (!allowed[currentStatus] || !allowed[currentStatus].includes(nextStatus)) {
      throw new AppError(409, `Plan cannot be changed from ${currentStatus} to ${nextStatus}`);
    }
  }

  async _fillPlanDayGap(plan, cancelledDate, transaction) {
    const laterDays = await PlanDay.findAll({
      where: { plan_id: plan.id, scheduled_date: { [Op.gt]: cancelledDate }, status: { [Op.ne]: "cancelled" } },
      order: [["scheduled_date", "ASC"]],
      transaction,
    });
    let previous = cancelledDate;
    for (const laterDay of laterDays) {
      const nextDate = this._nextAvailableDate(plan, previous);
      if (!nextDate || nextDate >= laterDay.scheduled_date) break;
      const position = this._getWeekPosition(plan.start_date, nextDate);
      laterDay.scheduled_date = nextDate;
      laterDay.week_num = position.week_num;
      laterDay.day_num = position.day_num;
      await laterDay.save({ transaction });
      previous = nextDate;
    }
  }

  async _assertDateAvailable(userId, planId, date, transaction) {
    const plan = await this._getOwnedPlan(userId, planId, transaction);
    if (date < plan.start_date || date > plan.end_date) {
      throw new AppError(409, "The selected date is outside the plan range", {
        warning: "outside_plan_range", scheduled_date: date,
      });
    }

    const weekday = this._dateAtUtc(date).getUTCDay();
    const available = this._normalizeAvailableDays(plan.available_days);
    if (!available.includes(weekday)) {
      throw new AppError(409, "The selected date is not an available day for this plan", {
        warning: "unavailable_day", scheduled_date: date,
      });
    }
    const occupied = await PlanDay.findOne({
      include: [{ model: Plan, as: "plan", where: { user_id: userId }, attributes: [] }],
      where: { scheduled_date: date, plan_id: { [Op.ne]: planId }, status: { [Op.ne]: "cancelled" } },
      transaction,
    });
    if (occupied) {
      throw new AppError(409, "The selected date is already used by another plan", {
        warning: "date_already_planned", scheduled_date: date,
      });
    }
  }

  async _assertPlanSlotAvailable(planId, position, excludedDayId, transaction) {
    const occupied = await PlanDay.findOne({
      where: {
        plan_id: planId,
        week_num: position.week_num,
        day_num: position.day_num,
        id: { [Op.ne]: excludedDayId },
      },
      transaction,
    });
    if (occupied) {
      throw new AppError(409, "The selected plan position is already occupied", {
        warning: "plan_day_position_occupied",
      });
    }
  }

  async _getPlan(userId, planId, transaction = undefined) {
    return Plan.findOne({
      where: { id: planId, user_id: userId },
      include: [{ model: PlanDay, as: "days", include: [{ model: PlanTask, as: "tasks" }] }],
      order: [[{ model: PlanDay, as: "days" }, "scheduled_date", "ASC"]],
      transaction,
    }).then((plan) => {
      if (!plan) throw new AppError(404, "Plan not found");
      return plan;
    });
  }

  async _getOwnedPlan(userId, planId, transaction) {
    const plan = await Plan.findOne({ where: { id: planId, user_id: userId }, transaction });
    if (!plan) throw new AppError(404, "Plan not found");
    return plan;
  }

  async _getOwnedPlanDay(userId, dayId, transaction) {
    const day = await PlanDay.findOne({
      where: { id: dayId },
      include: [{ model: Plan, as: "plan", where: { user_id: userId } }, { model: PlanTask, as: "tasks" }],
      transaction,
    });
    if (!day) throw new AppError(404, "Plan day not found");
    return day;
  }

  async _ensureUser(userId, transaction) {
    if (!(await User.findByPk(userId, { transaction }))) throw new AppError(404, "User not found");
  }

  _normalizeAvailableDays(days = [1, 2, 3, 4, 5]) {
    return [...new Set(days.map((day) => typeof day === "string" ? WEEKDAYS[day] : day))].sort();
  }

  _dateAtUtc(date) {
    const [year, month, day] = String(date).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  _getWeekPosition(startDate, date) {
    const start = this._dateAtUtc(startDate);
    const current = this._dateAtUtc(date);
    const difference = Math.floor((current - start) / 86400000);
    return { week_num: Math.floor(difference / 7) + 1, day_num: (difference % 7) + 1 };
  }

  _nextAvailableDate(plan, fromDate) {
    const available = this._normalizeAvailableDays(plan.available_days);
    const date = this._dateAtUtc(fromDate);
    const end = this._dateAtUtc(plan.end_date);
    while (date < end) {
      date.setUTCDate(date.getUTCDate() + 1);
      if (available.includes(date.getUTCDay())) return date.toISOString().slice(0, 10);
    }
    return null;
  }

  _getPagination(options = {}) {
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
    const page = Math.max(Number(options.page) || 1, 1);
    return { limit, offset: (page - 1) * limit };
  }

  _withPagination(result, limit, offset) {
    const total = Number(result.count);
    return {
      rows: result.rows,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new PlanningService();
