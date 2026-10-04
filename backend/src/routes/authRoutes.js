const express = require("express");

const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const router = express.Router();

// --------------------------------------------------
// PUBLIC AUTH ROUTES
// --------------------------------------------------

router.post("/register", registerUser);
router.post("/login", loginUser);

// --------------------------------------------------
// PUBLIC FORGOT-PASSWORD ROUTES
// --------------------------------------------------

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// --------------------------------------------------
// CURRENT LOGGED-IN USER
// --------------------------------------------------

router.get("/me", protect, (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      adminCode:
        req.user.role === "admin"
          ? req.user.adminCode
          : undefined,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      status: req.user.status,
      isDemo: req.user.isDemo === true,
      dataScope: req.dataScope,
    },
  });
});

// --------------------------------------------------
// ADMIN TEST
// --------------------------------------------------

router.get(
  "/admin-test",
  protect,
  authorizeRoles("admin"),
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Admin access granted.",
      admin: {
        id: req.user._id,
        adminCode: req.user.adminCode,
        name: req.user.name,
        email: req.user.email,
        isDemo: req.user.isDemo === true,
        dataScope: req.dataScope,
      },
    });
  }
);

module.exports = router;