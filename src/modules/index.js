const { Router } = require("express");

const authRoutes = require("./auth/auth.routes");
const streakRoutes = require("./streak/streak.routes");

const router = Router();

router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "You-il API is ready",
  });
});

router.use("/auth", authRoutes);
router.use("/streak", streakRoutes);

module.exports = router;
