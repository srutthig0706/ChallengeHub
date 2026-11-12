const express = require("express");
const router = express.Router();
const { updateTask, deleteTask, completeTask } = require("../controllers/taskController");
const authMiddleware = require("../middleware/authMiddleware");

router.put("/:id", authMiddleware, updateTask);
router.delete("/:id", authMiddleware, deleteTask);
router.patch("/:id/complete", authMiddleware, completeTask);

module.exports = router;
