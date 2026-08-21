const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const env = require("../../config/env");
const { sequelize, User, Session } = require("../../models");
const { AppError } = require("../../core/middlewares/error.middleware");
const otpService = require("./otp.service");
const emailService = require("./email.service");

const REFRESH_TOKEN_EXPIRY_MS =
  env.REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;

class AuthService {
  async register({ name, email, password }, meta = {}) {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser?.status === "active") {
      throw new AppError(409, "Email already exists");
    }

    if (existingUser?.status === "inactive") {
      throw new AppError(403, "This account is inactive and cannot be registered again");
    }

    if (existingUser?.status === "pending_verify") {
      throw new AppError(
        409,
        "This email is already registered and waiting for OTP verification"
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { user, otp } = await sequelize.transaction(async (transaction) => {
      const createdUser = await User.create(
        {
          name: trimmedName,
          email: normalizedEmail,
          password: hashedPassword,
          role: "user",
          status: "pending_verify",
        },
        { transaction }
      );

      const { otp: createdOtp } = await otpService.createOrReplaceOtp({
        userId: createdUser.id,
        email: normalizedEmail,
        transaction,
      });

      return {
        user: createdUser,
        otp: createdOtp,
      };
    });

    await emailService.sendOtpEmail({
      email: normalizedEmail,
      name: trimmedName,
      otp,
    });

    return {
      user: this._sanitizeUser(user),
      requiresOtpVerification: true,
    };
  }

  async verifyRegistrationOtp({ email, otp }, meta = {}) {
    const normalizedEmail = email.trim().toLowerCase();

    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.scope("withPassword").findOne({
        where: { email: normalizedEmail },
        transaction,
      });

      if (!user) {
        throw new AppError(404, "User not found");
      }

      if (user.status === "active") {
        throw new AppError(409, "Account has already been verified");
      }

      if (user.status === "inactive") {
        throw new AppError(403, "This account is inactive and cannot be verified");
      }

      if (user.status !== "pending_verify") {
        throw new AppError(400, "Account is not in a verifiable state");
      }

      await otpService.verifyOtp({
        userId: user.id,
        email: normalizedEmail,
        otp,
        transaction,
      });

      user.status = "active";
      await user.save({ transaction });
      await otpService.clearPendingOtp(user.id, transaction);

      const accessToken = this._generateAccessToken(user);
      const { refreshToken, expiresAt } = this._generateRefreshToken();

      await this._storeSession(user.id, refreshToken, expiresAt, transaction);

      return {
        user,
        accessToken,
        refreshToken,
        refreshTokenExpiresAt: expiresAt.getTime(),
      };
    });

    return {
      user: this._sanitizeUser(result.user),
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt,
    };
  }

  async resendRegistrationOtp({ email }) {
    const normalizedEmail = email.trim().toLowerCase();

    const { user, otp } = await sequelize.transaction(async (transaction) => {
      const existingUser = await User.findOne({
        where: { email: normalizedEmail },
        transaction,
      });

      if (!existingUser) {
        throw new AppError(404, "User not found");
      }

      if (existingUser.status === "active") {
        throw new AppError(409, "Account has already been verified");
      }

      if (existingUser.status === "inactive") {
        throw new AppError(403, "This account is inactive and cannot receive OTP");
      }

      if (existingUser.status !== "pending_verify") {
        throw new AppError(400, "Account is not waiting for verification");
      }

      const { otp: resentOtp } = await otpService.resendOtp({
        userId: existingUser.id,
        email: normalizedEmail,
        transaction,
      });

      return {
        user: existingUser,
        otp: resentOtp,
      };
    });

    await emailService.sendOtpEmail({
      email: normalizedEmail,
      name: user.name,
      otp,
    });

    return {
      email: normalizedEmail,
      cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  async login({ email, password }, meta = {}) {
    const user = await User.scope("withPassword").findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    if (user.status === "pending_verify") {
      throw new AppError(403, "Account is pending OTP verification");
    }

    if (user.status === "inactive") {
      throw new AppError(403, "Account is inactive");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError(401, "Invalid email or password");
    }

    const accessToken = this._generateAccessToken(user);
    const { refreshToken, expiresAt } = this._generateRefreshToken();

    await this._storeSession(user.id, refreshToken, expiresAt);

    return {
      user: this._sanitizeUser(user),
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt.getTime(),
    };
  }

  async refreshToken(token) {
    if (!token) {
      throw new AppError(401, "Refresh token is required");
    }

    const session = await Session.findOne({
      where: { refresh_token: this._hashToken(token) },
      include: [{ model: User.scope("withPassword"), as: "user" }],
    });

    if (!session) {
      throw new AppError(401, "Invalid refresh token");
    }

    if (new Date(session.expires_at) < new Date()) {
      await session.destroy();
      throw new AppError(401, "Refresh token has expired");
    }

    const user = session.user;

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (user.status === "pending_verify") {
      throw new AppError(403, "Account is pending OTP verification");
    }

    if (user.status === "inactive") {
      throw new AppError(403, "Account is inactive");
    }

    const accessToken = this._generateAccessToken(user);
    const { refreshToken, expiresAt } = this._generateRefreshToken();

    await session.destroy();
    await this._storeSession(user.id, refreshToken, expiresAt);

    return {
      user: this._sanitizeUser(user),
      accessToken,
      refreshToken,
      refreshTokenExpiresAt: expiresAt.getTime(),
    };
  }

  async logout(token) {
    if (!token) {
      return;
    }

    await Session.destroy({
      where: { refresh_token: this._hashToken(token) },
    });
  }

  async logoutAll(userId) {
    await Session.destroy({
      where: { user_id: userId },
    });
  }

  async getMe(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    if (user.status === "pending_verify") {
      throw new AppError(403, "Account is pending OTP verification");
    }

    if (user.status === "inactive") {
      throw new AppError(403, "Account is inactive");
    }

    return this._sanitizeUser(user);
  }

  _generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
    );
  }

  _generateRefreshToken() {
    return {
      refreshToken: crypto.randomBytes(40).toString("hex"),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    };
  }

  _hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async _storeSession(userId, rawToken, expiresAt, transaction) {
    await Session.create(
      {
        user_id: userId,
        refresh_token: this._hashToken(rawToken),
        expires_at: expiresAt,
      },
      transaction ? { transaction } : undefined
    );
  }

  _sanitizeUser(user) {
    const values = typeof user.toJSON === "function" ? user.toJSON() : { ...user };

    delete values.password;
    return values;
  }
}

module.exports = new AuthService();
