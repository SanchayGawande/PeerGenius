const mongoose = require("mongoose");

const threadSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    participants: [
      {
        userId: {
          type: String, // Firebase UID
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        role: {
          type: String,
          enum: ['owner', 'member'],
          default: 'member',
        }
      },
    ],
    createdBy: {
      type: String, // Firebase UID
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    messageCount: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Thread", threadSchema);
