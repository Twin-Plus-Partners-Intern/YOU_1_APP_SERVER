require("dotenv").config({ quiet: true });

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 3000),

  JWT_SECRET: process.env.JWT_SECRET || "smartscheduling-access-secret-change-me",
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "45m",
  REFRESH_TOKEN_EXPIRES_IN_DAYS: Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || 7),
  COOKIE_CROSS_SITE:
    String(process.env.COOKIE_CROSS_SITE || "false").toLowerCase() === "true",

  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
  OTP_EXPIRES_IN_MINUTES: Number(process.env.OTP_EXPIRES_IN_MINUTES || 5),
  OTP_MAX_ATTEMPTS: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  OTP_RESEND_COOLDOWN_SECONDS: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60),

};
