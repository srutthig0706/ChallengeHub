const mongoose = require("mongoose");
const Task = require("../models/Task");
const Challenge = require("../models/Challenge");
const Participation = require("../models/Participation");
const { canAccessChallenge } = require("../services/challengeAccessService");
const { createNotification } = require("../services/notificationService");
const Notification = require("../models/Notification");

// ── Shared helper: recalculate progress and update participation ──────────────
async function recalculateProgress(participation, challengeId) {
    const totalTasks = await Task.countDocuments({ challenge: challengeId });

    if (totalTasks === 0) {
        participation.progress = 0;
        return;
    }

    // Only count completedTasks that still exist (safe after task deletion)
    const validCompleted = await Task.countDocuments({
        _id: { $in: participation.completedTasks },
        challenge: challengeId,
    });

    participation.progress = Math.round((validCompleted / totalTasks) * 100);

    if (validCompleted >= totalTasks) {
        const wasAlreadyCompleted = participation.status === "completed";
        participation.status = "completed";
        participation.completedAt = participation.completedAt || new Date();

        // Fire completed notification only on the transition (not on repeat calls)
        if (!wasAlreadyCompleted) {
            try {
                const alreadyNotified = await Notification.findOne({
                    recipient: participation.user,
                    type: "completed",
                    challenge: challengeId,
                });
                if (!alreadyNotified) {
                    await createNotification({
                        recipient: participation.user,
                        type: "completed",
                        challenge: challengeId,
                        message: `Congratulations! You completed the challenge.`,
                    });
                }
            } catch (notificationError) {
                console.error("Failed to create completed notification:", notificationError);
            }
        }
    } else if (participation.status === "completed") {
        // Tasks were added after completion — revert to active
        participation.status = "active";
        participation.completedAt = null;
    }
}

// GET /api/challenges/:id/tasks
const getTasks = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const challenge = await Challenge.findById(id)
            .populate("community", "members creator");
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        // Enforce challenge visibility
        const user = req.user || null;
        const allowed = await canAccessChallenge(user, challenge);
        if (!allowed) {
            return res.status(403).json({ message: "You do not have access to this challenge" });
        }

        const tasks = await Task.find({ challenge: id }).sort({ order: 1, createdAt: 1 });
        res.status(200).json({ tasks });
    } catch (error) {
        console.error("getTasks error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// POST /api/challenges/:id/tasks
const createTask = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const challenge = await Challenge.findById(id);
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        if (challenge.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the challenge creator can add tasks" });
        }

        const { title, description, order, milestone, deadline, completionCriteria } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Task title is required" });
        }

        if (deadline && isNaN(new Date(deadline).getTime())) {
            return res.status(400).json({ message: "Invalid deadline date" });
        }

        // Default order: append after last task
        let resolvedOrder = order;
        if (resolvedOrder === undefined || resolvedOrder === null || resolvedOrder === "") {
            const lastTask = await Task.findOne({ challenge: id }).sort({ order: -1 });
            resolvedOrder = lastTask ? lastTask.order + 1 : 1;
        }

        const task = await Task.create({
            challenge: id,
            title: title.trim(),
            description: description?.trim() || "",
            order: Number(resolvedOrder),
            milestone: milestone?.trim() || "",
            deadline: deadline || null,
            completionCriteria: completionCriteria?.trim() || "",
        });

        // After adding a task, recalculate progress for all active/completed participants
        // so 100% doesn't stay incorrectly if a new task is added
        const participations = await Participation.find({
            challenge: id,
            status: { $in: ["active", "completed"] },
        });
        for (const p of participations) {
            await recalculateProgress(p, id);
            await p.save();
        }

        res.status(201).json({ message: "Task created", task });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages[0] });
        }
        console.error("createTask error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid task ID" });
        }

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const challenge = await Challenge.findById(task.challenge);
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        if (challenge.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the challenge creator can edit tasks" });
        }

        const { title, description, order, milestone, deadline, completionCriteria } = req.body;

        if (title !== undefined) {
            if (!title.trim()) return res.status(400).json({ message: "Task title cannot be empty" });
            task.title = title.trim();
        }
        if (description !== undefined) task.description = description.trim();
        if (order !== undefined) task.order = Number(order);
        if (milestone !== undefined) task.milestone = milestone.trim();
        if (deadline !== undefined) {
            if (deadline && isNaN(new Date(deadline).getTime())) {
                return res.status(400).json({ message: "Invalid deadline date" });
            }
            task.deadline = deadline || null;
        }
        if (completionCriteria !== undefined) task.completionCriteria = completionCriteria.trim();

        await task.save();
        res.status(200).json({ message: "Task updated", task });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages[0] });
        }
        console.error("updateTask error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid task ID" });
        }

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const challenge = await Challenge.findById(task.challenge);
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        if (challenge.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the challenge creator can delete tasks" });
        }

        const challengeId = task.challenge;
        await Task.findByIdAndDelete(id);

        // Remove this task from all participation completedTasks arrays
        await Participation.updateMany(
            { challenge: challengeId },
            { $pull: { completedTasks: new mongoose.Types.ObjectId(id) } }
        );

        // Recalculate progress for all affected participations
        const participations = await Participation.find({
            challenge: challengeId,
            status: { $in: ["active", "completed"] },
        });
        for (const p of participations) {
            await recalculateProgress(p, challengeId);
            await p.save();
        }

        res.status(200).json({ message: "Task deleted" });
    } catch (error) {
        console.error("deleteTask error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// PATCH /api/tasks/:id/complete
const completeTask = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid task ID" });
        }

        const task = await Task.findById(id);
        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const challengeId = task.challenge;

        // Find the user's active participation — must have joined
        const participation = await Participation.findOne({
            user: req.user._id,
            challenge: challengeId,
            status: "active",
        });

        if (!participation) {
            return res.status(403).json({
                message: "You must be an active participant to complete tasks",
            });
        }

        const taskObjectId = new mongoose.Types.ObjectId(id);

        // Prevent duplicate completion
        const alreadyCompleted = participation.completedTasks.some(
            (t) => t.toString() === id
        );
        if (alreadyCompleted) {
            return res.status(409).json({ message: "You have already completed this task" });
        }

        // Add task to completedTasks
        participation.completedTasks.push(taskObjectId);

        // Recalculate progress from DB
        await recalculateProgress(participation, challengeId);
        await participation.save();

        res.status(200).json({
            message: "Task completed",
            participation: {
                status: participation.status,
                progress: participation.progress,
                completedTasks: participation.completedTasks,
                completedAt: participation.completedAt,
            },
        });
    } catch (error) {
        console.error("completeTask error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getTasks, createTask, updateTask, deleteTask, completeTask, recalculateProgressExported: recalculateProgress };
