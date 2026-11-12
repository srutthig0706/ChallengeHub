const Notification = require("../models/Notification");

/**
 * Create a notification document.
 * Returns the created document, or null if creation fails.
 * Never throws — callers must not be affected by notification failures.
 *
 * @param {Object} data
 * @param {ObjectId|string} data.recipient  - required
 * @param {string}          data.type       - required, must match enum
 * @param {string}          data.message    - required
 * @param {ObjectId|string} [data.actor]
 * @param {ObjectId|string} [data.challenge]
 * @param {ObjectId|string} [data.submission]
 * @param {ObjectId|string} [data.community]
 */
const createNotification = async (data) => {
    try {
        return await Notification.create(data);
    } catch (error) {
        console.error("Failed to create notification:", error);
        return null;
    }
};

module.exports = { createNotification };
