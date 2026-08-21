const Joi = require("joi");

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters",
    "string.max": "Name must not exceed 100 characters",
    "any.required": "Name is required",
  }),
  email: Joi.string().trim().lowercase().email({ tlds: false }).required().messages({
    "string.email": "Must be a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string()
    .min(8)
    .max(72)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password must not exceed 72 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      "any.required": "Password is required",
    }),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: false }).required().messages({
    "string.email": "Must be a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(),
});

const verifyOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: false }).required().messages({
    "string.email": "Must be a valid email address",
    "any.required": "Email is required",
  }),
  otp: Joi.string().trim().pattern(/^\d{6}$/).required().messages({
    "string.pattern.base": "OTP must be a 6-digit code",
    "any.required": "OTP is required",
  }),
});

const resendOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().email({ tlds: false }).required().messages({
    "string.email": "Must be a valid email address",
    "any.required": "Email is required",
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyOtpSchema,
  resendOtpSchema,
};
