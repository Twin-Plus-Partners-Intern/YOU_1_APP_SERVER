const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const env = require("../../config/env");
const { OtpVerification } = require("../../models");
const { AppError } = require("../../core/middlewares/error.middleware");

class OtpService {
  generateOtp() {
    return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  }

  async createOrReplaceOtp({ userId, email, transaction } = {}) {
    const normalizedEmail = email.trim().toLowerCase();
    const otp = this.generateOtp();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.OTP_EXPIRES_IN_MINUTES * 60 * 1000);
    const otpHash = await bcrypt.hash(otp, 10);

    const existingRecord = await OtpVerification.findOne({
      where: {
        user_id: userId,
        verified_at: null,
      },
      transaction,
    });

    if (existingRecord) {
      existingRecord.email = normalizedEmail;
      existingRecord.otp_hash = otpHash;
      existingRecord.expires_at = expiresAt;
      existingRecord.attempts = 0;
      existingRecord.last_sent_at = now;
      existingRecord.verified_at = null;
      await existingRecord.save({ transaction });

      return { otp, record: existingRecord };
    }

    const record = await OtpVerification.create({
      user_id: userId,
      email: normalizedEmail,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempts: 0,
      last_sent_at: now,
    }, { transaction });

    return { otp, record };
  }

  async resendOtp({ userId, email, transaction } = {}) {
    const existingRecord = await OtpVerification.findOne({
      where: {
        user_id: userId,
        verified_at: null,
      },
      transaction,
    });

    if (existingRecord) {
      const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
      const nextSendAt = new Date(existingRecord.last_sent_at).getTime() + cooldownMs;

      if (Date.now() < nextSendAt) {
        throw new AppError(
          429,
          "OTP was sent recently. Please wait before requesting a new code.",
          {
            retryAfterSeconds: Math.max(
              1,
              Math.ceil((nextSendAt - Date.now()) / 1000)
            ),
          }
        );
      }
    }

    return this.createOrReplaceOtp({ userId, email, transaction });
  }

  async verifyOtp({ userId, email, otp, transaction } = {}) {
    const normalizedEmail = email.trim().toLowerCase();
    const record = await OtpVerification.findOne({
      where: {
        user_id: userId,
        email: normalizedEmail,
        verified_at: null,
      },
      transaction,
    });

    if (!record) {
      throw new AppError(400, "OTP is invalid or no verification request was found");
    }

    if (new Date(record.expires_at).getTime() < Date.now()) {
      throw new AppError(400, "OTP has expired");
    }

    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError(429, "OTP verification attempts exceeded");
    }

    const isValid = await bcrypt.compare(otp, record.otp_hash);

    if (!isValid) {
      record.attempts += 1;
      await record.save({ transaction });
      throw new AppError(400, "OTP is invalid");
    }

    record.verified_at = new Date();
    record.attempts = 0;
    await record.save({ transaction });

    return record;
  }

  async clearPendingOtp(userId, transaction) {
    await OtpVerification.destroy({
      where: {
        user_id: userId,
      },
      transaction,
    });
  }
}

module.exports = new OtpService();
