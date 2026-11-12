const express = require("express");
const router = express.Router();
const { getCommunities, getCommunityById, createCommunity, addMember } = require("../controllers/communityController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, getCommunities);
router.get("/:id", authMiddleware, getCommunityById);
router.post("/", authMiddleware, createCommunity);
router.post("/:id/members", authMiddleware, addMember);

module.exports = router;
