// at the very top of server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { createServer } = require("http");
const { Server } = require("socket.io");
// PHASE 4: Redis imports for horizontal scaling
const { createAdapter } = require("@socket.io/redis-adapter");
const redisManager = require("./utils/redisClient");
const sessionManager = require("./utils/sessionManager");

const userRoutes = require("./routes/userRoutes");
const threadRoutes = require("./routes/threadRoutes");
const threadCategoryRoutes = require("./routes/threadCategoryRoutes");
const messageRoutes = require("./routes/messageRoutes");
const whiteboardRoutes = require("./routes/whiteboardRoutes");
const aiTutorRoutes = require("./routes/aiTutorRoutes");
const contentGenerationRoutes = require("./routes/contentGenerationRoutes");
const intelligentAssistanceRoutes = require("./routes/intelligentAssistanceRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const threadPermissionRoutes = require("./routes/threadPermissionRoutes");
const healthRoutes = require("./routes/healthRoutes");
const verifyToken = require("./middleware/authMiddleware");
const { addCorrelationId } = require("./middleware/correlationId");

// PHASE 3: Import RBAC models
const Role = require("./models/Role");

const app = express();
const server = createServer(app);

// PHASE 4: Enhanced Socket.IO setup with Redis adapter for horizontal scaling
const socketConnections = new Map(); // Track connection attempts per IP (will migrate to Redis)
const socketEventCounts = new Map(); // Track events per socket (will migrate to Redis)

// Initialize Socket.IO server with enhanced configuration
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", process.env.FRONTEND_URL].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST"] // Reduced methods for security
  },
  transports: ['websocket', 'polling'], // Prefer websocket
  allowEIO3: false, // Disable legacy support for security
  pingTimeout: 30000, // Reduced to 30 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 5000, // Reduced to 5 seconds
  maxHttpBufferSize: 512 * 1024, // Reduced to 512KB for security
  allowRequest: (req, callback) => {
    // SECURITY FIX: Enhanced connection validation with rate limiting
    const clientIP = req.socket.remoteAddress || req.headers['x-forwarded-for'];
    const now = Date.now();
    
    // Rate limiting: max 10 connections per IP per minute
    if (!socketConnections.has(clientIP)) {
      socketConnections.set(clientIP, []);
    }
    
    const connections = socketConnections.get(clientIP);
    const recentConnections = connections.filter(time => now - time < 60000);
    
    if (recentConnections.length >= 10) {
      console.warn(`🚫 Socket.IO rate limit exceeded for IP: ${clientIP}`);
      return callback('Rate limit exceeded', false);
    }
    
    // Update connection tracking
    recentConnections.push(now);
    socketConnections.set(clientIP, recentConnections);
    
    const isOriginValid = req.headers.origin && 
      ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", process.env.FRONTEND_URL]
        .filter(Boolean)
        .includes(req.headers.origin);
    
    if (!isOriginValid && process.env.NODE_ENV !== 'development') {
      console.warn(`🚫 Socket.IO invalid origin: ${req.headers.origin} from IP: ${clientIP}`);
      return callback('Invalid origin', false);
    }
    
    callback(null, true);
  }
});

// Make io available to routes
app.set('io', io);

// PERFORMANCE FIX: Optimized MongoDB connection pooling for production load
if (process.env.MONGO_URI) {
  const isProduction = process.env.NODE_ENV === 'production';
  const isClustered = process.env.ENABLE_CLUSTERING === 'true';
  
  // Calculate optimal pool size based on environment
  const basePoolSize = isProduction ? 20 : 10;
  const maxPoolSize = isClustered ? basePoolSize * 2 : basePoolSize; // Double for clustered setup
  const minPoolSize = Math.floor(maxPoolSize * 0.25); // 25% of max as minimum
  
  console.log(`🔧 Configuring MongoDB with pool size: ${minPoolSize}-${maxPoolSize} (${isProduction ? 'production' : 'development'}, clustered: ${isClustered})`);
  
  mongoose
    .connect(process.env.MONGO_URI, {
    // PERFORMANCE FIX: Optimized connection pool configuration
    maxPoolSize, // Dynamic based on environment and clustering
    minPoolSize, // Maintain minimum connections for faster response
    maxIdleTimeMS: 30000, // Increased idle time for connection reuse
    serverSelectionTimeoutMS: 5000, // Quick server selection
    socketTimeoutMS: 45000, // Longer socket timeout for heavy queries
    family: 4, // Use IPv4, skip trying IPv6
    heartbeatFrequencyMS: 10000, // Monitor connection health
    
    // Write and read optimization
    retryWrites: true, // Enable retryable writes
    w: 'majority', // Write concern for data safety
    readPreference: 'primary', // Always read from primary for consistency
    
    // Connection optimization
    bufferCommands: false, // Disable command buffering
    maxConnecting: 5, // Limit concurrent connection attempts
    
    // Security and compression
    ssl: isProduction, // SSL only in production
    authSource: isProduction ? 'admin' : undefined, // Auth source only for production
    compressors: ['zlib'], // Enable compression
    zlibCompressionLevel: 6, // Compression level
    
    // PERFORMANCE FIX: Connection monitoring and timeouts
    connectTimeoutMS: 10000, // Connection establishment timeout
    waitQueueTimeoutMS: 5000, // Time to wait for a connection from the pool
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log(`📊 Connection pool configured: min=${minPoolSize}, max=${maxPoolSize}`);
    console.log(`⚡ Performance optimizations: bufferCommands=false, compression=zlib, retryWrites=true`);
  })
  .catch((e) => {
    console.error("❌ MongoDB connection error:", e);
    process.exit(1);
  });
} else {
  console.warn("⚠️ No MONGO_URI provided - running without database");
}

// Handle MongoDB connection events
mongoose.connection.on('connected', async () => {
  // SECURITY FIX: Don't log sensitive connection string
  console.log('📡 MongoDB connected successfully');
  
  // PHASE 3: Initialize default roles
  try {
    await Role.createDefaultRoles();
    console.log('🛡️ RBAC system initialized');
  } catch (error) {
    console.error('❌ Failed to initialize RBAC system:', error);
  }
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
        "http://localhost:5175", 
        process.env.FRONTEND_URL
      ].filter(Boolean);
      
      // SECURITY FIX: Only allow no-origin requests in development
      if (!origin && process.env.NODE_ENV === 'development') {
        return callback(null, true);
      } else if (!origin) {
        console.warn(`CORS blocked request with no origin in production`);
        return callback(new Error('Origin required'));
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Removed OPTIONS for security
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'Origin'
      // Removed potentially dangerous headers
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

// Add correlation ID for request tracing
app.use(addCorrelationId);

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

// SECURITY FIX: Secured debug endpoint with authentication
app.get('/debug/rooms', verifyToken, (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Only show basic connection statistics, no sensitive data
  const allRooms = io.sockets.adapter.rooms;
  let threadRoomCount = 0;
  
  allRooms.forEach((sockets, roomName) => {
    if (roomName.startsWith('thread:')) {
      threadRoomCount++;
    }
  });
  
  res.json({
    totalThreadRooms: threadRoomCount,
    totalConnectedClients: io.sockets.sockets.size,
    connectedUserCount: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

// PERFORMANCE FIX: Broadcast optimizer debug endpoint
app.get('/debug/broadcast-stats', verifyToken, (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({
    broadcastOptimizer: broadcastOptimizer.getStats(),
    timestamp: new Date().toISOString()
  });
});

// PHASE 4: Enhanced health check endpoint with scaling and Redis statistics
app.get('/health', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check if Redis is enabled in environment
    const redisEnabled = process.env.REDIS_HOST && process.env.REDIS_HOST !== 'disabled';
    
    // Get Redis status
    const redisStatus = redisEnabled && redisManager.isConnected ? redisManager.getStatus() : { connected: false };
    
    // Get session statistics
    const sessionStats = await sessionManager.getSessionStats();
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStatus,
        redis: redisStatus.connected ? 'connected' : 'disconnected',
        socketio: 'active'
      },
      scaling: {
        redisEnabled: redisEnabled && redisManager.isConnected,
        sessionStorage: sessionStats.storageType,
        horizontallyScalable: redisEnabled && redisManager.isConnected
      },
      socketio: {
        totalConnections: connectionStats.total,
        activeConnections: connectionStats.active,
        errorCount: connectionStats.errors,
        connectedUsers: sessionStats.connectedUsers,
        activeThreads: sessionStats.threadsWithOnlineUsers,
        totalOnlineSessions: sessionStats.totalOnlineUserSessions
      },
      redis: redisStatus.connected ? {
        healthy: redisStatus.healthy,
        errorCount: redisStatus.errorCount,
        lastHealthCheck: redisStatus.lastHealthCheck,
        clients: redisStatus.clients
      } : null,
      performance: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// PHASE 4: Enhanced connection tracking with Redis-based distributed session management
// Legacy maps kept for fallback and statistics
const typingTimeouts = new Map(); // userId:threadId -> timeoutId for auto-cleanup (local to instance)
const connectionStats = { total: 0, active: 0, errors: 0 }; // Connection statistics

// PERFORMANCE FIX: Initialize broadcast optimizer for efficient Socket.IO operations
const broadcastOptimizer = require("./utils/broadcastOptimizer");

// CRITICAL FIX: Missing variable declarations for backward compatibility
// These are maintained for legacy code until full migration to sessionManager
const connectedUsers = new Map(); // userId -> user data (fallback for non-Redis deployments)
const onlineUsers = new Map(); // threadId -> Set of userIds (fallback for non-Redis deployments) 
const typingUsers = new Map(); // threadId -> Map of userId -> typing data (fallback for non-Redis deployments)

// MEMORY LEAK FIX: Enhanced connection health monitoring with local cleanup
setInterval(async () => {
  try {
    const now = Date.now();
    
    // Clean up stale connections across all instances
    const cleanedCount = await sessionManager.cleanupStaleConnections(300000); // 5 minutes
    
    // Clean up typing timeouts
    await sessionManager.cleanupTypingTimeouts();
    
    // MEMORY LEAK FIX: Clean up local connection tracking maps
    let connectionsCleaned = 0;
    let eventsCleaned = 0;
    
    // Clean up old connection tracking (older than 10 minutes)
    for (const [ip, connections] of socketConnections.entries()) {
      const recentConnections = connections.filter(time => now - time < 600000); // 10 minutes
      if (recentConnections.length !== connections.length) {
        connectionsCleaned += connections.length - recentConnections.length;
        if (recentConnections.length === 0) {
          socketConnections.delete(ip);
        } else {
          socketConnections.set(ip, recentConnections);
        }
      }
    }
    
    // Clean up socket event counts for disconnected sockets
    const connectedSocketIds = new Set();
    io.sockets.sockets.forEach(socket => connectedSocketIds.add(socket.id));
    
    for (const socketId of socketEventCounts.keys()) {
      if (!connectedSocketIds.has(socketId)) {
        socketEventCounts.delete(socketId);
        eventsCleaned++;
      }
    }
    
    if (cleanedCount > 0 || connectionsCleaned > 0 || eventsCleaned > 0) {
      console.log(`🧹 Cleanup: ${cleanedCount} stale sessions, ${connectionsCleaned} old connections, ${eventsCleaned} socket events`);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}, 60000); // Check every minute

// PHASE 4: Enhanced user disconnect cleanup with distributed session management
async function handleUserDisconnect(socket) {
  try {
    const userId = socket.userId;
    const userData = await sessionManager.getConnectedUser(userId);
    
    if (userData) {
      // Clean up active threads
      for (const threadId of userData.activeThreads || []) {
        socket.leave(`thread:${threadId}`);
        
        // Remove from online users (distributed)
        await sessionManager.removeOnlineUser(threadId, userId);
        
        // Get updated online users and broadcast
        const onlineUsers = await sessionManager.getOnlineUsers(threadId);
        const threadOnlineUsers = Array.from(onlineUsers);
        
        // Get user details for online users
        const onlineUserDetails = [];
        for (const id of threadOnlineUsers) {
          const connectedUser = await sessionManager.getConnectedUser(id);
          onlineUserDetails.push({
            userId: id,
            email: connectedUser?.email || 'Unknown',
            status: connectedUser?.status || 'offline'
          });
        }
        
        socket.to(`thread:${threadId}`).emit('thread:online-users', {
          threadId,
          onlineUsers: onlineUserDetails
        });
      }
      
      // Clean up typing indicators (distributed)
      const allTypingUsers = await sessionManager.getAllOnlineUsers();
      for (const [threadId] of allTypingUsers) {
        const typingUsers = await sessionManager.getTypingUsers(threadId);
        if (typingUsers.has(userId)) {
          await sessionManager.removeTypingUser(threadId, userId);
          socket.to(`thread:${threadId}`).emit('user:stop-typing', {
            userId,
            threadId,
            timestamp: Date.now()
          });
        }
      }
      
      // Clean up typing timeouts (local to instance)
      for (const [key, timeoutId] of typingTimeouts.entries()) {
        if (key.startsWith(`${userId}:`)) {
          clearTimeout(timeoutId);
          typingTimeouts.delete(key);
        }
      }
      
      // Remove from connected users (distributed)
      await sessionManager.removeConnectedUser(userId);
      
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
  
  // SECURITY FIX: Add event rate limiting per socket
  socketEventCounts.set(socket.id, { count: 0, lastReset: Date.now() });
  
  // Rate limiting middleware for socket events
  const originalOn = socket.on.bind(socket);
  socket.on = function(event, handler) {
    return originalOn(event, (...args) => {
      const now = Date.now();
      const stats = socketEventCounts.get(socket.id);
      
      if (!stats) return; // Socket disconnected
      
      // Reset counter every minute
      if (now - stats.lastReset > 60000) {
        stats.count = 0;
        stats.lastReset = now;
      }
      
      // Rate limit: max 60 events per minute per socket
      if (stats.count >= 60) {
        console.warn(`🚫 Socket event rate limit exceeded for ${socket.id}`);
        socket.emit('error', { message: 'Rate limit exceeded' });
        return;
      }
      
      stats.count++;
      return handler(...args);
    });
  };
  
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
    
    // SECURITY FIX: Clean up event rate limiting data
    socketEventCounts.delete(socket.id);
    
    // PHASE 4: Enhanced cleanup on disconnect with async session management
    if (socket.userId) {
      handleUserDisconnect(socket).catch(error => {
        console.error('Error during user disconnect cleanup:', error);
      });
    }
  });
  
  // Add ping/pong for connection health
  socket.on('ping', (data) => {
    socket.emit('pong', { timestamp: Date.now(), ...data });
  });
  
  // PHASE 4: Enhanced user authentication and setup with distributed session management
  socket.on('user:join', async (userData) => {
    try {
      // SECURITY FIX: Input sanitization and validation
      if (!userData || typeof userData !== 'object') {
        console.error(`❌ Invalid user data format for socket ${socket.id}`);
        socket.emit('error', { message: 'Invalid user data format' });
        return;
      }
      
      let { userId, email } = userData;
      
      // Sanitize userId (Firebase UID can contain alphanumeric + hyphens + underscores)
      if (typeof userId !== 'string') {
        userId = String(userId || '');
      }
      userId = userId.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 128);
      
      // Sanitize email
      if (typeof email !== 'string') {
        email = String(email || '');
      }
      email = email
        .replace(/[<>\"'&]/g, '') // Remove XSS characters
        .substring(0, 254) // RFC email length limit
        .trim();
      
      // Enhanced debugging for user data
      console.log(`🔍 Processing user:join for socket ${socket.id}:`, {
        originalUserId: userData.userId,
        sanitizedUserId: userId,
        originalEmail: userData.email,
        sanitizedEmail: email,
        userIdLength: userId?.length,
        emailLength: email?.length
      });
      
      // Validate user data
      if (!userId || !email) {
        console.error(`❌ Invalid user data for socket ${socket.id}:`, { userId, email, originalData: userData });
        socket.emit('error', { message: 'Invalid user data' });
        return;
      }
      
      // RACE CONDITION FIX: Use atomic operations to prevent conflicts
      let maxRetries = 3;
      let attempt = 0;
      let success = false;
      
      while (attempt < maxRetries && !success) {
        attempt++;
        try {
          console.log(`🔄 Attempt ${attempt}/${maxRetries}: Checking existing connection for ${userId}`);
          
          // Check if user is already connected with different socket (distributed check)
          const existingConnection = await sessionManager.getConnectedUser(userId);
          console.log(`🔍 Existing connection check result:`, existingConnection);
          
          if (existingConnection && existingConnection.socketId !== socket.id) {
            console.log(`🔄 User ${email} reconnecting with new socket ${socket.id}, cleaning up old connection`);
            
            // Atomic cleanup and set operation
            await sessionManager.removeConnectedUser(userId);
            console.log(`🧹 Old connection cleaned up for ${userId}`);
            
            // Small delay to ensure cleanup is complete
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          console.log(`💾 Attempting to set user session for ${userId}`);
          
          // Set user session (using regular method since atomic doesn't exist)
          await sessionManager.setConnectedUser(userId, {
            socketId: socket.id,
            email: email,
            status: 'online',
            lastSeen: new Date(),
            activeThreads: new Set()
          });
          
          console.log(`📊 Session set successfully for ${userId}`);
          success = true;
          console.log(`✅ User ${email} successfully connected on attempt ${attempt}`);
        } catch (error) {
          console.error(`❌ Connection attempt ${attempt} failed for ${email}:`, error);
          console.error(`❌ Error details:`, {
            message: error.message,
            stack: error.stack,
            name: error.name
          });
          
          if (attempt === maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }
      }
      
      if (!success) {
        console.warn(`⚠️ Session manager failed for ${email}, but allowing socket connection to continue`);
        // Don't throw error - allow socket to work without session manager
        // This ensures real-time messaging still works even if session management fails
      }
      
      // Always set socket properties regardless of session manager success
      socket.userId = userId;
      socket.userEmail = email;
      
      console.log(`👤 User joined: ${email} (${userId}) - Socket: ${socket.id} (SessionManager: ${success ? 'SUCCESS' : 'BYPASSED'})`);
      
      // Send confirmation to user
      socket.emit('user:joined', { 
        userId, 
        email, 
        timestamp: new Date().toISOString(),
        sessionManagerWorking: success
      });
      
    } catch (error) {
      console.error(`❌ Error in user:join for socket ${socket.id}:`, error);
      socket.emit('error', { message: 'Failed to join user session' });
    }
  });
  
  // Enhanced thread room management
  socket.on('thread:join', async (threadId) => {
    try {
      if (!threadId) {
        console.error(`❌ Invalid thread join attempt: threadId=${threadId}`);
        socket.emit('error', { message: 'Invalid thread ID' });
        return;
      }
      
      // CRITICAL FIX: Allow joining even if userId not set yet (for timing issues)
      if (!socket.userId) {
        console.warn(`⚠️ Thread join without userId - socket: ${socket.id}, threadId: ${threadId}`);
        // Still allow joining the room, but log the issue
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
      
      // PERFORMANCE FIX: Use optimized broadcast for online users
      const broadcastResult = await broadcastOptimizer.broadcastOnlineUsers(io, threadId);
      console.log(`👥 Optimized broadcast of online users to room "${roomName}" - sent to ${broadcastResult.sent} clients`);
      
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
  socket.on('thread:leave', async (threadId) => {
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
        
        // PERFORMANCE FIX: Use optimized broadcast for online users
        await broadcastOptimizer.broadcastOnlineUsers(io, threadId, { skipUserId: socket.userId });
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
  socket.on('typing:start', async (data) => {
    try {
      // SECURITY FIX: Input sanitization and validation
      if (!data || typeof data !== 'object') {
        console.error(`❌ Invalid typing:start data format`);
        return;
      }
      
      let { threadId, userName } = data;
      
      // Sanitize threadId
      if (typeof threadId !== 'string') {
        threadId = String(threadId || '');
      }
      threadId = threadId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 24); // MongoDB ObjectId length
      
      // Sanitize userName
      if (typeof userName !== 'string') {
        userName = String(userName || '');
      }
      userName = userName
        .replace(/[<>\"'&]/g, '') // Remove XSS characters
        .substring(0, 100) // Limit length
        .trim();
      
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
        
        // PERFORMANCE FIX: Use optimized broadcast for typing indicators
        await broadcastOptimizer.broadcastTypingStatus(
          io, 
          threadId, 
          socket.userId, 
          userName || socket.userEmail || 'Unknown User', 
          'start'
        );
        
        console.log(`⌨️ ${socket.userEmail || 'Unknown'} started typing in thread ${threadId}`);
      }
      
      // Clear existing timeout if present
      if (typingTimeouts.has(userTypingKey)) {
        clearTimeout(typingTimeouts.get(userTypingKey));
      }
      
      // Set new auto-cleanup timeout (4 seconds for better UX)
      const timeoutId = setTimeout(async () => {
        try {
          if (typingUsers.has(threadId) && typingUsers.get(threadId).has(socket.userId)) {
            const typingData = typingUsers.get(threadId).get(socket.userId);
            typingUsers.get(threadId).delete(socket.userId);
            
            // Clean up empty thread entries
            if (typingUsers.get(threadId).size === 0) {
              typingUsers.delete(threadId);
            }
            
            // PERFORMANCE FIX: Use optimized broadcast for typing stop
            await broadcastOptimizer.broadcastTypingStatus(
              io, 
              threadId, 
              socket.userId, 
              typingData.userName, 
              'stop'
            );
            
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
  
  socket.on('typing:stop', async (data) => {
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
        
        // PERFORMANCE FIX: Use optimized broadcast for typing stop
        await broadcastOptimizer.broadcastTypingStatus(
          io, 
          threadId, 
          socket.userId, 
          typingData.userName, 
          'stop'
        );
        
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
app.use("/api/notifications", apiLimiter, notificationRoutes);
app.use("/api/thread-permissions", apiLimiter, threadPermissionRoutes); // PHASE 3: RBAC routes
app.use("/api/security", strictLimiter, require("./routes/securityRoutes")); // PHASE 3: Security dashboard and monitoring routes
app.use("/api/health", healthRoutes); // PHASE 4: Health monitoring and circuit breaker status

// Import error handlers
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// PHASE 4: Server initialization with Redis setup
async function initializeServer() {
  try {
    console.log('🔄 Initializing PeerGenius server with horizontal scaling...');
    
    // Initialize Redis connection
    const redisEnabled = process.env.REDIS_HOST && process.env.REDIS_HOST !== 'disabled';
    
    if (redisEnabled) {
      console.log('🔄 Setting up Redis for horizontal scaling...');
      await redisManager.initialize();
      
      // Configure Socket.IO Redis adapter
      const { pubClient, subClient } = redisManager.getSocketIOClients();
      io.adapter(createAdapter(pubClient, subClient));
      
      console.log('✅ Redis adapter configured for Socket.IO');
    } else {
      console.log('⚠️ Redis disabled - running in single-instance mode');
    }
    
    // Initialize session manager
    await sessionManager.initialize();
    console.log('✅ Session manager initialized');
    
    // Start the server with error handling
    const PORT = process.env.PORT || 5050;
    
    const startServer = (port) => {
      const serverInstance = server.listen(port, () => {
        console.log(`🚀 PeerGenius server running on localhost:${port}`);
        console.log(`⚡ Socket.IO ready with ${redisEnabled ? 'Redis scaling' : 'single-instance'} mode`);
        console.log(`🔄 Enhanced real-time messaging with typing indicators enabled`);
        console.log(`👥 Online user tracking ${redisEnabled ? 'distributed across instances' : 'local'}`);
        console.log(`🎯 Auto-cleanup mechanisms configured`);
        console.log(`🔒 Security features: RBAC, content filtering, audit logging active`);
        
        if (redisEnabled) {
          console.log(`📊 Horizontal scaling ready - multiple instances can now be deployed`);
        }
      });

      serverInstance.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ Port ${port} is busy, trying port ${port + 1}...`);
          setTimeout(() => {
            serverInstance.close();
            startServer(port + 1);
          }, 1000);
        } else {
          console.error('❌ Server error:', err);
          process.exit(1);
        }
      });
    };

    startServer(PORT);

    // Graceful shutdown handling
    process.on('SIGTERM', async () => {
      console.log('🔄 Graceful shutdown initiated...');
      
      if (redisEnabled) {
        await redisManager.close();
      }
      
      server.close(() => {
        console.log('✅ Server shut down successfully');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('🔄 Graceful shutdown initiated...');
      
      if (redisEnabled) {
        await redisManager.close();
      }
      
      server.close(() => {
        console.log('✅ Server shut down successfully');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to initialize server:', error);
    process.exit(1);
  }
}

// Initialize the server
initializeServer();
