const Joi = require("joi");

const idParamSchema = Joi.object({
  id: Joi.string().guid().required(),
});

const taskCreateSchema = Joi.object({
  plan_day_id: Joi.string().guid().required(),
  title: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().allow("", null),
});

const taskForDaySchema = Joi.object({
  title: Joi.string().trim().min(1).max(255).required(),
  description: Joi.string().trim().allow("", null),
});

const taskUpdateSchema = Joi.object({
  title: Joi.string().trim().min(1).max(255),
  description: Joi.string().trim().allow("", null),
  plan_day_id: Joi.string().guid(),
}).min(1);

const listQuerySchema = Joi.object({
  plan_day_id: Joi.string().guid(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

module.exports = {
  idParamSchema,
  taskCreateSchema,
  taskForDaySchema,
  taskUpdateSchema,
  listQuerySchema,
};
