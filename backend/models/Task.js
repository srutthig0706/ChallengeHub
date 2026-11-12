const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        challenge: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Challenge",
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, "Task title is required"],
            trim: true,
            maxlength: [200, "Title cannot exceed 200 characters"],
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: [1000, "Description cannot exceed 1000 characters"],
        },
        order: {
            type: Number,
            default: 0,
        },
        milestone: {
            type: String,
            default: "",
            trim: true,
            maxlength: [100, "Milestone cannot exceed 100 characters"],
        },
        deadline: {
            type: Date,
            default: null,
        },
        completionCriteria: {
            type: String,
            default: "",
            trim: true,
            maxlength: [500, "Completion criteria cannot exceed 500 characters"],
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
