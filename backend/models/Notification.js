const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["join", "submission", "approved", "rejected", "completed", "added_to_community"],
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        challenge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Challenge",
            default: null,
        },
        submission: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Submission",
            default: null,
        },
        community: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Community",
            default: null,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
