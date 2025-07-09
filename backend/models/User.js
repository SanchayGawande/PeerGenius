// backend/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true, // ← enforce one-to-one with your Firebase UID
    },
    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true, // gives you createdAt / updatedAt
  }
);

module.exports = mongoose.model("User", userSchema);
