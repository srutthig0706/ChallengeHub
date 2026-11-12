const express = require("express");
const router = express.Router();
const { getProfile, updateProfile, searchUsers } = require("../controllers/userController");
const { getMyJoinedChallenges } = require("../controllers/participationController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/search", authMiddleware, searchUsers);
router.get("/me/challenges", authMiddleware, getMyJoinedChallenges);
router.get("/:id", authMiddleware, getProfile);
router.put("/:id", authMiddleware, updateProfile);

module.exports = router;
