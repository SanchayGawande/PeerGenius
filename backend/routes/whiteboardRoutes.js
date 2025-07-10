const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  getWhiteboards,
  getWhiteboard,
  createWhiteboard,
  updateWhiteboardElements,
  deleteWhiteboard
} = require("../controllers/whiteboardController");
const verifyToken = require("../middleware/authMiddleware");
const { validateObjectId } = require("../middleware/validation");

// Whiteboard-specific rate limiting
const whiteboardLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 200 : 60, // Higher limit for development (real-time drawing)
  message: {
    error: 'Drawing too quickly, please slow down.',
  },
});

// Routes
router.get("/thread/:threadId", verifyToken, validateObjectId('threadId'), getWhiteboards);
router.get("/:whiteboardId", verifyToken, validateObjectId('whiteboardId'), getWhiteboard);
router.post("/thread/:threadId", verifyToken, validateObjectId('threadId'), createWhiteboard);
router.put("/:whiteboardId/elements", verifyToken, validateObjectId('whiteboardId'), whiteboardLimiter, updateWhiteboardElements);
router.delete("/:whiteboardId", verifyToken, validateObjectId('whiteboardId'), deleteWhiteboard);

module.exports = router;