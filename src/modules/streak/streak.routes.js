const { Router } = require("express");

const { authenticate } = require("../../core/middlewares/auth.middleware");
const { validate } = require("../../core/middlewares/validate.middleware");
const streakController = require("./streak.controller");
const { checkInSchema, historyQuerySchema } = require("./streak.validation");

const router = Router();

/**
 * @route   GET /api/v1/streak/me
 * @desc    Get current streak status and recent entries
 * @access  Private
 */
router.get("/me", authenticate, validate(historyQuerySchema, "query"), streakController.getMe);

/**
 * @route   POST /api/v1/streak/check-in
 * @desc    Complete today's streak
 * @access  Private
 */
router.post("/check-in", authenticate, validate(checkInSchema), streakController.checkIn);

/**
 * @route   GET /api/v1/streak/history
 * @desc    Get streak check-in history
 * @access  Private
 */
router.get("/history", authenticate, validate(historyQuerySchema, "query"), streakController.getHistory);

module.exports = router;
