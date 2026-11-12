const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");
const Participation = require("../models/Participation");
const { canAccessChallenge } = require("../services/challengeAccessService");
const { createNotification } = require("../services/notificationService");

// POST /api/challenges/:id/join
const joinChallenge = async (req, res) => {
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

        // Only published challenges can be joined
        if (challenge.status !== "published") {
            return res.status(400).json({ message: "Only published challenges can be joined" });
        }

        // Creators cannot join their own challenge as a participant
        if (challenge.creator.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You cannot join your own challenge" });
        }

        // Reuse Module 5 access control for eligibility
        const eligible = await canAccessChallenge(req.user, challenge);
        if (!eligible) {
            return res.status(403).json({ message: "You are not eligible to join this challenge" });
        }

        // Check for an existing participation record
        const existing = await Participation.findOne({ user: req.user._id, challenge: id });

        if (existing && existing.status === "active") {
            return res.status(409).json({ message: "You have already joined this challenge" });
        }
        if (existing && existing.status === "completed") {
            return res.status(409).json({ message: "You have already completed this challenge" });
        }

        let participation;

        if (existing && existing.status === "left") {
            // Reuse the existing record — reset to active
            existing.status = "active";
            existing.progress = 0;
            existing.completedTasks = [];
            existing.joinedAt = new Date();
            existing.completedAt = null;
            await existing.save();
            participation = existing;
        } else {
            // No prior record — create fresh
            participation = await Participation.create({
                user: req.user._id,
                challenge: id,
            });
        }

        res.status(201).json({
            message: "Successfully joined challenge",
            participation: {
                id: participation._id,
                challenge: participation.challenge,
                user: participation.user,
                status: participation.status,
                progress: participation.progress,
                completedTasks: participation.completedTasks,
                joinedAt: participation.joinedAt,
            },
        });

        // Notify challenge creator — skip if the joiner IS the creator (guard already
        // exists above, but kept here for safety)
        const creatorId = challenge.creator._id || challenge.creator;
        if (creatorId.toString() !== req.user._id.toString()) {
            try {
                await createNotification({
                    recipient: creatorId,
                    type: "join",
                    actor: req.user._id,
                    challenge: challenge._id,
                    message: `${req.user.name} (@${req.user.username}) joined your challenge "${challenge.title}".`,
                });
            } catch (notificationError) {
                console.error("Failed to create join notification:", notificationError);
            }
        }
    } catch (error) {
        console.error("joinChallenge error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// DELETE /api/challenges/:id/leave
const leaveChallenge = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const challenge = await Challenge.findById(id);
        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        // Only the authenticated user's own participation — never trust frontend userId
        const participation = await Participation.findOne({
            user: req.user._id,
            challenge: id,
        });

        if (!participation) {
            return res.status(404).json({ message: "You have not joined this challenge" });
        }

        if (participation.status === "left") {
            return res.status(400).json({ message: "You have already left this challenge" });
        }

        // Preserve historical record — mark as left rather than delete
        participation.status = "left";
        await participation.save();

        res.status(200).json({ message: "Successfully left challenge" });
    } catch (error) {
        console.error("leaveChallenge error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challenges/:id/participation  (current user's participation status)
const getMyParticipation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const participation = await Participation.findOne({
            user: req.user._id,
            challenge: id,
        }).select("status progress completedTasks joinedAt completedAt");

        // Not joined is not an error
        res.status(200).json({ participation: participation || null });
    } catch (error) {
        console.error("getMyParticipation error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/challenges/:id/participants
const getParticipants = async (req, res) => {
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

        // Enforce challenge visibility — reuse Module 5 access control
        const user = req.user || null;
        const allowed = await canAccessChallenge(user, challenge);
        if (!allowed) {
            return res.status(403).json({ message: "You do not have access to this challenge" });
        }

        const participants = await Participation.find({ challenge: id })
            .populate("user", "name username")
            .select("user status joinedAt completedAt progress")
            .sort({ joinedAt: 1 });

        res.status(200).json({ participants });
    } catch (error) {
        console.error("getParticipants error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// GET /api/users/me/challenges  (challenges the current user has joined)
const getMyJoinedChallenges = async (req, res) => {
    try {
        const participations = await Participation.find({ user: req.user._id })
            .populate({
                path: "challenge",
                populate: { path: "creator", select: "name username" },
            })
            .sort({ joinedAt: -1 });

        res.status(200).json({ participations });
    } catch (error) {
        console.error("getMyJoinedChallenges error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = {
    joinChallenge,
    leaveChallenge,
    getMyParticipation,
    getParticipants,
    getMyJoinedChallenges,
};
