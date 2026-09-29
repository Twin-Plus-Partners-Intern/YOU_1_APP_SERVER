const taskService = require("./task.service");
const { successResponse } = require("../../core/utils/response");

class TaskController {
  async listTasks(req, res, next) {
    try {
      const result = await taskService.listTasks(req.user.id, req.query);
      return successResponse(res, 200, { success: true, tasks: result.rows, pagination: result.pagination });
    } catch (error) {
      return next(error);
    }
  }

  async getTask(req, res, next) {
    try {
      const task = await taskService.getTask(req.user.id, req.params.id);
      return successResponse(res, 200, { success: true, task });
    } catch (error) {
      return next(error);
    }
  }

  async createTask(req, res, next) {
    try {
      const task = await taskService.createTask(req.user.id, req.body);
      return successResponse(res, 201, {
        success: true,
        message: "Task created successfully",
        task,
      });
    } catch (error) {
      return next(error);
    }
  }

  async createTaskForDay(req, res, next) {
    try {
      const task = await taskService.createTask(req.user.id, {
        ...req.body,
        plan_day_id: req.params.id,
      });
      return successResponse(res, 201, {
        success: true,
        message: "Task created successfully",
        task,
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateTask(req, res, next) {
    try {
      const task = await taskService.updateTask(req.user.id, req.params.id, req.body);
      return successResponse(res, 200, {
        success: true,
        message: "Task updated successfully",
        task,
      });
    } catch (error) {
      return next(error);
    }
  }

  async deleteTask(req, res, next) {
    try {
      const task = await taskService.deleteTask(req.user.id, req.params.id);
      return successResponse(res, 200, {
        success: true,
        message: "Task deleted successfully",
        task,
      });
    } catch (error) {
      return next(error);
    }
  }

  async cancelTask(req, res, next) {
    try {
      const task = await taskService.cancelTask(req.user.id, req.params.id);
      return successResponse(res, 200, {
        success: true,
        message: "Task cancelled successfully",
        task,
      });
    } catch (error) {
      return next(error);
    }
  }

  async completeTask(req, res, next) {
    try {
      const task = await taskService.completeTask(req.user.id, req.params.id);
      return successResponse(res, 200, {
        success: true,
        message: "Task completed successfully",
        task,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new TaskController();
