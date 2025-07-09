# 🚀 PeerGenius Deployment Guide

## Quick Start (Development)

### 1. Clone Repository
```bash
git clone https://github.com/SanchayGawande/PeerGenius.git
cd PeerGenius
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create environment file
cp .env.example .env
# Configure your environment variables (see below)

npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create environment file  
cp .env.example .env
# Configure your Firebase settings (see below)

npm run dev
```

## Environment Configuration

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/peergenius
GROQ_API_KEY=your_groq_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=your_service_account_email
PORT=5050
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_API_URL=http://localhost:5050
```

## Production Deployment

### Backend (Railway/Heroku)
1. Create new project
2. Connect GitHub repository
3. Set environment variables in dashboard
4. Deploy from main branch

### Frontend (Vercel/Netlify)
1. Import project from GitHub
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables
5. Deploy

## Required Services

1. **MongoDB Atlas** - Database hosting
2. **Firebase** - Authentication 
3. **Groq** - AI API access
4. **GitHub** - Repository hosting

## Features Included

- ✅ Real-time messaging with Socket.IO
- ✅ Intelligent AI responses with context awareness  
- ✅ Public thread discovery with auto-updates
- ✅ Typing indicators
- ✅ Firebase authentication
- ✅ Error handling with auto-retry
- ✅ Rate limiting and security
- ✅ Mobile-responsive design

## Support

- 📧 Issues: [GitHub Issues](https://github.com/SanchayGawande/PeerGenius/issues)
- 📚 Documentation: [README.md](README.md)
- 🔧 Development: [CLAUDE.md](CLAUDE.md)

---
Built with ❤️ using React, Node.js, MongoDB, and AI