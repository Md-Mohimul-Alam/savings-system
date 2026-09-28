const express = require("express");

const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");
const { auditMiddleware } = require("../middleware/auditMiddleware");

const router = express.Router();

router.use(protect);
router.use(auditMiddleware);

router.get("/", getMyNotifications);

router.patch(
  "/read-all",
  markAllAsRead
);

router.patch(
  "/:id/read",
  markAsRead
);

module.exports = router;