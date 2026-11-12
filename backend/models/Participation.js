const mongoose = require("mongoose");

const participationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        challenge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Challenge",
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "completed", "left"],
            default: "active",
        },
        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        completedTasks: [{ type: mongoose.Schema.Types.ObjectId }],
        joinedAt: {
            type: Date,
            default: Date.now,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Prevent duplicate active participation: one user cannot join the same challenge twice
participationSchema.index({ user: 1, challenge: 1 }, { unique: true });

module.exports = mongoose.model("Participation", participationSchema);
