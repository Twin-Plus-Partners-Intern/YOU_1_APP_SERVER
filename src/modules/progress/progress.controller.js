const progressService = require("./progress.service");
const { successResponse } = require("../../core/utils/response");

class ProgressController {
  async getDay(req, res, next) {
    try {
      return successResponse(res, 200, {
        success: true,
        progress: await progressService.getDayProgress(req.user.id, req.query.date),
      });
    } catch (error) {
      return next(error);
    }
  }

  async getWeek(req, res, next) {
    try {
      return successResponse(res, 200, {
        success: true,
        progress: await progressService.getWeekProgress(req.user.id, {
          date: req.query.date,
          week_start: req.query.week_start,
        }),
      });
    } catch (error) {
      return next(error);
    }
  }

  async getPlan(req, res, next) {
    try {
      return successResponse(res, 200, {
        success: true,
        progress: await progressService.getPlanProgress(req.user.id, req.params.planId),
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ProgressController();
