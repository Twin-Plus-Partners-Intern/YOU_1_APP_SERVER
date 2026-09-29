const { Op } = require("sequelize");
const { Plan, PlanDay, PlanTask } = require("../../models");
const { AppError } = require("../../core/middlewares/error.middleware");

class ProgressService {
  async getDayProgress(userId, date) {
    const days = await this._getDays(userId, { scheduled_date: date });
    if (!days.length) {
      return {
        mode: "day",
        date,
        has_plan: false,
        day_progress_percent: 0,
        task_progress_percent: 0,
        message: "No active plan scheduled for this day",
        plans: [],
      };
    }
    return {
      mode: "day",
      date,
      has_plan: true,
      ...this._summarizeDays(days),
      plans: this._summarizePlans(days),
    };
  }

  async getWeekProgress(userId, options = {}) {
    const start = options.week_start;
    const end = this._addDays(start, 6);
    const days = await this._getDays(userId, {
      scheduled_date: { [Op.between]: [start, end] },
    });
    const byDate = new Map();
    days.forEach((day) => {
      if (!byDate.has(day.scheduled_date)) byDate.set(day.scheduled_date, []);
      byDate.get(day.scheduled_date).push(day);
    });
    const weekDays = Array.from({ length: 7 }, (_, index) => {
      const date = this._addDays(start, index);
      const dateDays = byDate.get(date) || [];
      return {
        date,
        has_plan: dateDays.length > 0,
        ...(dateDays.length
          ? { ...this._summarizeDays(dateDays), plans: this._summarizePlans(dateDays) }
          : this._emptyDayProgress()),
      };
    });
    return {
      mode: "week",
      week_start: start,
      week_end: end,
      has_plan: days.length > 0,
      ...(days.length ? this._summarizeDays(days) : this._emptyDayProgress()),
      days: weekDays,
      plans: this._summarizePlans(days),
      ...(days.length ? {} : { message: "No active plan scheduled for this week" }),
    };
  }

  async getPlanProgress(userId, planId) {
    const plan = await Plan.findOne({ where: { id: planId, user_id: userId } });
    if (!plan) throw new AppError(404, "Plan not found");
    const isProgressPlan = ["active", "completed"].includes(plan.status);
    if (!isProgressPlan) {
      return {
        mode: "plan",
        plan: this._planMetadata(plan),
        has_plan: false,
        ...this._emptyDayProgress(),
        days: [],
        message: "Plan is not active or completed",
      };
    }

    const [days, summary] = await Promise.all([
      PlanDay.findAll({
        where: { plan_id: plan.id, status: { [Op.ne]: "cancelled" } },
        include: [{ model: PlanTask, as: "tasks" }],
        order: [["scheduled_date", "ASC"], ["week_num", "ASC"], ["day_num", "ASC"]],
      }),
      this._getPlanSummary(plan.id),
    ]);

    return {
      mode: "plan",
      plan: this._planMetadata(plan),
      has_plan: true,
      ...summary,
      days: days.map((day) => this._summarizeDay(day)),
    };
  }

  async _getPlanSummary(planId) {
    const dayWhere = { plan_id: planId, status: { [Op.ne]: "cancelled" } };
    const taskInclude = [{
      model: PlanDay,
      as: "planDay",
      required: true,
      where: { plan_id: planId, status: { [Op.ne]: "cancelled" } },
      attributes: [],
    }];
    const [totalPlanDays, completedPlanDays, totalTasks, completedTasks] = await Promise.all([
      PlanDay.count({ where: dayWhere }),
      PlanDay.count({ where: { ...dayWhere, status: "completed" } }),
      PlanTask.count({
        where: { status: { [Op.ne]: "cancelled" } },
        include: taskInclude,
      }),
      PlanTask.count({
        where: { status: "completed" },
        include: taskInclude,
      }),
    ]);
    return {
      day_progress_percent: this._percent(completedPlanDays, totalPlanDays),
      task_progress_percent: this._percent(completedTasks, totalTasks),
      total_plan_days: totalPlanDays,
      completed_plan_days: completedPlanDays,
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
    };
  }

  async _getDays(userId, where) {
    return PlanDay.findAll({
      where: { ...where, status: { [Op.ne]: "cancelled" } },
      include: [{
        model: Plan,
        as: "plan",
        required: true,
        where: { user_id: userId, status: { [Op.in]: ["active", "completed"] } },
        attributes: ["id", "name", "status", "start_date", "end_date"],
      }, { model: PlanTask, as: "tasks" }],
      order: [["scheduled_date", "ASC"], ["week_num", "ASC"], ["day_num", "ASC"]],
    });
  }

  _summarizeDays(days) {
    const tasks = days
      .flatMap((day) => day.tasks || [])
      .filter((task) => task.status !== "cancelled");
    const completedDays = days.filter((day) => day.status === "completed").length;
    const completedTasks = tasks.filter((task) => task.status === "completed").length;
    return {
      day_progress_percent: this._percent(completedDays, days.length),
      task_progress_percent: this._percent(completedTasks, tasks.length),
      total_plan_days: days.length,
      completed_plan_days: completedDays,
      total_tasks: tasks.length,
      completed_tasks: completedTasks,
    };
  }

  _summarizePlans(days) {
    const groups = new Map();
    days.forEach((day) => {
      if (!groups.has(day.plan_id)) groups.set(day.plan_id, []);
      groups.get(day.plan_id).push(day);
    });
    return Array.from(groups.entries()).map(([planId, planDays]) => ({
      plan_id: planId,
      name: planDays[0].plan.name,
      status: planDays[0].plan.status,
      ...this._summarizeDays(planDays),
    }));
  }

  _summarizeDay(day) {
    return {
      id: day.id,
      plan_id: day.plan_id,
      date: day.scheduled_date,
      title: day.title,
      status: day.status,
      week_num: day.week_num,
      day_num: day.day_num,
      ...this._summarizeDays([day]),
      tasks: (day.tasks || [])
        .filter((task) => task.status !== "cancelled")
        .map((task) => this._plain(task)),
    };
  }

  _emptyDayProgress() {
    return {
      day_progress_percent: 0,
      task_progress_percent: 0,
      total_plan_days: 0,
      completed_plan_days: 0,
      total_tasks: 0,
      completed_tasks: 0,
    };
  }

  _percent(completed, total) {
    return total ? Math.round((completed / total) * 10000) / 100 : 0;
  }

  _plain(value) {
    return typeof value.toJSON === "function" ? value.toJSON() : value;
  }

  _planMetadata(plan) {
    const value = this._plain(plan);
    return {
      id: value.id,
      name: value.name,
      goal: value.goal,
      status: value.status,
      start_date: value.start_date,
      end_date: value.end_date,
      available_days: value.available_days,
    };
  }

  _addDays(date, amount) {
    const current = this._date(date);
    current.setUTCDate(current.getUTCDate() + amount);
    return this._key(current);
  }

  _date(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  _key(date) {
    return date.toISOString().slice(0, 10);
  }
}

module.exports = new ProgressService();
