const { Router } = require("express");
const { authenticate } = require("../../core/middlewares/auth.middleware");
const { validate } = require("../../core/middlewares/validate.middleware");
const taskController = require("./task.controller");
const validation = require("./task.validation");

const router = Router();

router.use(authenticate);

router.get("/tasks", validate(validation.listQuerySchema, "query"), taskController.listTasks);
router.get("/tasks/:id", validate(validation.idParamSchema, "params"), taskController.getTask);
router.post("/tasks", validate(validation.taskCreateSchema), taskController.createTask);
router.post("/plan-days/:id/tasks", validate(validation.idParamSchema, "params"), validate(validation.taskForDaySchema), taskController.createTaskForDay);
router.patch("/tasks/:id", validate(validation.idParamSchema, "params"), validate(validation.taskUpdateSchema), taskController.updateTask);
router.delete("/tasks/:id", validate(validation.idParamSchema, "params"), taskController.deleteTask);
router.post("/tasks/:id/cancel", validate(validation.idParamSchema, "params"), taskController.cancelTask);
router.post("/tasks/:id/complete", validate(validation.idParamSchema, "params"), taskController.completeTask);

module.exports = router;
