const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    sender: {
      type: String,
      required: true,
    },
    senderEmail: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ['user', 'ai', 'system'],
      default: 'user',
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
