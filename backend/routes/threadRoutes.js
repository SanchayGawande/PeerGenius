// backend/routes/threadRoutes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { validateCreateThread, validateObjectId } = require("../middleware/validation");
const admin = require("../firebaseAdmin");
const { 
  getThreads, 
  createThread, 
  joinThread, 
  leaveThread, 
  getPublicThreads,
  refreshPublicThreadsCache,
  searchThreads,
  getRecommendedThreads,
  getThreadAnalytics
} = require("../controllers/threadController");

// Basic thread operations
router.get("/", verifyToken, getThreads);
// Allow public threads to be viewed without authentication
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.split(" ")[1];
    if (idToken) {
      // Try to verify token but don't fail if it's invalid
      admin.auth().verifyIdToken(idToken)
        .then(decoded => {
          req.user = decoded;
          next();
        })
        .catch(err => {
          console.warn("Optional auth failed:", err.message);
          // Set a default user for anonymous access
          req.user = { uid: "anonymous", email: "anonymous@example.com" };
          next();
        });
    } else {
      req.user = { uid: "anonymous", email: "anonymous@example.com" };
      next();
    }
  } else {
    // No auth header, proceed as anonymous
    req.user = { uid: "anonymous", email: "anonymous@example.com" };
    next();
  }
};

router.get("/public", optionalAuth, getPublicThreads);

router.post("/public/refresh", verifyToken, refreshPublicThreadsCache); // CRITICAL FIX: Manual cache refresh endpoint
router.post("/", verifyToken, validateCreateThread, createThread);
router.post("/:threadId/join", verifyToken, validateObjectId('threadId'), joinThread);
router.post("/:threadId/leave", verifyToken, validateObjectId('threadId'), leaveThread);

// Advanced discovery and search
router.get("/search", verifyToken, searchThreads);
router.get("/recommended", verifyToken, getRecommendedThreads);
router.get("/:threadId/analytics", verifyToken, validateObjectId('threadId'), getThreadAnalytics);

module.exports = router;
