const streakService = require("./streak.service");
const { successResponse } = require("../../core/utils/response");

class StreakController {
  async getMe(req, res, next) {
    try {
      const result = await streakService.getMyStreak(req.user.id, {
        limit: req.query.limit,
      });

      return successResponse(res, 200, {
        success: true,
        message: "Streak retrieved successfully",
        ...result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async checkIn(req, res, next) {
    try {
      const result = await streakService.checkIn(req.user.id, req.body);

      return successResponse(res, 200, {
        success: true,
        message: "Streak completed for today",
        ...result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getHistory(req, res, next) {
    try {
      const result = await streakService.getHistory(req.user.id, {
        limit: req.query.limit,
      });

      return successResponse(res, 200, {
        success: true,
        message: "Streak history retrieved successfully",
        ...result,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new StreakController();
