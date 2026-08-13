"use strict";

const nodemailer = require("nodemailer");
const env = require("./env");

if (!env.EMAIL_HOST) {
  throw new Error("EMAIL_HOST chưa được cấu hình trong file .env");
}

if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) {
  throw new Error("EMAIL_USER hoặc EMAIL_PASSWORD chưa được cấu hình trong file .env");
}

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_SECURE,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASSWORD,
  },
});

module.exports = transporter;
