const authService = require("./auth.service");
const env = require("../../config/env");
const { successResponse } = require("../../core/utils/response");

const COOKIE_NAME = "refreshToken";
const isProd = env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd && env.COOKIE_CROSS_SITE ? "none" : "strict",
  path: "/",
};

class AuthController {
  async register(req, res, next) {
    try {
      const meta = { ip: req.ip, userAgent: req.get("User-Agent") };
      const { user, requiresOtpVerification } = await authService.register(req.body, meta);

      return successResponse(res, 201, {
        success: true,
        message: "Registration successful. Please verify the OTP sent to your email.",
        user,
        requiresOtpVerification,
      });
    } catch (error) {
      return next(error);
    }
  }

  async verifyOtp(req, res, next) {
    try {
      const meta = { ip: req.ip, userAgent: req.get("User-Agent") };
      const { user, accessToken, refreshToken, refreshTokenExpiresAt } =
        await authService.verifyRegistrationOtp(req.body, meta);

      res.cookie(COOKIE_NAME, refreshToken, {
        ...cookieOptions,
        maxAge: refreshTokenExpiresAt - Date.now(),
      });

      return successResponse(res, 200, {
        success: true,
        message: "OTP verified successfully",
        user,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      return next(error);
    }
  }

  async resendOtp(req, res, next) {
    try {
      const result = await authService.resendRegistrationOtp(req.body);

      return successResponse(res, 200, {
        success: true,
        message: "OTP resent successfully",
        ...result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async login(req, res, next) {
    try {
      const meta = { ip: req.ip, userAgent: req.get("User-Agent") };
      const { user, accessToken, refreshToken, refreshTokenExpiresAt } =
        await authService.login(req.body, meta);

      res.cookie(COOKIE_NAME, refreshToken, {
        ...cookieOptions,
        maxAge: refreshTokenExpiresAt - Date.now(),
      });

      return successResponse(res, 200, {
        success: true,
        message: "Login successful",
        user,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      return next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const token = req.cookies?.[COOKIE_NAME] || req.body?.refreshToken;
      const { user, accessToken, refreshToken, refreshTokenExpiresAt } =
        await authService.refreshToken(token);

      res.cookie(COOKIE_NAME, refreshToken, {
        ...cookieOptions,
        maxAge: refreshTokenExpiresAt - Date.now(),
      });

      return successResponse(res, 200, {
        success: true,
        message: "Token refreshed",
        user,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      return next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const token = req.cookies?.[COOKIE_NAME] || req.body?.refreshToken;
      await authService.logout(token);

      res.clearCookie(COOKIE_NAME, cookieOptions);

      return successResponse(res, 200, {
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      return next(error);
    }
  }

  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll(req.user.id);
      res.clearCookie(COOKIE_NAME, cookieOptions);

      return successResponse(res, 200, {
        success: true,
        message: "Logged out from all devices",
      });
    } catch (error) {
      return next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user.id);

      return successResponse(res, 200, {
        success: true,
        message: "User profile retrieved",
        user,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuthController();
