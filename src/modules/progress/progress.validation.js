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

const dateQuerySchema = Joi.object({ date: dateSchema.required() });

const weekQuerySchema = Joi.object({
  date: dateSchema.required(),
  week_start: dateSchema.required(),
});

const planParamSchema = Joi.object({
  planId: Joi.string().guid().required(),
});

module.exports = {
  dateQuerySchema,
  weekQuerySchema,
  planParamSchema,
};
