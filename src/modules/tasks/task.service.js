const { sequelize, Plan, PlanDay, PlanTask } = require("../../models");
const { AppError } = require("../../core/middlewares/error.middleware");

class TaskService {
  async listTasks(userId, options = {}) {
    const where = {};
    if (options.plan_day_id) where.plan_day_id = options.plan_day_id;
    const { limit, offset } = this._getPagination(options);
    const result = await PlanTask.findAndCountAll({
      where,
      include: [{
        model: PlanDay,
        as: "planDay",
        required: true,
        include: [{ model: Plan, as: "plan", required: true, where: { user_id: userId } }],
      }],
      order: [["created_at", "ASC"]],
      limit,
      offset,
      distinct: true,
    });
    return {
      rows: result.rows,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: Number(result.count),
        total_pages: Math.ceil(Number(result.count) / limit),
      },
    };
  }

  async getTask(userId, taskId) {
    return this._getOwnedTask(userId, taskId);
  }

  async createTask(userId, input) {
    return sequelize.transaction(async (transaction) => {
      const day = await this._getOwnedPlanDay(userId, input.plan_day_id, transaction);
      this._assertTaskMutable(day);
      const { status, ...taskInput } = input;
      return PlanTask.create({ ...taskInput, status: "pending" }, { transaction });
    });
  }

  async updateTask(userId, taskId, input) {
    return sequelize.transaction(async (transaction) => {
      const task = await this._getOwnedTask(userId, taskId, transaction);
      this._assertTaskMutable(task.planDay);
      if (input.plan_day_id && input.plan_day_id !== task.plan_day_id) {
        const nextDay = await this._getOwnedPlanDay(userId, input.plan_day_id, transaction);
        this._assertTaskMutable(nextDay);
      }
      Object.assign(task, input);
      await task.save({ transaction });
      return this._getOwnedTask(userId, taskId, transaction);
    });
  }

  async deleteTask(userId, taskId) {
    return sequelize.transaction(async (transaction) => {
      const task = await this._getOwnedTask(userId, taskId, transaction);
      this._assertTaskMutable(task.planDay);
      await task.destroy({ transaction });
      return { id: taskId };
    });
  }

  async cancelTask(userId, taskId) {
    return sequelize.transaction(async (transaction) => {
      const task = await this._getOwnedTask(userId, taskId, transaction);
      if (!task.planDay.plan || task.planDay.plan.status !== "active" || task.planDay.status !== "pending") {
        throw new AppError(409, "Task can only be cancelled while the plan is active");
      }
      task.status = "cancelled";
      await task.save({ transaction });
      return task;
    });
  }

  async completeTask(userId, taskId) {
    return sequelize.transaction(async (transaction) => {
      const task = await this._getOwnedTask(userId, taskId, transaction);
      if (!task.planDay.plan || task.planDay.plan.status !== "active" || task.planDay.status !== "pending") {
        throw new AppError(409, "Task can only be completed while the plan is active");
      }
      task.status = "completed";
      await task.save({ transaction });
      return task;
    });
  }

  async _getOwnedTask(userId, taskId, transaction = undefined) {
    const task = await PlanTask.findOne({
      where: { id: taskId },
      include: [{
        model: PlanDay,
        as: "planDay",
        required: true,
        include: [{ model: Plan, as: "plan", required: true, where: { user_id: userId } }],
      }],
      transaction,
    });
    if (!task) throw new AppError(404, "Task not found");
    return task;
  }

  async _getOwnedPlanDay(userId, planDayId, transaction) {
    const day = await PlanDay.findOne({
      where: { id: planDayId },
      include: [{ model: Plan, as: "plan", required: true, where: { user_id: userId } }],
      transaction,
    });
    if (!day) throw new AppError(404, "Plan day not found");
    return day;
  }

  _assertTaskMutable(planDay) {
    const plan = planDay.plan;
    if (!plan || !["draft", "active"].includes(plan.status) || planDay.status !== "pending") {
      throw new AppError(409, "Task cannot be changed because its plan day or plan is no longer editable");
    }
  }

  _getPagination(options) {
    const limit = Math.min(Math.max(Number(options.limit) || 20, 1), 100);
    const page = Math.max(Number(options.page) || 1, 1);
    return { limit, offset: (page - 1) * limit };
  }
}

module.exports = new TaskService();
