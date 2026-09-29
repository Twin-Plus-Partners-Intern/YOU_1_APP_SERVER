const planningService = require("./planning.service");
const { successResponse } = require("../../core/utils/response");

class PlanningController {
  async createPlan(req, res, next) {
    try { return successResponse(res, 201, { success: true, message: "Plan created successfully", plan: await planningService.createPlan(req.user.id, req.body) }); } catch (error) { return next(error); }
  }
  async listPlans(req, res, next) {
    try {
      const result = await planningService.listPlans(req.user.id, req.query);
      return successResponse(res, 200, { success: true, plans: result.rows, pagination: result.pagination });
    } catch (error) { return next(error); }
  }
  async getPlan(req, res, next) {
    try { return successResponse(res, 200, { success: true, plan: await planningService.getPlan(req.user.id, req.params.id) }); } catch (error) { return next(error); }
  }
  async listPlanDays(req, res, next) {
    try { return successResponse(res, 200, { success: true, ...await planningService.listPlanDays(req.user.id, req.params.planId, req.query) }); } catch (error) { return next(error); }
  }
  async updatePlan(req, res, next) {
    try { return successResponse(res, 200, { success: true, message: "Plan updated successfully", plan: await planningService.updatePlan(req.user.id, req.params.id, req.body) }); } catch (error) { return next(error); }
  }
  async activatePlan(req, res, next) {
    try { return successResponse(res, 200, { success: true, message: "Plan activated successfully", plan: await planningService.transitionPlan(req.user.id, req.params.id, "active") }); } catch (error) { return next(error); }
  }
  async completePlan(req, res, next) {
    try { return successResponse(res, 200, { success: true, message: "Plan completed successfully", plan: await planningService.transitionPlan(req.user.id, req.params.id, "completed") }); } catch (error) { return next(error); }
  }
  async cancelPlan(req, res, next) {
    try { return successResponse(res, 200, { success: true, message: "Plan cancelled successfully", plan: await planningService.transitionPlan(req.user.id, req.params.id, "cancelled") }); } catch (error) { return next(error); }
  }
  async deletePlan(req, res, next) {
    try { return successResponse(res, 200, { success: true, message: "Plan deleted successfully", plan: await planningService.deletePlan(req.user.id, req.params.id) }); } catch (error) { return next(error); }
  }
  async createPlanDay(req, res, next) {
    try { return successResponse(res, 201, { success: true, day: await planningService.createPlanDay(req.user.id, req.params.planId, req.body) }); } catch (error) { return next(error); }
  }
  async updatePlanDay(req, res, next) {
    try { return successResponse(res, 200, { success: true, day: await planningService.updatePlanDay(req.user.id, req.params.id, req.body) }); } catch (error) { return next(error); }
  }
  async completePlanDay(req, res, next) {
    try { return successResponse(res, 200, { success: true, message: "Plan day completed successfully", day: await planningService.completePlanDay(req.user.id, req.params.id) }); } catch (error) { return next(error); }
  }
  async getPlanDay(req, res, next) {
    try { return successResponse(res, 200, { success: true, day: await planningService.getPlanDay(req.user.id, req.params.id) }); } catch (error) { return next(error); }
  }
  async deletePlanDay(req, res, next) {
    try { return successResponse(res, 200, { success: true, day: await planningService.deletePlanDay(req.user.id, req.params.id) }); } catch (error) { return next(error); }
  }
  async reschedulePlanDay(req, res, next) {
    try { return successResponse(res, 200, { success: true, result: await planningService.reschedulePlanDay(req.user.id, req.params.id, req.body) }); } catch (error) { return next(error); }
  }
  async cancelPlanDay(req, res, next) {
    try {
      const fillGap = req.body?.fill_gap ?? false;
      return successResponse(res, 200, {
        success: true,
        day: await planningService.cancelPlanDay(req.user.id, req.params.id, fillGap),
      });
    } catch (error) { return next(error); }
  }
}

module.exports = new PlanningController();
