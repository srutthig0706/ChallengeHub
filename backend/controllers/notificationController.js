const mongoose = require("mongoose");
const Notification = require("../models/Notification");

// GET /api/notifications
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .populate("actor", "name username")
            .populate("challenge", "title")
            .populate("submission", "status")
            .populate("community", "name")
            .sort({ createdAt: -1 })
            .limit(20);

        res.status(200).json({ notifications });
    } catch (error) {
        console.error("getNotifications error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// PATCH /api/notifications/:id/read
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: req.user._id },
            { read: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ notification });
    } catch (error) {
        console.error("markNotificationRead error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// PATCH /api/notifications/read-all
const markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { read: true }
        );

        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("markAllNotificationsRead error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid notification ID" });
        }

        const notification = await Notification.findOneAndDelete({
            _id: id,
            recipient: req.user._id,
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification deleted" });
    } catch (error) {
        console.error("deleteNotification error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
};
