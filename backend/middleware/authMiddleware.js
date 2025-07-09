// backend/middleware/authMiddleware.js
const admin = require("../firebaseAdmin"); // your singleton firebase-admin init

module.exports = async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  const idToken = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // attach decoded token
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    res.status(403).json({ error: "Token verification failed" });
  }
};
