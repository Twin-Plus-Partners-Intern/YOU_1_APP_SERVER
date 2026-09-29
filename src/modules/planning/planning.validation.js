const Joi = require("joi");

const dateSchema = Joi.string()
  .trim()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      return helpers.error("date.invalid");
    }
    return value;
  })
  .messages({
    "string.pattern.base": "Date must use YYYY-MM-DD format",
    "date.invalid": "Date must be a valid calendar date",
  });

const availableDaySchema = Joi.alternatives().try(
  Joi.number().integer().min(0).max(6),
  Joi.string().trim().lowercase().valid(
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  )
);

const createPlanSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  goal: Joi.string().trim().min(1).required(),
  start_date: dateSchema.required(),
  end_date: dateSchema.required(),
  available_days: Joi.array().items(availableDaySchema).min(1).unique().default([1, 2, 3, 4, 5]),
}).custom((value, helpers) => {
  if (value.end_date < value.start_date) {
    return helpers.error("date.range");
  }
  return value;
}).messages({ "date.range": "end_date must be on or after start_date" });

const updatePlanSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255),
  goal: Joi.string().trim().min(1),
  start_date: dateSchema,
  end_date: dateSchema,
  available_days: Joi.array().items(availableDaySchema).min(1).unique(),
}).min(1).custom((value, helpers) => {
  if (value.start_date && value.end_date && value.end_date < value.start_date) {
    return helpers.error("date.range");
  }
  return value;
}).messages({ "date.range": "end_date must be on or after start_date" });

const planDayUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255),
  scheduled_date: dateSchema,
}).min(1);

const createPlanDaySchema = Joi.object({
  scheduled_date: dateSchema.required(),
  title: Joi.string().trim().min(1).max(255).required(),
});

const rescheduleSchema = Joi.object({
  scheduled_date: dateSchema,
  target_plan_day_id: Joi.string().guid(),
}).xor("scheduled_date", "target_plan_day_id");

const cancelSchema = Joi.object({
  fill_gap: Joi.boolean().default(false),
});

const idParamSchema = Joi.object({
  id: Joi.string().guid().required(),
});

const planIdParamSchema = Joi.object({
  planId: Joi.string().guid().required(),
});

const listQuerySchema = Joi.object({
  status: Joi.string().valid("draft", "active", "completed", "cancelled"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const planDayListQuerySchema = Joi.object({
  status: Joi.string().valid("pending", "completed", "cancelled"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  createPlanSchema,
  updatePlanSchema,
  planDayUpdateSchema,
  createPlanDaySchema,
  rescheduleSchema,
  cancelSchema,
  idParamSchema,
  planIdParamSchema,
  listQuerySchema,
  planDayListQuerySchema,
};
