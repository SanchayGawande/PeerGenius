// backend/controllers/userController.js
const User = require("../models/User");

exports.upsertUser = async (req, res) => {
  try {
    const { uid, email } = req.body;

    // 1) basic sanity check
    if (!uid || !email) {
      return res
        .status(400)
        .json({ error: "Missing uid or email in request body" });
    }

    // 2) upsert—filter on uid, set uid & email
    await User.updateOne({ uid }, { uid, email }, { upsert: true });

    return res.sendStatus(200);
  } catch (err) {
    console.error("User upsert failed:", err);
    return res.status(500).json({ error: err.message });
  }
};
