const { Router } = require("express");
const { authenticate } = require("../../core/middlewares/auth.middleware");
const { validate } = require("../../core/middlewares/validate.middleware");
const progressController = require("./progress.controller");
const validation = require("./progress.validation");

const router = Router();

router.use(authenticate);

router.get("/day", validate(validation.dateQuerySchema, "query"), progressController.getDay);
router.get("/week", validate(validation.weekQuerySchema, "query"), progressController.getWeek);
router.get("/plan/:planId", validate(validation.planParamSchema, "params"), progressController.getPlan);

module.exports = router;
