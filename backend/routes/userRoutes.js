// backend/routes/userRoutes.js
const express = require("express");
const { upsertUser } = require("../controllers/userController");
const verifyToken = require("../middleware/authMiddleware");
const { validateUserSync } = require("../middleware/validation");
const router = express.Router();

// POST /api/users   <-- this will now insert/update by firebaseId
router.post("/", verifyToken, validateUserSync, upsertUser);

module.exports = router;
