const express = require("express");

const {
  getAllMembers,
  getMemberById,
  getMyMemberProfile,
  updateMyMemberProfile,
  approveUser,
  getPendingUsers,
  updateMember,
  deleteMember,
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

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

router.use(protect);
router.use(auditMiddleware);

// --------------------------------------------------
// LOGGED-IN MEMBER
// --------------------------------------------------

// Get own profile
router.get(
  "/me/profile",
  getMyMemberProfile
);

// Update own personal information
// Editable:
// - phone
// - address
// - nidNumber
// - passportNumber
router.patch(
  "/me/profile",
  updateMyMemberProfile
);

// --------------------------------------------------
// ADMIN ONLY
// --------------------------------------------------

// Get pending users
router.get(
  "/pending",
  authorizeRoles("admin"),
  getPendingUsers
);

// Get all members
router.get(
  "/",
  authorizeRoles("admin"),
  getAllMembers
);

// Approve user and create member profile
router.post(
  "/approve/:userId",
  authorizeRoles("admin"),
  approveUser
);

// Get one member
router.get(
  "/:id",
  authorizeRoles("admin"),
  getMemberById
);

// Update one member
router.patch(
  "/:id",
  authorizeRoles("admin"),
  updateMember
);

// Delete one member
router.delete(
  "/:id",
  authorizeRoles("admin"),
  deleteMember
);

module.exports = router;