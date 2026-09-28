const express = require("express");

const {
  addContribution,
  getAllContributions,
  getMyContributions,
  getContributionById,
  updateContribution,
} = require("../controllers/contributionController");

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

// Member's own contributions
router.get(
  "/my",
  getMyContributions
);

// Admin only
router.get(
  "/",
  authorizeRoles("admin"),
  getAllContributions
);

// Admin only
router.get(
  "/:id",
  authorizeRoles("admin"),
  getContributionById
);

// Admin only
router.post(
  "/",
  authorizeRoles("admin"),
  addContribution
);

// Admin only
router.patch(
  "/:id",
  authorizeRoles("admin"),
  updateContribution
);

module.exports = router;