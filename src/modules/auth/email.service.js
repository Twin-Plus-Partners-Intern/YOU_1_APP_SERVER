const env = require("../../config/env");

class EmailService {
  async sendOtpEmail({ email, name, otp }) {
    if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASSWORD) {
      throw new Error("EMAIL configuration is not complete");
    }

    const transporter = require("../../config/mailer");

    await transporter.sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_EMAIL}>`,
      to: [email],
      subject: "You-il OTP verification",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2>Hello ${name},</h2>
          <p>Use the OTP below to complete your You-il registration:</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">${otp}</p>
          <p>This code expires in ${env.OTP_EXPIRES_IN_MINUTES} minutes.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  }
}

module.exports = new EmailService();
