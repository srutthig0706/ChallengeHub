const mongoose = require("mongoose");
const Community = require("../models/Community");
const { createNotification } = require("../services/notificationService");

const getCommunities = async (req, res) => {
    try {
        const communities = await Community.find()
            .populate("creator", "name username")
            .sort({ createdAt: -1 });
        res.status(200).json({ communities });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
};

const getCommunityById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid community ID" });
        }
        const community = await Community.findById(req.params.id)
            .populate("creator", "name username")
            .populate("members", "name username");
        if (!community) return res.status(404).json({ message: "Community not found" });
        res.status(200).json({ community });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
};

const createCommunity = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Community name is required" });
        }

        const community = await Community.create({
            name: name.trim(),
            description: description?.trim() || "",
            creator: req.user._id,
            members: [req.user._id],
        });

        await community.populate("creator", "name username");
        res.status(201).json({ message: "Community created", community });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages[0] });
        }
        res.status(500).json({ message: "Server error" });
    }
};

const addMember = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid community ID" });
        }

        const community = await Community.findById(req.params.id);
        if (!community) return res.status(404).json({ message: "Community not found" });

        if (community.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the community creator can add members" });
        }

        const { userId } = req.body;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Valid userId is required" });
        }

        if (community.members.some((m) => m.toString() === userId)) {
            return res.status(409).json({ message: "User is already a member" });
        }

        community.members.push(userId);
        await community.save();

        res.status(200).json({ message: "Member added", community });

        // Notify the added user — skip if they added themselves
        if (userId.toString() !== req.user._id.toString()) {
            try {
                await createNotification({
                    recipient: userId,
                    type: "added_to_community",
                    actor: req.user._id,
                    community: community._id,
                    message: `You were added to the community "${community.name}".`,
                });
            } catch (notificationError) {
                console.error("Failed to create community notification:", notificationError);
            }
        }
    } catch {
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getCommunities, getCommunityById, createCommunity, addMember };
