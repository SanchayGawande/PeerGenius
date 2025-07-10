# Fix Threads API & Socket.IO Timeout Issue

## 🚨 Issue Summary

The PeerGenius backend is crashing due to a `TypeError: socket.setTimeout is not a function` when Socket.IO connections are established. Additionally, the `/api/threads/public` endpoint is returning 500 errors, likely due to the server crash interrupting requests.

---

## 🔍 Root Cause Analysis

### 1. Socket.IO setTimeout Error
**Problem**: `socket.setTimeout(30000)` is being called on a Socket.IO socket object at line 379 of `server.js`.

**Why it fails**: Socket.IO sockets are NOT raw TCP sockets. They're WebSocket/polling connections that don't have a `setTimeout` method.

### 2. /api/threads/public 500 Error
**Problem**: The server crashes before completing the API request due to the Socket.IO error, causing the HTTP request to fail with 500 status.

**Secondary issues**: Database queries may lack proper error handling or the schema field names might be incorrect.

---

## ✅ Solution 1: Fix Socket.IO Timeout Issue

### Current Problematic Code (server.js:379):
```js
// ❌ INCORRECT - This crashes the server
io.on('connection', (socket) => {
  socket.setTimeout(30000); // TypeError: socket.setTimeout is not a function
  // ... rest of socket handling
});
```

### Fixed Socket.IO Connection Handler:
```js
// ✅ CORRECT - Safe Socket.IO connection handling
io.on('connection', (socket) => {
  connectionStats.total++;
  connectionStats.active++;
  
  console.log(`🔌 New socket connection: ${socket.id} from ${socket.handshake.address}`);
  console.log(`📊 Connection stats: ${connectionStats.active} active, ${connectionStats.total} total`);
  
  // ✅ CORRECT: Set timeout on the underlying HTTP request socket (if needed)
  if (socket.request && socket.request.socket) {
    socket.request.socket.setTimeout(30000);
  }
  
  // ✅ Alternative: Use Socket.IO's built-in disconnect timeout
  socket.timeout(30000).emit('connection-established', { timestamp: Date.now() });
  
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
    
    // Graceful cleanup on error
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
  
  // Add ping/pong for connection health (built-in Socket.IO feature)
  socket.on('ping', (data) => {
    socket.emit('pong', { timestamp: Date.now(), ...data });
  });
  
  // Rest of your socket event handlers...
  // (user:join, thread:join, typing:start, etc.)
});
```

---

## ✅ Solution 2: Fix /api/threads/public Endpoint

### Check Current Thread Schema
First, verify your Thread model schema to ensure correct field names:

```js
// In backend/models/Thread.js - Check these fields exist:
const threadSchema = new Schema({
  title: String,
  description: String,
  isPublic: Boolean,  // ← Should be 'isPublic', not 'visibility'
  participants: [participantSchema],
  isArchived: { type: Boolean, default: false },
  // ... other fields
});
```

### Fixed Public Threads Route (backend/routes/threadRoutes.js):
```js
// GET /api/threads/public - Enhanced error handling
router.get('/public', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userEmail = req.user.email;
    
    // Input validation
    if (!userId) {
      console.error('❌ No userId in req.user:', req.user);
      return res.status(400).json({ 
        success: false,
        error: 'Invalid user data - missing UID' 
      });
    }
    
    console.log(`🌍 Getting public threads for user ${userId} (${userEmail})`);
    
    // Enhanced query with proper error handling
    const publicThreads = await Thread.find({
      isPublic: true,  // ✅ Correct field name based on schema
      "participants.userId": { $ne: userId }, // Exclude threads user is already in
      isArchived: { $ne: true } // Exclude archived threads
    })
    .populate('category', 'name color icon')
    .sort({ lastActivity: -1, createdAt: -1 })
    .limit(50)
    .lean()
    .catch(error => {
      console.error('❌ Database query failed:', error);
      throw new Error(`Database query failed: ${error.message}`);
    });
    
    // Process results safely
    const threadsWithMetrics = publicThreads.map(thread => {
      try {
        return {
          ...thread,
          memberCount: thread.participants ? thread.participants.length : 0,
          messageCount: thread.messageCount || 0,
          category: thread.category || null,
          tags: thread.tags || [],
          lastActivityFormatted: thread.lastActivity ? new Date(thread.lastActivity).toISOString() : null,
          isActive: thread.lastActivity ? (Date.now() - new Date(thread.lastActivity).getTime()) < (7 * 24 * 60 * 60 * 1000) : false
        };
      } catch (err) {
        console.error(`❌ Error processing thread ${thread._id}:`, err);
        return null;
      }
    }).filter(Boolean); // Remove null entries
    
    console.log(`🌍 Found ${threadsWithMetrics.length} public threads available to join`);
    
    // Success response
    res.status(200).json({
      success: true,
      count: threadsWithMetrics.length,
      data: threadsWithMetrics,
      meta: {
        timestamp: new Date().toISOString(),
        requestedBy: userId
      }
    });
    
  } catch (error) {
    console.error(`❌ Error in /api/threads/public:`, error);
    console.error('❌ Error stack:', error.stack);
    
    // Detailed error response for debugging
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public threads',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});
```

### Alternative: If Schema Uses 'visibility' Field
```js
// If your schema actually uses 'visibility' instead of 'isPublic':
const publicThreads = await Thread.find({
  visibility: 'public',  // ← Use this if schema has visibility field
  "participants.userId": { $ne: userId },
  isArchived: { $ne: true }
});
```

---

## ✅ Solution 3: Enhanced Server Configuration

### Safe HTTP Server Timeout (if needed):
```js
// In server.js - Apply timeout to HTTP server, not Socket.IO
const server = createServer(app);

// ✅ CORRECT: Set timeout on HTTP server
server.setTimeout(30000); // 30 seconds

// ✅ CORRECT: Set timeout on individual HTTP connections
server.on('connection', (socket) => {
  socket.setTimeout(30000);
  console.log('🔗 HTTP connection established with 30s timeout');
});

// Socket.IO setup (without problematic setTimeout)
const io = new Server(server, {
  cors: { /* your CORS config */ },
  pingTimeout: 60000,  // ✅ Use Socket.IO's built-in timeout
  pingInterval: 25000,
  upgradeTimeout: 10000
});
```

---

## 🔧 Step-by-Step Implementation

### Step 1: Fix Socket.IO Error
1. Open `backend/server.js`
2. Find line 379 with `socket.setTimeout(30000)`
3. Replace the entire Socket.IO connection handler with the safe version above

### Step 2: Fix Public Threads Route
1. Open `backend/routes/threadRoutes.js`
2. Find the `/public` route
3. Replace with the enhanced error handling version above
4. Verify your Thread schema uses `isPublic` field (or adjust query accordingly)

### Step 3: Test the Fix
1. Restart your backend server: `npm run dev`
2. Test Socket.IO connection (should not crash)
3. Test API endpoint: `curl http://localhost:5050/api/threads/public`
4. Frontend should now successfully fetch: `axios.get('/api/threads/public')`

---

## 🧪 Testing & Verification

### Backend Health Check:
```bash
# Test server health
curl http://localhost:5050/health

# Test public threads endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5050/api/threads/public
```

### Frontend Test:
```js
// This should now work without 500 errors
try {
  const response = await axios.get('/api/threads/public');
  console.log('✅ Public threads:', response.data);
} catch (error) {
  console.error('❌ API Error:', error.response?.data);
}
```

### Socket.IO Connection Test:
```js
// Open browser console on frontend and check for:
// "🔌 New socket connection: [ID] from 127.0.0.1"
// Should NOT see "TypeError: socket.setTimeout is not a function"
```

---

## 📝 Summary of Changes

1. **Removed** `socket.setTimeout()` call on Socket.IO socket
2. **Added** proper timeout handling using Socket.IO's built-in features
3. **Enhanced** `/api/threads/public` route with comprehensive error handling
4. **Added** input validation and detailed error logging
5. **Ensured** database queries use correct schema field names
6. **Implemented** safe error responses that don't crash the server

These changes will resolve both the Socket.IO crash and the 500 errors on the public threads endpoint.

---

## 🔄 Update Known Errors Log

Add this resolved issue to your `known-errors.md`:

```markdown
### ❌ Error Signature
TypeError: socket.setTimeout is not a function at Socket.IO connection

### 🧠 Root Cause
Calling setTimeout on Socket.IO socket object which doesn't support this method

### ✅ Solution
Use Socket.IO built-in timeout or apply to underlying HTTP request socket

### 🔁 Recurrence
When mixing HTTP socket methods with Socket.IO socket objects
```