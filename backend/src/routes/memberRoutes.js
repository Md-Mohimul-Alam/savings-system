const express = require("express");

const {
  createMember,
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
  dataScopeMiddleware,
} = require("../middleware/dataScopeMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  auditMiddleware,
} = require("../middleware/auditMiddleware");

const router = express.Router();

// Authentication must run before data-scope resolution.
router.use(protect);
router.use(dataScopeMiddleware);
router.use(auditMiddleware);

// --------------------------------------------------
// OWN PROFILE
// --------------------------------------------------

router.get(
  "/me/profile",
  getMyMemberProfile
);

router.patch(
  "/me/profile",
  updateMyMemberProfile
);

// --------------------------------------------------
// ADMIN ROUTES
// --------------------------------------------------

router.use(authorizeRoles("admin"));

// Keep specific paths before /:id.
router.get(
  "/pending",
  getPendingUsers
);

// Approve registration.
// Supply body.memberId to link an existing profile.
router.post(
  "/approve/:userId",
  approveUser
);

// List members or create a profile without a login.
router
  .route("/")
  .get(getAllMembers)
  .post(createMember);

router
  .route("/:id")
  .get(getMemberById)
  .patch(updateMember)
  .delete(deleteMember);

module.exports = router;