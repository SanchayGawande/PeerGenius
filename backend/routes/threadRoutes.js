// backend/routes/threadRoutes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { validateCreateThread, validateObjectId } = require("../middleware/validation");
const { 
  getThreads, 
  createThread, 
  joinThread, 
  leaveThread, 
  getPublicThreads,
  searchThreads,
  getRecommendedThreads,
  getThreadAnalytics
} = require("../controllers/threadController");

// Basic thread operations
router.get("/", verifyToken, getThreads);
router.get("/public", verifyToken, getPublicThreads);
router.post("/", verifyToken, validateCreateThread, createThread);
router.post("/:threadId/join", verifyToken, validateObjectId('threadId'), joinThread);
router.post("/:threadId/leave", verifyToken, validateObjectId('threadId'), leaveThread);

// Advanced discovery and search
router.get("/search", verifyToken, searchThreads);
router.get("/recommended", verifyToken, getRecommendedThreads);
router.get("/:threadId/analytics", verifyToken, validateObjectId('threadId'), getThreadAnalytics);

module.exports = router;
