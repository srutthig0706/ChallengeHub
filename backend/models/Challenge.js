const mongoose = require("mongoose");

const CATEGORIES = [
    "Coding", "Learning", "Reading", "Fitness", "Creativity",
    "Photography", "Quiz", "Skill Development", "Personal Development",
    "Competition", "Community", "Other",
];

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
}, { _id: true });

const milestoneSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    targetDate: { type: Date },
}, { _id: true });

const challengeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            minlength: [3, "Title must be at least 3 characters"],
            maxlength: [120, "Title cannot exceed 120 characters"],
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
            maxlength: [2000, "Description cannot exceed 2000 characters"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            enum: { values: CATEGORIES, message: "Invalid category" },
        },
        creator: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        accessType: {
            type: String,
            enum: ["public", "private", "community"],
            default: "public",
        },
        allowedParticipants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        community: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Community",
            default: null,
        },
        rules: {
            type: String,
            default: "",
            maxlength: [1000, "Rules cannot exceed 1000 characters"],
        },
        tasks: [taskSchema],
        milestones: [milestoneSchema],
        startDate: { type: Date },
        endDate: { type: Date },
        completionCriteria: {
            type: String,
            default: "",
            maxlength: [500, "Completion criteria cannot exceed 500 characters"],
        },
        proofRequired: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ["draft", "published", "completed", "archived"],
            default: "draft",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Challenge", challengeSchema);
module.exports.CATEGORIES = CATEGORIES;
