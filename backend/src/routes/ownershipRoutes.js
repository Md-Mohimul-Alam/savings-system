const express = require("express");

const {
  getOwnershipSummary,
  getMemberOwnership,
  getMyOwnership,
  syncOwnershipPercentages,
} = require("../controllers/ownershipController");

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

// Member's own ownership
router.get(
  "/me",
  getMyOwnership
);

// Admin only
router.get(
  "/",
  authorizeRoles("admin"),
  getOwnershipSummary
);

// Admin only
router.get(
  "/member/:memberId",
  authorizeRoles("admin"),
  getMemberOwnership
);

// Admin only
router.post(
  "/sync",
  authorizeRoles("admin"),
  syncOwnershipPercentages
);

module.exports = router;