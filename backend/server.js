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
const whiteboardRoutes = require("./routes/whiteboardRoutes");
const aiTutorRoutes = require("./routes/aiTutorRoutes");
const contentGenerationRoutes = require("./routes/contentGenerationRoutes");
const intelligentAssistanceRoutes = require("./routes/intelligentAssistanceRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();
const server = createServer(app);

// Enhanced Socket.IO setup with improved connection handling
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 10000, // 10 seconds
  maxHttpBufferSize: 1e6, // 1MB
  allowRequest: (req, callback) => {
    // Enhanced connection validation
    const isOriginValid = req.headers.origin && 
      ["http://localhost:5173", "http://localhost:5174", process.env.FRONTEND_URL]
        .filter(Boolean)
        .includes(req.headers.origin);
    
    callback(null, isOriginValid);
  }
});

// Make io available to routes
app.set('io', io);

// Enhanced MongoDB connection with optimized settings
mongoose
  .connect(process.env.MONGO_URI, {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    family: 4, // Use IPv4, skip trying IPv6
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    heartbeatFrequencyMS: 10000, // Send heartbeat every 10 seconds
    retryWrites: true, // Enable retryable writes
    w: 'majority' // Write concern
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Connection pool size: ${mongoose.connection.db.options?.maxPoolSize || 'default'}`);
  })
  .catch((e) => {
    console.error("❌ MongoDB connection error:", e);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('📡 MongoDB connected to ' + process.env.MONGO_URI);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed through app termination');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during MongoDB shutdown:', error);
    process.exit(1);
  }
});

// Enhanced rate limiting with different tiers
const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: process.env.NODE_ENV === 'development' ? 200 : 30, // Strict limits for auth endpoints
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + user agent for better tracking
    return req.ip + ':' + (req.get('User-Agent') || '').slice(0, 50);
  }
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 500 : 60, // Moderate limits for general API
  message: {
    success: false,
    error: 'Too many API requests, please slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/api/health' || req.path === '/' || req.path.startsWith('/uploads');
  }
});

// AI-specific rate limiting (more restrictive)
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 50 : 10, // Very strict for AI endpoints
  message: {
    success: false,
    error: 'Too many AI requests, please wait before trying again.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minute window
  max: process.env.NODE_ENV === 'development' ? 50 : 20, // File upload limits
  message: {
    success: false,
    error: 'Too many file uploads, please wait before uploading again.',
    retryAfter: 300
  }
});

// Note: AI-specific rate limiting is now handled in message routes

// Enhanced security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Required for React development
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.groq.com", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

// Apply general rate limiting
app.use(apiLimiter);

// Enhanced CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:5173", 
        "http://localhost:5174", 
        process.env.FRONTEND_URL
      ].filter(Boolean);
      
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept', 
      'Origin', 
      'Cache-Control',
      'X-CSRF-Token'
    ],
    exposedHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200 // For legacy browser support
  })
);

// Enhanced body parsing with security limits
app.use(express.json({ 
  limit: '5mb', // Reduced from 10mb for security
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '5mb',
  parameterLimit: 100 // Limit number of parameters
}));

// Add request size monitoring
app.use((req, res, next) => {
  const contentLength = req.get('Content-Length');
  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
    return res.status(413).json({
      success: false,
      error: 'Request too large',
      maxSize: '5MB'
    });
  }
  next();
});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// CRITICAL FIX: Debug endpoint to check socket rooms
app.get('/debug/rooms', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Debug endpoint only available in development' });
  }
  
  const rooms = {};
  const allRooms = io.sockets.adapter.rooms;
  
  allRooms.forEach((sockets, roomName) => {
    if (roomName.startsWith('thread:')) {
      rooms[roomName] = {
        clientCount: sockets.size,
        clients: Array.from(sockets)
      };
    }
  });
  
  res.json({
    threadRooms: rooms,
    totalConnectedClients: io.sockets.sockets.size,
    connectedUsers: Array.from(connectedUsers.entries()).map(([userId, data]) => ({
      userId,
      email: data.email,
      status: data.status,
      activeThreads: Array.from(data.activeThreads || [])
    }))
  });
});

// Enhanced health check endpoint with Socket.IO statistics
app.get('/health', (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoStatus,
      socketio: 'active'
    },
    socketio: {
      totalConnections: connectionStats.total,
      activeConnections: connectionStats.active,
      errorCount: connectionStats.errors,
      connectedUsers: connectedUsers.size,
      activeThreads: onlineUsers.size,
      typingUsers: typingUsers.size
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Enhanced Socket.IO event handlers with improved reliability and error handling
const connectedUsers = new Map(); // userId -> {socketId, email, status, lastSeen, activeThreads}
const typingUsers = new Map(); // threadId -> Map of userId -> {userName, startTime}
const onlineUsers = new Map(); // threadId -> Set of userIds
const typingTimeouts = new Map(); // userId:threadId -> timeoutId for auto-cleanup
const connectionStats = { total: 0, active: 0, errors: 0 }; // Connection statistics

// Enhanced connection health monitoring
setInterval(() => {
  const now = Date.now();
  const staleConnections = [];
  
  // Find stale connections (no activity for 5 minutes)
  for (const [userId, userData] of connectedUsers.entries()) {
    if (now - userData.lastSeen.getTime() > 300000) { // 5 minutes
      staleConnections.push(userId);
    }
  }
  
  // Clean up stale connections
  staleConnections.forEach(userId => {
    connectedUsers.delete(userId);
    console.log(`🧹 Cleaned up stale connection for user ${userId}`);
  });
}, 60000); // Check every minute

// Helper function for user disconnect cleanup
function handleUserDisconnect(socket) {
  try {
    const userId = socket.userId;
    const userData = connectedUsers.get(userId);
    
    if (userData) {
      // Clean up active threads
      for (const threadId of userData.activeThreads) {
        socket.leave(`thread:${threadId}`);
        
        // Remove from online users
        if (onlineUsers.has(threadId)) {
          onlineUsers.get(threadId).delete(userId);
          
          // Broadcast updated online users
          const threadOnlineUsers = Array.from(onlineUsers.get(threadId) || []);
          socket.to(`thread:${threadId}`).emit('thread:online-users', {
            threadId,
            onlineUsers: threadOnlineUsers.map(id => ({
              userId: id,
              email: connectedUsers.get(id)?.email || 'Unknown',
              status: connectedUsers.get(id)?.status || 'offline'
            }))
          });
          
          if (onlineUsers.get(threadId).size === 0) {
            onlineUsers.delete(threadId);
          }
        }
      }
      
      // Clean up typing indicators
      for (const [threadId, users] of typingUsers.entries()) {
        if (users.has(userId)) {
          users.delete(userId);
          socket.to(`thread:${threadId}`).emit('user:stop-typing', {
            userId,
            threadId,
            timestamp: Date.now()
          });
          if (users.size === 0) {
            typingUsers.delete(threadId);
          }
        }
      }
      
      // Clean up typing timeouts
      for (const [key, timeoutId] of typingTimeouts.entries()) {
        if (key.startsWith(`${userId}:`)) {
          clearTimeout(timeoutId);
          typingTimeouts.delete(key);
        }
      }
      
      // Remove from connected users
      connectedUsers.delete(userId);
      
      console.log(`🧹 Cleaned up user ${userData.email} (${userId}) from all rooms and tracking`);
    }
  } catch (error) {
    console.error(`❌ Error in user disconnect cleanup for ${socket.id}:`, error);
  }
}

// Enhanced socket connection handling
io.on('connection', (socket) => {
  connectionStats.total++;
  connectionStats.active++;
  
  console.log(`🔌 New socket connection: ${socket.id} from ${socket.handshake.address}`);
  console.log(`📊 Connection stats: ${connectionStats.active} active, ${connectionStats.total} total`);
  
  // ✅ FIXED: Set timeout on underlying HTTP socket, not Socket.IO socket
  if (socket.request && socket.request.socket) {
    socket.request.socket.setTimeout(30000);
  }
  
  // Enhanced error handling
  socket.on('error', (error) => {
    connectionStats.errors++;
    console.error(`🚫 Socket error for ${socket.id}:`, {
      error: error.message,
      stack: error.stack,
      userId: socket.userId,
      userEmail: socket.userEmail,
      timestamp: new Date().toISOString()
    });
    
    // Try to gracefully handle the error
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
  });
  
  socket.on('disconnect', (reason) => {
    connectionStats.active = Math.max(0, connectionStats.active - 1);
    console.log(`🔌 Socket ${socket.id} disconnected: ${reason}`);
    console.log(`📊 Connection stats: ${connectionStats.active} active, ${connectionStats.total} total`);
    
    // Enhanced cleanup on disconnect
    if (socket.userId) {
      handleUserDisconnect(socket);
    }
  });
  
  // Add ping/pong for connection health
  socket.on('ping', (data) => {
    socket.emit('pong', { timestamp: Date.now(), ...data });
  });
  
  // Enhanced user authentication and setup
  socket.on('user:join', (userData) => {
    try {
      const { userId, email } = userData;
      
      // Validate user data
      if (!userId || !email) {
        console.error(`❌ Invalid user data for socket ${socket.id}:`, userData);
        socket.emit('error', { message: 'Invalid user data' });
        return;
      }
      
      // Check if user is already connected with different socket
      const existingConnection = connectedUsers.get(userId);
      if (existingConnection && existingConnection.socketId !== socket.id) {
        console.log(`🔄 User ${email} reconnecting with new socket ${socket.id}`);
        // Clean up old connection
        connectedUsers.delete(userId);
      }
      
      connectedUsers.set(userId, {
        socketId: socket.id,
        email: email,
        status: 'online',
        lastSeen: new Date(),
        activeThreads: new Set()
      });
      
      socket.userId = userId;
      socket.userEmail = email;
      
      console.log(`👤 User joined: ${email} (${userId}) - Socket: ${socket.id}`);
      
      // Send confirmation to user
      socket.emit('user:joined', { userId, email, timestamp: new Date().toISOString() });
      
    } catch (error) {
      console.error(`❌ Error in user:join for socket ${socket.id}:`, error);
      socket.emit('error', { message: 'Failed to join user session' });
    }
  });
  
  // Enhanced thread room management
  socket.on('thread:join', (threadId) => {
    try {
      if (!threadId || !socket.userId) {
        console.error(`❌ Invalid thread join attempt: threadId=${threadId}, userId=${socket.userId}`);
        socket.emit('error', { message: 'Invalid thread join data' });
        return;
      }
      
      const roomName = `thread:${threadId}`;
      socket.join(roomName);
      
      // CRITICAL FIX: Debug room joining with detailed logging
      const room = io.sockets.adapter.rooms.get(roomName);
      const clientCount = room ? room.size : 0;
      console.log(`📥 User ${socket.userId} (${socket.userEmail}) joined room "${roomName}" - Total clients in room: ${clientCount}`);
      
      // Track active threads for this user
      const userData = connectedUsers.get(socket.userId);
      if (userData) {
        userData.activeThreads.add(threadId);
        userData.lastSeen = new Date();
      }
      
      // Add user to online users for this thread
      if (!onlineUsers.has(threadId)) {
        onlineUsers.set(threadId, new Set());
      }
      onlineUsers.get(threadId).add(socket.userId);
      
      // CRITICAL FIX: Broadcast updated online users to ALL users in thread (including new joiner)
      const threadOnlineUsers = Array.from(onlineUsers.get(threadId) || []);
      const onlineUserData = threadOnlineUsers.map(userId => ({
        userId,
        email: connectedUsers.get(userId)?.email || 'Unknown',
        status: connectedUsers.get(userId)?.status || 'offline',
        joinedAt: new Date().toISOString()
      }));
      
      // Broadcast to everyone in the room (not just others)
      io.to(roomName).emit('thread:online-users', {
        threadId,
        onlineUsers: onlineUserData
      });
      
      console.log(`👥 Broadcasting ${onlineUserData.length} online users to room "${roomName}"`);
      
      // Send confirmation to user
      socket.emit('thread:joined', { 
        threadId, 
        timestamp: new Date().toISOString(),
        roomSize: clientCount
      });
      
    } catch (error) {
      console.error(`❌ Error in thread:join for socket ${socket.id}:`, error);
      socket.emit('error', { message: 'Failed to join thread room' });
    }
  });
  
  // Enhanced thread leave handling
  socket.on('thread:leave', (threadId) => {
    try {
      if (!threadId || !socket.userId) {
        console.error(`❌ Invalid thread leave attempt: threadId=${threadId}, userId=${socket.userId}`);
        return;
      }
      
      socket.leave(`thread:${threadId}`);
      
      // Remove from user's active threads
      const userData = connectedUsers.get(socket.userId);
      if (userData) {
        userData.activeThreads.delete(threadId);
        userData.lastSeen = new Date();
      }
      
      // Remove user from online users for this thread
      if (onlineUsers.has(threadId)) {
        onlineUsers.get(threadId).delete(socket.userId);
        if (onlineUsers.get(threadId).size === 0) {
          onlineUsers.delete(threadId);
        }
        
        // Broadcast updated online users to thread
        const threadOnlineUsers = Array.from(onlineUsers.get(threadId) || []);
        socket.to(`thread:${threadId}`).emit('thread:online-users', {
          threadId,
          onlineUsers: threadOnlineUsers.map(userId => ({
            userId,
            email: connectedUsers.get(userId)?.email || 'Unknown',
            status: connectedUsers.get(userId)?.status || 'offline'
          }))
        });
      }
      
      console.log(`📱 User ${socket.userEmail} left thread room: ${threadId}`);
      
      // Send confirmation to user
      socket.emit('thread:left', { threadId, timestamp: new Date().toISOString() });
      
    } catch (error) {
      console.error(`❌ Error in thread:leave for socket ${socket.id}:`, error);
      socket.emit('error', { message: 'Failed to leave thread room' });
    }
  });
  
  // Enhanced typing indicators with improved reliability and debouncing
  socket.on('typing:start', (data) => {
    try {
      const { threadId, userName } = data;
      
      // Validate input data
      if (!threadId || !socket.userId) {
        console.error(`❌ Invalid typing:start data: threadId=${threadId}, userId=${socket.userId}`);
        return;
      }
      
      // Ensure thread exists in typing users map
      if (!typingUsers.has(threadId)) {
        typingUsers.set(threadId, new Map());
      }
      
      const userTypingKey = `${socket.userId}:${threadId}`;
      const currentTime = Date.now();
      
      // Check if user is already typing (debounce rapid typing events)
      const existingTyping = typingUsers.get(threadId).get(socket.userId);
      if (existingTyping && (currentTime - existingTyping.startTime) < 1000) {
        // User is already typing and it's been less than 1 second, just refresh timeout
        if (typingTimeouts.has(userTypingKey)) {
          clearTimeout(typingTimeouts.get(userTypingKey));
        }
      } else {
        // New typing session or enough time has passed
        // Add/update user typing status
        typingUsers.get(threadId).set(socket.userId, {
          userName: userName || socket.userEmail || 'Unknown User',
          startTime: currentTime,
          socketId: socket.id
        });
        
        // Broadcast to others in the thread (exclude sender)
        socket.to(`thread:${threadId}`).emit('user:typing', {
          userId: socket.userId,
          userName: userName || socket.userEmail || 'Unknown User',
          threadId,
          timestamp: currentTime
        });
        
        console.log(`⌨️ ${socket.userEmail || 'Unknown'} started typing in thread ${threadId}`);
      }
      
      // Clear existing timeout if present
      if (typingTimeouts.has(userTypingKey)) {
        clearTimeout(typingTimeouts.get(userTypingKey));
      }
      
      // Set new auto-cleanup timeout (4 seconds for better UX)
      const timeoutId = setTimeout(() => {
        try {
          if (typingUsers.has(threadId) && typingUsers.get(threadId).has(socket.userId)) {
            const typingData = typingUsers.get(threadId).get(socket.userId);
            typingUsers.get(threadId).delete(socket.userId);
            
            // Clean up empty thread entries
            if (typingUsers.get(threadId).size === 0) {
              typingUsers.delete(threadId);
            }
            
            // Notify others that user stopped typing
            socket.to(`thread:${threadId}`).emit('user:stop-typing', {
              userId: socket.userId,
              userName: typingData.userName,
              threadId,
              timestamp: Date.now()
            });
            
            console.log(`⌨️ Auto-cleanup: ${typingData.userName} stopped typing in thread ${threadId}`);
          }
          
          typingTimeouts.delete(userTypingKey);
        } catch (cleanupError) {
          console.error(`❌ Error in typing cleanup for ${userTypingKey}:`, cleanupError);
          typingTimeouts.delete(userTypingKey);
        }
      }, 4000); // Increased to 4 seconds for better UX
      
      typingTimeouts.set(userTypingKey, timeoutId);
      
    } catch (error) {
      console.error(`❌ Error in typing:start for socket ${socket.id}:`, error);
      socket.emit('error', { message: 'Failed to update typing status' });
    }
  });
  
  socket.on('typing:stop', (data) => {
    try {
      const { threadId } = data;
      
      // Validate input data
      if (!threadId || !socket.userId) {
        console.error(`❌ Invalid typing:stop data: threadId=${threadId}, userId=${socket.userId}`);
        return;
      }
      
      const userTypingKey = `${socket.userId}:${threadId}`;
      
      // Clear timeout if exists
      if (typingTimeouts.has(userTypingKey)) {
        clearTimeout(typingTimeouts.get(userTypingKey));
        typingTimeouts.delete(userTypingKey);
      }
      
      // Remove from typing users if present
      if (typingUsers.has(threadId) && typingUsers.get(threadId).has(socket.userId)) {
        const typingData = typingUsers.get(threadId).get(socket.userId);
        typingUsers.get(threadId).delete(socket.userId);
        
        // Clean up empty thread entries
        if (typingUsers.get(threadId).size === 0) {
          typingUsers.delete(threadId);
        }
        
        // Broadcast to others in the thread (exclude sender)
        socket.to(`thread:${threadId}`).emit('user:stop-typing', {
          userId: socket.userId,
          userName: typingData.userName,
          threadId,
          timestamp: Date.now()
        });
        
        console.log(`⌨️ ${typingData.userName || socket.userEmail} stopped typing in thread ${threadId}`);
      }
      
    } catch (error) {
      console.error(`❌ Error in typing:stop for socket ${socket.id}:`, error);
      socket.emit('error', { message: 'Failed to update typing status' });
    }
  });
  
  // Whiteboard collaboration events
  socket.on('whiteboard:join', (whiteboardId) => {
    socket.join(`whiteboard:${whiteboardId}`);
    console.log(`🎨 User ${socket.userEmail} joined whiteboard: ${whiteboardId}`);
  });
  
  socket.on('whiteboard:leave', (whiteboardId) => {
    socket.leave(`whiteboard:${whiteboardId}`);
    console.log(`🎨 User ${socket.userEmail} left whiteboard: ${whiteboardId}`);
  });
  
  socket.on('whiteboard:drawing', (data) => {
    const { whiteboardId, elements, action } = data;
    // Broadcast drawing updates to all users in the whiteboard room
    socket.to(`whiteboard:${whiteboardId}`).emit('whiteboard:update', {
      whiteboardId,
      elements,
      action,
      author: {
        userId: socket.userId,
        email: socket.userEmail
      }
    });
    console.log(`🎨 Broadcasting drawing update for whiteboard ${whiteboardId}`);
  });
  
  // Enhanced disconnect handling - already handled in the main disconnect event above
  // This section is now managed by the disconnect handler defined earlier
});

app.get("/", (req, res) => res.send("👋 PeerGenius API"));
app.get("/api/health", (req, res) => res.json({ status: "OK", timestamp: new Date().toISOString() }));

// Enhanced route mounting with specific rate limiters
app.use("/api/users", strictLimiter, userRoutes); // Strict limits for user operations
app.use("/api/threads", apiLimiter, threadRoutes);
app.use("/api/thread-categories", apiLimiter, threadCategoryRoutes);
app.use("/api/messages", messageRoutes); // Custom limiter applied per endpoint in routes
app.use("/api/whiteboards", uploadLimiter, whiteboardRoutes); // Upload limits for whiteboards
app.use("/api/ai/tutor", aiLimiter, aiTutorRoutes); // AI-specific limits
app.use("/api/ai/generate", aiLimiter, contentGenerationRoutes); // AI-specific limits
app.use("/api/ai/assist", aiLimiter, intelligentAssistanceRoutes); // AI-specific limits
app.use("/api/analytics", apiLimiter, analyticsRoutes);

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
  console.log(`🔄 Enhanced real-time messaging with typing indicators enabled`);
  console.log(`👥 Online user tracking active`);
  console.log(`🎯 Auto-cleanup mechanisms configured`);
});
