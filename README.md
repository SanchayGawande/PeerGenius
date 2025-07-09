# 🧠 PeerGenius

**AI-Powered Student Collaboration Platform**

PeerGenius is a modern, real-time collaborative learning platform that combines the power of AI with peer-to-peer interaction to enhance student learning experiences.

![PeerGenius Demo](https://via.placeholder.com/800x400/6366f1/ffffff?text=PeerGenius+AI+Learning+Platform)

## ✨ Features

### 🤖 **Intelligent AI Integration**
- **Context-Aware AI Responses** - AI understands when to participate in conversations
- **Smart Response Logic** - Different behavior for solo vs. group study sessions
- **Academic Focus** - AI responds to educational queries and explicit mentions
- **Groq-Powered** - Lightning-fast AI responses using Groq's LLaMA model

### 👥 **Real-Time Collaboration**
- **Live Typing Indicators** - See when others are typing in real-time
- **Instant Thread Updates** - New public threads appear automatically
- **Socket.IO Integration** - Seamless real-time communication
- **Multi-User Support** - Collaborate with multiple students simultaneously

### 🌍 **Thread Management**
- **Public Thread Discovery** - Find and join study groups
- **Private Study Sessions** - Create private threads for focused study
- **Thread Joining/Leaving** - Flexible participation management
- **Auto-Refresh** - Public threads update without manual refresh

### 🔐 **Security & Authentication**
- **Firebase Authentication** - Secure user management
- **JWT Token Validation** - Protected API endpoints
- **Role-Based Access** - Owner and member permissions
- **Data Privacy** - User data protection and isolation

## 🚀 Tech Stack

### **Frontend**
- **React 19** - Modern React with latest features
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first styling with custom theme
- **Radix UI** - Accessible, unstyled UI primitives
- **Socket.IO Client** - Real-time communication
- **React Router** - Client-side routing
- **Axios** - HTTP client with interceptors

### **Backend**
- **Node.js + Express** - RESTful API server
- **Socket.IO** - Real-time WebSocket communication
- **MongoDB + Mongoose** - NoSQL database with ODM
- **Firebase Admin** - Server-side authentication
- **Groq API** - AI model integration
- **Express Rate Limiting** - API protection

### **AI & External Services**
- **Groq API** - Fast AI inference with LLaMA models
- **Firebase Auth** - User authentication and management
- **MongoDB Atlas** - Cloud database hosting

## 📁 Project Structure

```
peerGenius/
├── 📂 frontend/                 # React Vite Frontend
│   ├── 📂 src/
│   │   ├── 📂 components/       # Reusable UI components
│   │   ├── 📂 contexts/         # React Context providers
│   │   ├── 📂 pages/           # Route components
│   │   ├── 📂 utils/           # Helper functions
│   │   └── 📄 main.jsx         # App entry point
│   ├── 📄 package.json         # Frontend dependencies
│   └── 📄 vite.config.js       # Vite configuration
│
├── 📂 backend/                  # Node.js Express Backend
│   ├── 📂 controllers/         # API route handlers
│   ├── 📂 models/              # Mongoose data models
│   ├── 📂 routes/              # API route definitions
│   ├── 📂 middleware/          # Auth and validation
│   ├── 📂 utils/               # Backend utilities
│   ├── 📄 server.js            # Server entry point
│   └── 📄 package.json         # Backend dependencies
│
├── 📄 README.md                # Project documentation
├── 📄 CLAUDE.md                # Development instructions
└── 📄 .gitignore              # Git ignore rules
```

## 🛠️ Installation & Setup

### **Prerequisites**
- Node.js 18+ 
- MongoDB database
- Firebase project
- Groq API key

### **1. Clone the Repository**
```bash
git clone https://github.com/SanchayGawande/PeerGenius.git
cd PeerGenius
```

### **2. Backend Setup**
```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your configuration
```

**Backend Environment Variables:**
```env
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
PORT=5050
NODE_ENV=development
```

### **3. Frontend Setup**
```bash
cd frontend
npm install

# Create environment file
cp .env.example .env
# Edit .env with your Firebase config
```

**Frontend Environment Variables:**
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_API_URL=http://localhost:5050
```

### **4. Start Development Servers**

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access the Application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5050

## 🔧 Development Commands

### **Frontend Commands**
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### **Backend Commands**
```bash
npm run dev      # Start with nodemon
npm start        # Start production server
```

## 🧪 AI Response Logic

PeerGenius features intelligent AI response logic that adapts to different conversation contexts:

### **Solo Mode (1 participant)**
- AI responds to **everything**
- Perfect for individual study sessions
- Full AI assistance available

### **Multi-User Mode (2+ participants)**
- AI responds **only** when:
  - **Explicitly mentioned**: "AI, can you help?"
  - **Academic questions**: "What is the derivative of x²?"
  - **Educational requests**: "Explain photosynthesis"

### **Blocked in Multi-User**
- Casual conversation: "How are you?"
- Personal updates: "My dad is feeling better"
- Social chat: "Thanks everyone"

## 🌐 Real-Time Features

### **Socket.IO Integration**
- **Typing Indicators**: See when others are typing
- **Public Thread Updates**: Auto-refresh when new threads are created
- **Thread Room Management**: Join/leave notifications
- **Connection Management**: Auto-reconnection and error handling

### **Real-Time Events**
- `thread:new-public` - New public thread created
- `user:typing` - User started typing
- `user:stop-typing` - User stopped typing
- `thread:join` - Join thread room
- `thread:leave` - Leave thread room

## 🔒 Security Features

- **Firebase Authentication** - Secure user management
- **JWT Token Validation** - Protected API endpoints
- **Rate Limiting** - API abuse prevention
- **Input Validation** - Sanitized user inputs
- **CORS Protection** - Cross-origin request security
- **Environment Variables** - Sensitive data protection

## 🚀 Deployment

### **Frontend (Vercel/Netlify)**
```bash
cd frontend
npm run build
# Deploy the dist/ folder
```

### **Backend (Railway/Heroku)**
```bash
cd backend
# Set environment variables
# Deploy with your preferred platform
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Groq** - For providing fast AI inference
- **Firebase** - For authentication and real-time database
- **MongoDB** - For flexible document storage
- **Socket.IO** - For real-time communication
- **Tailwind CSS** - For beautiful, responsive design

## 📞 Support

If you have any questions or need help, please:
- 📧 Email: sanchay.gawande@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/SanchayGawande/PeerGenius/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/SanchayGawande/PeerGenius/discussions)

---

**Built with ❤️ by Sanchay Gawande**