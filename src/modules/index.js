const { Router } = require("express");



const router = Router();

router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "You-il API is ready",
  });
});



module.exports = router;
