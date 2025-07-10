# PeerGenius Known Errors & Solutions

> **A persistent reference log for debugging PeerGenius full-stack issues**
> 
> This file documents recurring errors, their root causes, and proven solutions to streamline debugging and avoid redundant troubleshooting.

---

## 🚨 Backend Server Errors

### ❌ Error Signature
```
TypeError: socket.setTimeout is not a function  
at Namespace.<anonymous> (server.js:379:10)
```

### 🧠 Root Cause
Attempting to call `.setTimeout()` on a Socket.IO socket object, which is not a standard TCP socket.

### ✅ Solution
**FIXED**: Applied timeout to the underlying HTTP request socket instead:
```js
// ❌ BEFORE (crashes):
socket.setTimeout(30000);

// ✅ AFTER (works):
if (socket.request && socket.request.socket) {
  socket.request.socket.setTimeout(30000);
}
```
Avoid setting timeout directly on Socket.IO socket objects.

### 🔁 Recurrence
This issue may come up when mistakenly treating WebSocket connections as raw HTTP sockets in the real-time chat module or during middleware upgrades.

**Status**: ✅ RESOLVED - Backend now starts without Socket.IO crashes

---

### ❌ Error Signature
```
Error: listen EADDRINUSE: address already in use 127.0.0.1:5050
    at Server.setupListenHandle [as _listen2] (node:net:1940:16)
```

### 🧠 Root Cause
Multiple instances of the backend server trying to bind to the same port (5050), typically from previous development sessions not properly terminated.

### ✅ Solution
Kill existing processes using the port:
```bash
sudo lsof -ti:5050 | xargs kill -9
# or
pkill -f "node server.js"
```
Then restart the server with `npm run dev`.

### 🔁 Recurrence
Common during development when restarting servers frequently. Consider using process managers like PM2 for production or nodemon's built-in restart capabilities.

---

### ❌ Error Signature
```
MongoParseError: option buffermaxentries is not supported
    at parseOptions (/backend/node_modules/mongodb/lib/connection_string.js:278:15)
```

### 🧠 Root Cause
Using deprecated MongoDB connection options (`bufferMaxEntries` and `bufferCommands`) that are no longer supported in newer MongoDB driver versions.

### ✅ Solution
Remove deprecated options from mongoose connection in `server.js`:
```js
// Remove these lines:
// bufferMaxEntries: 0,
// bufferCommands: false,

// Keep only supported options:
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  maxIdleTimeMS: 30000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  w: 'majority'
});
```

### 🔁 Recurrence
Occurs when upgrading MongoDB driver versions or copying connection configs from older tutorials.

---

### ❌ Error Signature
```
SyntaxError: Missing catch or finally after try
    at wrapSafe (node:internal/modules/cjs/loader:1662:18)
```

### 🧠 Root Cause
Incomplete try-catch blocks in async functions, typically missing the catch clause in controller functions using `asyncHandler`.

### ✅ Solution
Ensure all try blocks have corresponding catch blocks:
```js
// Before (incorrect):
const someFunction = asyncHandler(async (req, res) => {
  try {
    // some code
  }
  res.json({ success: true });
});

// After (correct):
const someFunction = asyncHandler(async (req, res) => {
  try {
    // some code
    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});
```

### 🔁 Recurrence
Common when adding new controller functions or modifying existing ones without proper error handling structure.

---

## 🌐 Frontend Connection Errors

### ❌ Error Signature
```
This site can't be reached
localhost refused to connect.
ERR_CONNECTION_REFUSED
```

### 🧠 Root Cause
Frontend Vite development server not running or crashed, typically due to process termination or port conflicts.

### ✅ Solution
1. Check if Vite process is running: `ps aux | grep vite`
2. Restart frontend server:
```bash
cd frontend
npm run dev
```
3. If port conflicts, use alternative port:
```bash
npm run dev -- --port 3000
```

### 🔁 Recurrence
Happens when development servers are stopped accidentally or system restarts. Always verify both frontend and backend servers are running before testing.

---

## 🔗 API Integration Errors

### ❌ Error Signature
```
CORS policy: Cross origin requests are only supported for protocol schemes: http, https, chrome-extension, safari-extension.
```

### 🧠 Root Cause
CORS configuration not properly set up for frontend-backend communication, or incorrect origin URLs.

### ✅ Solution
Update CORS configuration in `server.js`:
```js
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://localhost:5174", 
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

### 🔁 Recurrence
Occurs when changing development ports, deploying to new environments, or updating frontend/backend URLs.

---

## 🤖 AI Service Errors

### ❌ Error Signature
```
GroqAPIError: Rate limit exceeded
Status: 429
```

### 🧠 Root Cause
Exceeding Groq API rate limits during testing or high-volume usage.

### ✅ Solution
Implement rate limiting and retry logic in `groqService.js`:
```js
async makeRequest(payload, retryCount = 0) {
  const maxRetries = 3;
  try {
    return await this.groq.chat.completions.create(payload);
  } catch (error) {
    if (error.status === 429 && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.makeRequest(payload, retryCount + 1);
    }
    throw error;
  }
}
```

### 🔁 Recurrence
Common during development with frequent AI interactions or load testing. Monitor API usage and implement proper rate limiting.

---

## 🔐 Authentication Errors

### ❌ Error Signature
```
Error: Authentication required
Firebase token validation failed
```

### 🧠 Root Cause
Firebase authentication token expired or not properly included in API requests.

### ✅ Solution
Implement token refresh logic in `AuthContext.jsx`:
```js
const refreshToken = async (retryCount = 0) => {
  const maxRetries = 3;
  try {
    if (user) {
      const token = await user.getIdToken(true);
      localStorage.setItem('authToken', token);
      return token;
    }
  } catch (error) {
    if (retryCount < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return refreshToken(retryCount + 1);
    }
    throw error;
  }
};
```

### 🔁 Recurrence
Happens during long user sessions or when Firebase tokens expire. Implement automatic token refresh mechanisms.

---

## 📊 Database Errors

### ❌ Error Signature
```
Warning: Duplicate schema index on {"name":1} found
```

### 🧠 Root Cause
Declaring indexes both in schema definition (with `index: true`) and separately using `schema.index()`.

### ✅ Solution
Choose one indexing method. Remove duplicate declarations:
```js
// Either use schema field options:
const schema = new Schema({
  name: { type: String, index: true }
});

// OR use separate index declarations:
const schema = new Schema({
  name: String
});
schema.index({ name: 1 });

// Don't use both!
```

### 🔁 Recurrence
Common when copying schema patterns or adding indexes without checking existing field options.

---

## 🔄 Real-time Features Errors

### ❌ Error Signature
```
Socket.IO connection timeout
Transport: polling, websocket
```

### 🧠 Root Cause
Socket.IO connection failing due to firewall, proxy, or configuration issues.

### ✅ Solution
Update Socket.IO configuration with fallback options:
```js
const io = new Server(server, {
  cors: { /* cors config */ },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000
});
```

### 🔁 Recurrence
Occurs in restrictive network environments or when WebSocket connections are blocked. Always configure polling as fallback.

---

## 📝 File Upload Errors

### ❌ Error Signature
```
MulterError: File too large
LIMIT_FILE_SIZE
```

### 🧠 Root Cause
Uploaded files exceeding the configured size limit in multer middleware.

### ✅ Solution
Adjust file size limits in `upload.js` middleware:
```js
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    // Add file type validation
  }
});
```

### 🔁 Recurrence
Happens when users try to upload large files. Consider implementing client-side file size validation and user feedback.

---

## 🔧 Development Environment Errors

### ❌ Error Signature
```
MODULE_NOT_FOUND: Cannot find module './some-file'
```

### 🧠 Root Cause
Incorrect file paths, missing dependencies, or case sensitivity issues in imports.

### ✅ Solution
1. Check file paths and case sensitivity
2. Verify module installation: `npm install missing-module`
3. Use absolute imports or properly configured path aliases
4. Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### 🔁 Recurrence
Common when moving files, changing project structure, or working across different operating systems.

---

## 📚 How to Use This File

1. **Search**: Use Ctrl/Cmd+F to quickly find error signatures
2. **Add New Errors**: Follow the template structure when documenting new issues
3. **Update Solutions**: Modify existing entries when better solutions are found
4. **Version Control**: Keep this file in git to track debugging improvements over time

## 🔄 Last Updated
Created: July 2025
Last Modified: July 2025

---

*This file is a living document. Add new errors as they occur and update solutions based on what works best for PeerGenius.*