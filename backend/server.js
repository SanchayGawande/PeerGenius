// at the very top of server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { createServer } = require("http");
const { Server } = require("socket.io");

const userRoutes = require("./routes/userRoutes");
const threadRoutes = require("./routes/threadRoutes");
const threadCategoryRoutes = require("./routes/threadCategoryRoutes");
const messageRoutes = require("./routes/messageRoutes");

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST"]
  }
});

// Make io available to routes
app.set('io', io);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((e) => console.error(e));

// Rate limiting - More lenient for development/real-time chat
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 60, // Allow 60 requests per minute (1 per second)
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/api/health' || req.path === '/';
  }
});

// Moderate rate limiting for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 200 : 30, // Higher limit for development
  message: {
    error: 'Too many API requests, please slow down.',
  },
});

// Note: AI-specific rate limiting is now handled in message routes

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(limiter);

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174", process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Socket.IO event handlers
const connectedUsers = new Map(); // userId -> socketId mapping
const typingUsers = new Map(); // threadId -> Set of userIds

io.on('connection', (socket) => {
  console.log(`🔌 New socket connection: ${socket.id}`);
  
  // User authentication and setup
  socket.on('user:join', (userData) => {
    const { userId, email } = userData;
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    socket.userEmail = email;
    console.log(`👤 User joined: ${email} (${userId}) - Socket: ${socket.id}`);
  });
  
  // Join thread rooms for real-time updates
  socket.on('thread:join', (threadId) => {
    socket.join(`thread:${threadId}`);
    console.log(`📱 User ${socket.userEmail} joined thread room: ${threadId}`);
  });
  
  // Leave thread rooms
  socket.on('thread:leave', (threadId) => {
    socket.leave(`thread:${threadId}`);
    console.log(`📱 User ${socket.userEmail} left thread room: ${threadId}`);
  });
  
  // Typing indicators
  socket.on('typing:start', (data) => {
    const { threadId, userName } = data;
    if (!typingUsers.has(threadId)) {
      typingUsers.set(threadId, new Set());
    }
    typingUsers.get(threadId).add(socket.userId);
    
    // Broadcast to others in the thread
    socket.to(`thread:${threadId}`).emit('user:typing', {
      userId: socket.userId,
      userName: userName || socket.userEmail,
      threadId
    });
    
    console.log(`⌨️ ${socket.userEmail} started typing in thread ${threadId}`);
  });
  
  socket.on('typing:stop', (data) => {
    const { threadId } = data;
    if (typingUsers.has(threadId)) {
      typingUsers.get(threadId).delete(socket.userId);
      if (typingUsers.get(threadId).size === 0) {
        typingUsers.delete(threadId);
      }
    }
    
    // Broadcast to others in the thread
    socket.to(`thread:${threadId}`).emit('user:stop-typing', {
      userId: socket.userId,
      threadId
    });
    
    console.log(`⌨️ ${socket.userEmail} stopped typing in thread ${threadId}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
      
      // Clean up typing indicators
      for (const [threadId, users] of typingUsers.entries()) {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          // Notify others that user stopped typing
          socket.to(`thread:${threadId}`).emit('user:stop-typing', {
            userId: socket.userId,
            threadId
          });
          if (users.size === 0) {
            typingUsers.delete(threadId);
          }
        }
      }
      
      console.log(`👤 User disconnected: ${socket.userEmail} (${socket.userId})`);
    } else {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    }
  });
});

app.get("/", (req, res) => res.send("👋 PeerGenius API"));
app.get("/api/health", (req, res) => res.json({ status: "OK", timestamp: new Date().toISOString() }));

// mount in this order:
app.use("/api/users", apiLimiter, userRoutes);
app.use("/api/threads", apiLimiter, threadRoutes);
app.use("/api/thread-categories", apiLimiter, threadCategoryRoutes);
app.use("/api/messages", messageRoutes); // AI limiter applied per endpoint in routes

// Import error handlers
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5050;
server.listen(PORT, 'localhost', () => {
  console.log(`🚀 Server on localhost:${PORT}`);
  console.log(`⚡ Socket.IO ready for real-time features`);
});
