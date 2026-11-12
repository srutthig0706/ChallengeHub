const express = require("express");
const router = express.Router();
const {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getNotifications);
router.patch("/read-all", authMiddleware, markAllNotificationsRead);
router.patch("/:id/read", authMiddleware, markNotificationRead);
router.delete("/:id", authMiddleware, deleteNotification);

module.exports = router;
