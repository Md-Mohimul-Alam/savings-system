const express = require("express");

const {
  getAllMembers,
  getMemberById,
  getMyMemberProfile,
  approveUser,
  getPendingUsers,
  updateMember,
} = require("../controllers/memberController");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  auditMiddleware,
} = require("../middleware/auditMiddleware");

const router = express.Router();

router.use(protect);
router.use(auditMiddleware);

// Logged-in member
router.get(
  "/me/profile",
  getMyMemberProfile
);

// Admin only
router.get(
  "/pending",
  authorizeRoles("admin"),
  getPendingUsers
);

// Admin only
router.get(
  "/",
  authorizeRoles("admin"),
  getAllMembers
);

// Admin only
router.get(
  "/:id",
  authorizeRoles("admin"),
  getMemberById
);

// Admin only
router.post(
  "/approve/:userId",
  authorizeRoles("admin"),
  approveUser
);

// Admin only
router.patch(
  "/:id",
  authorizeRoles("admin"),
  updateMember
);

module.exports = router;