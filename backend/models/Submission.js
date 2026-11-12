const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
    {
        challenge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Challenge",
            required: true,
            index: true,
        },
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        textProof: {
            type: String,
            default: "",
            trim: true,
            maxlength: [3000, "Text proof cannot exceed 3000 characters"],
        },
        fileProof: {
            type: String,   // relative path: uploads/<filename>
            default: null,
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        creatorFeedback: {
            type: String,
            default: "",
            trim: true,
            maxlength: [1000, "Feedback cannot exceed 1000 characters"],
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// One active (pending) submission per participant per task
// Allows resubmission after rejection by not including status in the index
submissionSchema.index({ participant: 1, task: 1, status: 1 });

module.exports = mongoose.model("Submission", submissionSchema);
