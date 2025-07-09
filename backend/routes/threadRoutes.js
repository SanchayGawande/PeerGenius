// backend/routes/threadRoutes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { validateCreateThread, validateObjectId } = require("../middleware/validation");
const { getThreads, createThread, joinThread, leaveThread, getPublicThreads } = require("../controllers/threadController");

router.get("/", verifyToken, getThreads);
router.get("/public", verifyToken, getPublicThreads);
router.post("/", verifyToken, validateCreateThread, createThread);
router.post("/:threadId/join", verifyToken, validateObjectId('threadId'), joinThread);
router.post("/:threadId/leave", verifyToken, validateObjectId('threadId'), leaveThread);

module.exports = router;
