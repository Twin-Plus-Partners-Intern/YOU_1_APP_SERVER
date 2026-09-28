const Joi = require("joi");

const timezoneSchema = Joi.string()
  .trim()
  .max(64)
  .custom((value, helpers) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return value;
    } catch (error) {
      return helpers.error("any.invalid");
    }
  })
  .messages({
    "string.max": "Timezone must not exceed 64 characters",
    "any.invalid": "Timezone must be a valid IANA time zone",
  });

const checkInSchema = Joi.object({
  timezone: timezoneSchema.optional(),
});

const historyQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    "number.base": "Limit must be a number",
    "number.integer": "Limit must be an integer",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit must not exceed 100",
  }),
});

module.exports = {
  checkInSchema,
  historyQuerySchema,
};
