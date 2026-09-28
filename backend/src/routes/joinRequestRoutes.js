const express = require("express");

const {
  createJoinRequest,
  getMyJoinRequest,
  getAllJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
} = require("../controllers/joinRequestController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { auditMiddleware } = require("../middleware/auditMiddleware");

const router = express.Router();

router.use(protect);
router.use(auditMiddleware);

router.post("/", createJoinRequest);

router.get("/my", getMyJoinRequest);

router.get(
  "/",
  authorizeRoles("admin"),
  getAllJoinRequests
);

router.patch(
  "/:id/approve",
  authorizeRoles("admin"),
  approveJoinRequest
);

router.patch(
  "/:id/reject",
  authorizeRoles("admin"),
  rejectJoinRequest
);

module.exports = router;