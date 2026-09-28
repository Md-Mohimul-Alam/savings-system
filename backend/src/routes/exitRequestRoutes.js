const express = require("express");

const {
  createExitRequest,
  getAllExitRequests,
  getMyExitRequest,
  approveExitRequest,
  rejectExitRequest,
  markExitAsPaid,
} = require("../controllers/exitRequestController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { auditMiddleware } = require("../middleware/auditMiddleware");

const router = express.Router();

router.use(protect);
router.use(auditMiddleware);

router.post("/", createExitRequest);

router.get("/my", getMyExitRequest);

router.get(
  "/",
  authorizeRoles("admin"),
  getAllExitRequests
);

router.patch(
  "/:id/approve",
  authorizeRoles("admin"),
  approveExitRequest
);

router.patch(
  "/:id/reject",
  authorizeRoles("admin"),
  rejectExitRequest
);

router.patch(
  "/:id/pay",
  authorizeRoles("admin"),
  markExitAsPaid
);

module.exports = router;