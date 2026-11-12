const express = require("express");
const router = express.Router();
const { reviewSubmission } = require("../controllers/submissionController");
const authMiddleware = require("../middleware/authMiddleware");

// PUT /api/submissions/:id/review
router.put("/:id/review", authMiddleware, reviewSubmission);

module.exports = router;
