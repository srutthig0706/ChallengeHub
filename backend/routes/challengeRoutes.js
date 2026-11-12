const express = require("express");
const router = express.Router();
const {
    createChallenge,
    getChallenges,
    getMyChallenges,
    getChallengeById,
    updateChallenge,
    deleteChallenge,
} = require("../controllers/challengeController");
const {
    joinChallenge,
    leaveChallenge,
    getMyParticipation,
    getParticipants,
} = require("../controllers/participationController");
const { getTasks, createTask } = require("../controllers/taskController");
const { createSubmission, getSubmissions, getMySubmissions } = require("../controllers/submissionController");
const upload = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");

// Optional auth: attach user if token present, but don't reject unauthenticated requests
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
    try {
        const jwt = require("jsonwebtoken");
        const User = require("../models/User");
        const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-password");
        if (user) req.user = user;
    } catch {
        // Invalid token — proceed as unauthenticated
    }
    next();
};

router.get("/", optionalAuth, getChallenges);
router.get("/mine", authMiddleware, getMyChallenges);
router.get("/:id", optionalAuth, getChallengeById);
router.post("/", authMiddleware, createChallenge);
router.put("/:id", authMiddleware, updateChallenge);
router.delete("/:id", authMiddleware, deleteChallenge);

// Participation routes
router.post("/:id/join", authMiddleware, joinChallenge);
router.delete("/:id/leave", authMiddleware, leaveChallenge);
router.get("/:id/participation", authMiddleware, getMyParticipation);
router.get("/:id/participants", optionalAuth, getParticipants);

// Task routes (challenge-scoped)
router.get("/:id/tasks", optionalAuth, getTasks);
router.post("/:id/tasks", authMiddleware, createTask);

// Submission routes (challenge-scoped)
router.post("/:id/submissions", authMiddleware, upload.single("fileProof"), createSubmission);
router.get("/:id/submissions", authMiddleware, getSubmissions);
router.get("/:id/submissions/my", authMiddleware, getMySubmissions);

module.exports = router;
