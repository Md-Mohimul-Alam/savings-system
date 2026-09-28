const express = require("express");

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/me", protect, (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      status: req.user.status,
    },
  });
});

router.get(
  "/admin-test",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Admin access granted.",
    });
  }
);

module.exports = router;