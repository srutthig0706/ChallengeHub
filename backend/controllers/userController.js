const mongoose = require("mongoose");
const User = require("../models/User");

const getProfile = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ user: user.toSafeObject() });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};

const updateProfile = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: "Invalid user ID" });
        }

        if (req.user._id.toString() !== req.params.id) {
            return res.status(403).json({ message: "Forbidden: you can only edit your own profile" });
        }

        const { name, username, bio, profileImage } = req.body;
        const updates = {};

        if (name !== undefined) {
            if (!name.trim()) return res.status(400).json({ message: "Name cannot be empty" });
            updates.name = name.trim();
        }

        if (username !== undefined) {
            const trimmed = username.trim().toLowerCase();
            if (trimmed.length < 3) return res.status(400).json({ message: "Username must be at least 3 characters" });
            if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });

            const existing = await User.findOne({ username: trimmed, _id: { $ne: req.params.id } });
            if (existing) return res.status(409).json({ message: "Username is already taken" });

            updates.username = trimmed;
        }

        if (bio !== undefined) {
            if (bio.length > 300) return res.status(400).json({ message: "Bio cannot exceed 300 characters" });
            updates.bio = bio;
        }

        if (profileImage !== undefined) {
            updates.profileImage = profileImage;
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-password");

        res.status(200).json({ message: "Profile updated", user: user.toSafeObject() });
    } catch (error) {
        if (error.name === "ValidationError") {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ message: messages[0] });
        }
        res.status(500).json({ message: "Server error" });
    }
};

const searchUsers = async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q) return res.status(200).json({ users: [] });

        const regex = new RegExp(q, "i");
        const users = await User.find({
            $or: [{ name: regex }, { username: regex }, { email: regex }],
            _id: { $ne: req.user._id },
        })
            .select("_id name username email")
            .limit(10);

        res.status(200).json({ users });
    } catch {
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getProfile, updateProfile, searchUsers };
