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

router.use(protect);
router.use(dataScopeMiddleware);
router.use(auditMiddleware);

// Own profile.
router.get(
  "/me/profile",
  getMyMemberProfile
);

router.patch(
  "/me/profile",
  updateMyMemberProfile
);

// All remaining routes require admin access.
router.use(authorizeRoles("admin"));

router.get(
  "/pending",
  getPendingUsers
);

// Optional body.memberId links registration to an existing profile.
router.post(
  "/approve/:userId",
  approveUser
);

// Create a financial member profile without requiring a login.
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