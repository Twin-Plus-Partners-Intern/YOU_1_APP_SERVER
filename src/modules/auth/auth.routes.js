const { Router } = require("express");

const authController = require("./auth.controller");
const { authenticate } = require("../../core/middlewares/auth.middleware");
const { validate } = require("../../core/middlewares/validate.middleware");
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyOtpSchema,
  resendOtpSchema,
} = require("./auth.validation");

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user account
 * @access  Public
 */
router.post("/register", validate(registerSchema), authController.register);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify registration OTP and activate account
 * @access  Public
 */
router.post("/verify-otp", validate(verifyOtpSchema), authController.verifyOtp);

/**
 * @route   POST /api/v1/auth/resend-otp
 * @desc    Resend registration OTP for inactive accounts
 * @access  Public
 */
router.post("/resend-otp", validate(resendOtpSchema), authController.resendOtp);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with email and password
 * @access  Public
 */
router.post("/login", validate(loginSchema), authController.login);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Rotate refresh token and get new access token
 * @access  Public
 */
router.post("/refresh-token", validate(refreshTokenSchema), authController.refreshToken);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Revoke current refresh token and clear cookie
 * @access  Public
 */
router.post("/logout", authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Revoke all refresh tokens for the authenticated user
 * @access  Private
 */
router.post("/logout-all", authenticate, authController.logoutAll);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
router.get("/me", authenticate, authController.getMe);

module.exports = router;
