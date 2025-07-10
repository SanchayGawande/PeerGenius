// backend/middleware/authMiddleware.js
const admin = require("../firebaseAdmin"); // your singleton firebase-admin init

module.exports = async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("❌ No valid authorization header:", authHeader);
      return res.status(401).json({ error: "No token provided" });
    }
    
    const idToken = authHeader.split(" ")[1];
    
    if (!idToken) {
      console.error("❌ No token found in authorization header");
      return res.status(401).json({ error: "No token provided" });
    }
    
    console.log("🔐 Verifying token for request:", req.method, req.path);
    
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // attach decoded token
    
    console.log("✅ Token verified for user:", decoded.email);
    next();
    
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    console.error("❌ Error details:", err);
    
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: "Token expired" });
    } else if (err.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: "Invalid token" });
    } else {
      return res.status(403).json({ error: "Token verification failed" });
    }
  }
};
