const mongoose = require("mongoose");
const Challenge = require("../models/Challenge");
const Community = require("../models/Community");
const User = require("../models/User");
const { canAccessChallenge } = require("../services/challengeAccessService");

const VALID_SORT = {
    newest:    { createdAt: -1 },
    oldest:    { createdAt:  1 },
    startDate: { startDate:  1 },
    endDate:   { endDate:    1 },
    titleAsc:  { title:      1 },
    titleDesc: { title:     -1 },
};

const VALID_ACCESS_TYPES = ["public", "private", "community"];
const VALID_STATUSES     = ["draft", "published", "completed", "archived"];

const createChallenge = async (req, res) => {
    try {
        const {
            title, description, category, rules,
            startDate, endDate, completionCriteria,
            proofRequired, accessType, status,
            allowedParticipants, community,
        } = req.body;

        if (!title || !description || !category) {
            return res.status(400).json({ message: "Title, description, and category are required" });
        }

        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ message: "End date cannot be before start date" });
        }

        const resolvedAccessType = accessType || "public";

        let resolvedParticipants = [];
        if (resolvedAccessType === "private") {
            if (!allowedParticipants || allowedParticipants.length === 0) {
                return res.status(400).json({ message: "Private challenges require at least one allowed participant" });
            }
            const validIds = allowedParticipants.filter((id) => mongoose.Types.ObjectId.isValid(id));
            if (validIds.length !== allowedParticipants.length) {
                return res.status(400).json({ message: "One or more participant IDs are invalid" });
            }
            const users = await User.find({ _id: { $in: validIds } }).select("_id");
            if (users.length !== validIds.length) {
                return res.status(400).json({ message: "One or more participants do not exist" });
            }
            resolvedParticipants = validIds;
        }

        let resolvedCommunity = null;
        if (resolvedAccessType === "community") {
            if (!community || !mongoose.Types.ObjectId.isValid(community)) {
                return res.status(400).json({ message: "A valid community is required for community challenges" });
            }
            const comm = await Community.findById(community);
            if (!comm) return res.status(400).json({ message: "Community not found" });
            resolvedCommunity = community;
        }

        const challenge = await Challenge.create({
            title, description, category,
            rules: rules || "",
            startDate: startDate || null,
            endDate: endDate || null,
            completionCriteria: completionCriteria || "",
            proofRequired: proofRequired === true || proofRequired === "true",
            accessType: resolvedAccessType,
            status: status || "draft",
            creator: req.user._id,
            allowedParticipants: resolvedParticipants,
            community: resolvedCommunity,
        });

        await challenge.populate("creator", "name username");
        res.status(201).json({ message: "Challenge created", challenge });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages[0] });
        }
        console.error("createChallenge error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getChallenges = async (req, res) => {
    try {
        const user = req.user || null;

        // ── Pagination ──────────────────────────────────────────────
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
        const skip  = (page - 1) * limit;

        // ── Sort ─────────────────────────────────────────────────────
        const sortKey = req.query.sort || "newest";
        const sortObj = VALID_SORT[sortKey] || VALID_SORT.newest;

        // ── Build access-control base condition ──────────────────────
        let accessCondition;
        if (!user) {
            accessCondition = { accessType: "public" };
        } else {
            const userId = user._id;
            const userCommunities = await Community.find({ members: userId }).select("_id");
            const communityIds = userCommunities.map((c) => c._id);

            accessCondition = {
                $or: [
                    { accessType: "public" },
                    { creator: userId },
                    { accessType: "private", allowedParticipants: userId },
                    { accessType: "community", community: { $in: communityIds } },
                ],
            };
        }

        // ── Additional filters ───────────────────────────────────────
        const filters = {};

        // Search: title, description, category (case-insensitive)
        const q = (req.query.q || "").trim();
        if (q) {
            const regex = new RegExp(q, "i");
            filters.$or = [
                { title: regex },
                { description: regex },
                { category: regex },
            ];
        }

        // Category filter
        if (req.query.category) {
            filters.category = req.query.category;
        }

        // Access type filter — only apply if it's a valid value AND user is authorized
        if (req.query.accessType) {
            if (!VALID_ACCESS_TYPES.includes(req.query.accessType)) {
                return res.status(400).json({ message: "Invalid accessType filter" });
            }
            filters.accessType = req.query.accessType;
        }

        // Status filter
        if (req.query.status) {
            if (!VALID_STATUSES.includes(req.query.status)) {
                return res.status(400).json({ message: "Invalid status filter" });
            }
            // Non-creators should not see other users' drafts
            if (req.query.status === "draft") {
                if (!user) {
                    return res.status(200).json({
                        challenges: [],
                        pagination: { page, limit, total: 0, pages: 0 },
                    });
                }
                filters.status = "draft";
                filters.creator = user._id; // only own drafts
            } else {
                filters.status = req.query.status;
            }
        } else {
            // Default: exclude archived unless explicitly requested
            filters.status = { $ne: "archived" };
        }

        // ── Combine access + filters ─────────────────────────────────
        // If filters already has $or (from search), we need $and to combine
        let finalQuery;
        if (filters.$or) {
            const { $or: searchOr, ...rest } = filters;
            finalQuery = { ...accessCondition, ...rest, $and: [{ $or: searchOr }] };
            // If accessCondition also has $or, wrap both
            if (accessCondition.$or) {
                finalQuery = {
                    ...rest,
                    $and: [
                        { $or: accessCondition.$or },
                        { $or: searchOr },
                    ],
                };
            }
        } else {
            finalQuery = { ...accessCondition, ...filters };
        }

        // ── Execute ──────────────────────────────────────────────────
        const [challenges, total] = await Promise.all([
            Challenge.find(finalQuery)
                .populate("creator", "name username")
                .sort(sortObj)
                .skip(skip)
                .limit(limit),
            Challenge.countDocuments(finalQuery),
        ]);

        res.status(200).json({
            challenges,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("getChallenges error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

const getMyChallenges = async (req, res) => {
    try {
        const challenges = await Challenge.find({ creator: req.user._id })
            .sort({ createdAt: -1 });
        res.status(200).json({ challenges });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
};

const getChallengeById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const challenge = await Challenge.findById(req.params.id)
            .populate("creator", "name username")
            .populate("allowedParticipants", "name username")
            .populate("community", "name description");

        if (!challenge) {
            return res.status(404).json({ message: "Challenge not found" });
        }

        const user = req.user || null;
        const allowed = await canAccessChallenge(user, challenge);
        if (!allowed) {
            return res.status(403).json({ message: "You do not have access to this challenge" });
        }

        res.status(200).json({ challenge });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
};

const updateChallenge = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ message: "Challenge not found" });

        if (challenge.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Forbidden: you can only edit your own challenges" });
        }

        const {
            title, description, category, rules,
            startDate, endDate, completionCriteria,
            proofRequired, accessType, status,
            allowedParticipants, community,
        } = req.body;

        if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({ message: "End date cannot be before start date" });
        }

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (category !== undefined) updates.category = category;
        if (rules !== undefined) updates.rules = rules;
        if (startDate !== undefined) updates.startDate = startDate || null;
        if (endDate !== undefined) updates.endDate = endDate || null;
        if (completionCriteria !== undefined) updates.completionCriteria = completionCriteria;
        if (proofRequired !== undefined) updates.proofRequired = proofRequired === true || proofRequired === "true";
        if (status !== undefined) updates.status = status;

        const resolvedAccessType = accessType !== undefined ? accessType : challenge.accessType;
        if (accessType !== undefined) updates.accessType = accessType;

        if (resolvedAccessType === "private" && allowedParticipants !== undefined) {
            const validIds = allowedParticipants.filter((id) => mongoose.Types.ObjectId.isValid(id));
            if (validIds.length !== allowedParticipants.length) {
                return res.status(400).json({ message: "One or more participant IDs are invalid" });
            }
            const users = await User.find({ _id: { $in: validIds } }).select("_id");
            if (users.length !== validIds.length) {
                return res.status(400).json({ message: "One or more participants do not exist" });
            }
            updates.allowedParticipants = validIds;
        }

        if (resolvedAccessType === "community" && community !== undefined) {
            if (!community || !mongoose.Types.ObjectId.isValid(community)) {
                return res.status(400).json({ message: "A valid community is required" });
            }
            const comm = await Community.findById(community);
            if (!comm) return res.status(400).json({ message: "Community not found" });
            updates.community = community;
        }

        if (accessType === "public" || accessType === "community") updates.allowedParticipants = [];
        if (accessType === "public" || accessType === "private") updates.community = null;

        const updated = await Challenge.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        )
            .populate("creator", "name username")
            .populate("allowedParticipants", "name username")
            .populate("community", "name description");

        res.status(200).json({ message: "Challenge updated", challenge: updated });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages[0] });
        }
        res.status(500).json({ message: "Server error" });
    }
};

const deleteChallenge = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid challenge ID" });
        }

        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ message: "Challenge not found" });

        if (challenge.creator.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Forbidden: you can only delete your own challenges" });
        }

        await Challenge.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Challenge deleted" });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { createChallenge, getChallenges, getMyChallenges, getChallengeById, updateChallenge, deleteChallenge };
