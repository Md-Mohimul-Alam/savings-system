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

// Keep /my before /:id.
router.get(
  "/my",
  getMyContributions
);

// All remaining routes require admin access.
router.use(authorizeRoles("admin"));

router
  .route("/")
  .get(getAllContributions)
  .post(addContribution);

router
  .route("/:id")
  .get(getContributionById)
  .patch(updateContribution);

module.exports = router;