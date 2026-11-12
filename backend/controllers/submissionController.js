const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const Challenge = require("../models/Challenge");
const Task = require("../models/Task");
const Participation = require("../models/Participation");
const Submission = require("../models/Submission");

// Reuse Module 8 progress helper — import from taskController
const { recalculateProgressExported } = require("./taskController");
const { createNotification } = require("../services/notificationService");

// POST /api/challenges/:id/submissions
const createSubmission = async (req, res) => {
    try {
        const { id } = req.params; // challenge id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const challenge = await Challenge.findById(id);
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        // Proof must be required for this challenge
        if (!challenge.proofRequired) {
            return res.status(400).json({ message: "Proof submission is not required for this challenge" });
        }

        const { taskId, textProof } = req.body;

        if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: "A valid task ID is required" });
        }

        // Validate task belongs to this challenge
        const task = await Task.findById(taskId);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }
        if (task.challenge.toString() !== id) {
            return res.status(400).json({ message: "Task does not belong to this challenge" });
        }

        // Must be an active participant — not just allowed to view
        const participation = await Participation.findOne({
            user: req.user._id,
            challenge: id,
            status: "active",
        });
        if (!participation) {
            return res.status(403).json({ message: "You must be an active participant to submit proof" });
        }

        // Validate proof content — at least text or file required
        const hasText = textProof && textProof.trim().length > 0;
        const hasFile = !!req.file;
        if (!hasText && !hasFile) {
            // Clean up any uploaded file if validation fails
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(400).json({ message: "Please provide text proof or upload a file" });
        }

        // Duplicate pending submission check — one pending per participant per task
        const existingPending = await Submission.findOne({
            participant: req.user._id,
            task: taskId,
            status: "pending",
        });
        if (existingPending) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(409).json({ message: "You already have a pending submission for this task" });
        }

        // Check if already approved — no resubmission needed
        const existingApproved = await Submission.findOne({
            participant: req.user._id,
            task: taskId,
            status: "approved",
        });
        if (existingApproved) {
            if (req.file) fs.unlink(req.file.path, () => {});
            return res.status(409).json({ message: "Your proof for this task has already been approved" });
        }

        const submission = await Submission.create({
            challenge: id,
            task: taskId,
            participant: req.user._id,
            textProof: textProof?.trim() || "",
            fileProof: req.file ? `uploads/${req.file.filename}` : null,
            status: "pending",
        });

        res.status(201).json({
            message: "Proof submitted successfully. Awaiting creator review.",
            submission,
        });

        // Notify challenge creator about the new submission
        const creatorId = challenge.creator._id || challenge.creator;
        if (creatorId.toString() !== req.user._id.toString()) {
            try {
                await createNotification({
                    recipient: creatorId,
                    type: "submission",
                    actor: req.user._id,
                    challenge: challenge._id,
                    submission: submission._id,
                    message: `${req.user.name} (@${req.user.username}) submitted proof for a task in "${challenge.title}".`,
                });
            } catch (notificationError) {
                console.error("Failed to create submission notification:", notificationError);
            }
        }
    } catch (error) {
        if (req.file) fs.unlink(req.file.path, () => {});
        console.error("createSubmission error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challenges/:id/submissions
const getSubmissions = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const challenge = await Challenge.findById(id);
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        const isCreator = challenge.creator.toString() === req.user._id.toString();

        if (isCreator) {
            // Creator sees all submissions for their challenge
            const submissions = await Submission.find({ challenge: id })
                .populate("participant", "name username")
                .populate("task", "title order")
                .sort({ submittedAt: -1 });
            return res.status(200).json({ submissions });
        }

        // Participants see only their own submissions
        const submissions = await Submission.find({
            challenge: id,
            participant: req.user._id,
        })
            .populate("task", "title order")
            .sort({ submittedAt: -1 });

        res.status(200).json({ submissions });
    } catch (error) {
        console.error("getSubmissions error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// PUT /api/submissions/:id/review  (creator only)
const reviewSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid submission ID" });
        }

        const submission = await Submission.findById(id);
        if (!submission) {
            return res.status(404).json({ message: "Submission not found" });
        }

        // Only the challenge creator can review
        const challenge = await Challenge.findById(submission.challenge);
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }
        if (challenge.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the challenge creator can review submissions" });
        }

        const { status, creatorFeedback } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({ message: "Status must be 'approved' or 'rejected'" });
        }

        submission.status = status;
        submission.creatorFeedback = creatorFeedback?.trim() || "";
        submission.reviewedAt = new Date();
        await submission.save();

        // On approval — integrate with Module 8 task completion
        if (status === "approved") {
            const participation = await Participation.findOne({
                user: submission.participant,
                challenge: submission.challenge,
                status: { $in: ["active", "completed"] },
            });

            if (participation) {
                const taskId = submission.task;
                const alreadyCompleted = participation.completedTasks.some(
                    (t) => t.toString() === taskId.toString()
                );

                if (!alreadyCompleted) {
                    participation.completedTasks.push(new mongoose.Types.ObjectId(taskId));
                    await recalculateProgressExported(participation, submission.challenge);
                    await participation.save();
                }
            }
        }

        res.status(200).json({ message: `Submission ${status}`, submission });

        // Notify the participant about the review outcome
        const participantId = submission.participant._id || submission.participant;
        if (participantId.toString() !== req.user._id.toString()) {
            try {
                await createNotification({
                    recipient: participantId,
                    type: status, // "approved" or "rejected"
                    actor: req.user._id,
                    challenge: challenge._id,
                    submission: submission._id,
                    message:
                        status === "approved"
                            ? `Your proof submission for "${challenge.title}" was approved.`
                            : `Your proof submission for "${challenge.title}" was rejected.`,
                });
            } catch (notificationError) {
                console.error("Failed to create review notification:", notificationError);
            }
        }
    } catch (error) {
        console.error("reviewSubmission error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challenges/:id/submissions/my  — participant's own submissions for a challenge
const getMySubmissions = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const submissions = await Submission.find({
            challenge: id,
            participant: req.user._id,
        })
            .populate("task", "title order")
            .sort({ submittedAt: -1 });

        res.status(200).json({ submissions });
    } catch (error) {
        console.error("getMySubmissions error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { createSubmission, getSubmissions, reviewSubmission, getMySubmissions };
