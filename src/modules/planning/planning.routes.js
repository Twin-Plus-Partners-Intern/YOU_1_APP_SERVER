const { Router } = require("express");
const express = require("express");
const { authenticate } = require("../../core/middlewares/auth.middleware");
const { validate } = require("../../core/middlewares/validate.middleware");
const controller = require("./planning.controller");
const validation = require("./planning.validation");

const router = Router();
router.use(authenticate);

router.post("/plans", validate(validation.createPlanSchema), controller.createPlan);
router.get("/plans", validate(validation.listQuerySchema, "query"), controller.listPlans);
router.get("/plans/:id", validate(validation.idParamSchema, "params"), controller.getPlan);
router.get("/plans/:planId/days", validate(validation.planIdParamSchema, "params"), validate(validation.planDayListQuerySchema, "query"), controller.listPlanDays);
router.patch("/plans/:id", validate(validation.idParamSchema, "params"), validate(validation.updatePlanSchema), controller.updatePlan);
router.post("/plans/:id/activate", validate(validation.idParamSchema, "params"), controller.activatePlan);
router.post("/plans/:id/complete", validate(validation.idParamSchema, "params"), controller.completePlan);
router.post("/plans/:id/cancel", validate(validation.idParamSchema, "params"), controller.cancelPlan);
router.delete("/plans/:id", validate(validation.idParamSchema, "params"), controller.deletePlan);

router.post("/plans/:planId/days", validate(validation.planIdParamSchema, "params"), validate(validation.createPlanDaySchema), controller.createPlanDay);
router.get("/plan-days/:id", validate(validation.idParamSchema, "params"), controller.getPlanDay);
router.patch("/plan-days/:id", validate(validation.idParamSchema, "params"), validate(validation.planDayUpdateSchema), controller.updatePlanDay);
router.post("/plan-days/:id/complete", validate(validation.idParamSchema, "params"), controller.completePlanDay);
router.delete("/plan-days/:id", validate(validation.idParamSchema, "params"), controller.deletePlanDay);
router.post("/plan-days/:id/reschedule", validate(validation.idParamSchema, "params"), validate(validation.rescheduleSchema), controller.reschedulePlanDay);
router.post(
  "/plan-days/:id/cancel",
  express.json({ type: ["application/json", "text/plain"] }),
  validate(validation.idParamSchema, "params"),
  validate(validation.cancelSchema),
  controller.cancelPlanDay
);

module.exports = router;
