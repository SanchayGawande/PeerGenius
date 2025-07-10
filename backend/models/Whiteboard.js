const mongoose = require("mongoose");

const whiteboardSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    createdBy: {
      type: String,
      required: true,
    },
    creatorEmail: {
      type: String,
      required: true,
    },
    canvasData: {
      type: String, // JSON string of canvas drawing data
      default: ""
    },
    elements: [{
      id: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['line', 'rectangle', 'circle', 'text', 'arrow', 'freehand'],
        required: true
      },
      data: {
        type: mongoose.Schema.Types.Mixed, // Flexible data structure for different element types
        required: true
      },
      style: {
        strokeColor: { type: String, default: '#000000' },
        fillColor: { type: String, default: 'transparent' },
        strokeWidth: { type: Number, default: 2 },
        fontSize: { type: Number, default: 16 }
      },
      author: {
        userId: { type: String, required: true },
        email: { type: String, required: true }
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      updatedAt: {
        type: Date,
        default: Date.now
      }
    }],
    collaborators: [{
      userId: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true
      },
      role: {
        type: String,
        enum: ['editor', 'viewer'],
        default: 'editor'
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Index for efficient queries
whiteboardSchema.index({ threadId: 1 });
whiteboardSchema.index({ createdBy: 1 });
whiteboardSchema.index({ isActive: 1 });

// Update lastActivity on save
whiteboardSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

module.exports = mongoose.model("Whiteboard", whiteboardSchema);