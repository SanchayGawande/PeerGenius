# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React + Vite)

```bash
cd frontend
npm run dev      # Start development server (http://localhost:5173)
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Backend (Node.js + Express)

```bash
cd backend
npm run dev      # Start with nodemon (http://localhost:5050)
npm start        # Start production server
```

### Full Stack Development

Start both servers in separate terminals:

1. Backend: `cd backend && npm run dev`
2. Frontend: `cd frontend && npm run dev`

## Architecture Overview

### Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS + Radix UI
- **Backend**: Node.js + Express + MongoDB + Socket.IO
- **Authentication**: Firebase Auth
- **AI Integration**: Groq API (LLaMA models)
- **Real-time**: Socket.IO for WebSockets

### Project Structure

```
peergenius/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React Context providers
│   │   ├── pages/           # Route components
│   │   └── hooks/           # Custom React hooks
├── backend/                  # Node.js backend
│   ├── controllers/         # API route handlers
│   ├── models/              # Mongoose schemas
│   ├── routes/              # API route definitions
│   ├── middleware/          # Auth & validation
│   ├── utils/               # Utilities including AI logic
│   └── services/            # Business logic services
```

## Key Components & Systems

### AI Decision Engine

- **Location**: `backend/utils/aiDecisionEngine.js`
- **Purpose**: Intelligent logic for when AI should respond in conversations
- **Solo Mode**: AI responds to everything (personal tutor behavior)
- **Multi-user Mode**: AI responds only to explicit mentions and academic content
- **Functions**: `shouldAIRespond()`, `detectQuestion()`, `detectAcademicIntent()`

### Real-time Features (Socket.IO)

- **Server**: `backend/server.js` (lines 118-351)
- **Events**: `user:join`, `thread:join`, `typing:start`, `typing:stop`, `whiteboard:drawing`
- **Rooms**: Thread-based rooms for isolated communication
- **Features**: Online user tracking, typing indicators, auto-cleanup

### Authentication Flow

- **Firebase Auth**: Frontend authentication
- **JWT Validation**: Backend middleware validates Firebase tokens
- **Protected Routes**: Frontend route protection with `useAuth` hook

### Database Models (MongoDB + Mongoose)

- **Thread**: Discussion threads with public/private visibility
- **Message**: Chat messages with AI response tracking
- **User**: User profiles and authentication data
- **Whiteboard**: Collaborative drawing boards
- **AIInteraction**: AI usage analytics
- **LearningAnalytics**: Student learning metrics

### API Routes Structure

- `/api/threads` - Thread management
- `/api/messages` - Message handling with AI integration
- `/api/users` - User management
- `/api/whiteboards` - Collaborative whiteboards
- `/api/ai/tutor` - AI tutoring endpoints
- `/api/ai/generate` - Content generation
- `/api/ai/assist` - Intelligent assistance
- `/api/analytics` - Learning analytics

## Development Patterns

### Context Providers

The app uses multiple React contexts for state management:

- `AuthContext` - User authentication
- `ThreadContext` - Thread state
- `MessageContext` - Message state
- `SocketContext` - Real-time connections
- `WhiteboardContext` - Collaborative drawing
- `AnalyticsContext` - Learning analytics

### Error Handling

- Backend uses centralized error handling middleware
- Frontend uses React Error Boundaries
- Toast notifications for user feedback

### Rate Limiting

- Development: 300 requests/minute
- Production: 60 requests/minute
- AI endpoints have separate rate limits

## Environment Variables

### Backend (.env)

```
MONGO_URI=mongodb_connection_string
GROQ_API_KEY=groq_api_key
FIREBASE_PROJECT_ID=firebase_project_id
FIREBASE_PRIVATE_KEY=firebase_private_key
FIREBASE_CLIENT_EMAIL=firebase_client_email
PORT=5050
NODE_ENV=development
```

### Frontend (.env)

```
VITE_FIREBASE_API_KEY=firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=messaging_sender_id
VITE_FIREBASE_APP_ID=firebase_app_id
VITE_API_URL=http://localhost:5050
```

## Testing

- No specific test framework configured yet
- Manual testing via browser and API endpoints
- Backend health check: `GET /health`

## Common Development Tasks

### Adding New API Endpoints

1. Create controller in `backend/controllers/`
2. Define routes in `backend/routes/`
3. Add middleware for authentication/validation
4. Mount routes in `backend/server.js`

### Adding New Frontend Components

1. Create component in `frontend/src/components/`
2. Follow existing patterns with Tailwind CSS
3. Use Radix UI for accessible primitives
4. Add to routing in `frontend/src/App.jsx` if needed

### Modifying AI Behavior

- Edit `backend/utils/aiDecisionEngine.js`
- Adjust detection functions for different content types
- Test with solo vs multi-user scenarios

### Real-time Features

- Add Socket.IO events in `backend/server.js`
- Handle events in `frontend/src/contexts/SocketContext.jsx`
- Test with multiple browser windows

## Security Considerations

- Firebase tokens validated on every protected route
- Rate limiting prevents API abuse
- Input validation using express-validator
- CORS configured for frontend-backend communication
- Helmet.js for security headers

1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the [todo.md](http://todo.md/) file with a summary of the changes you made and any other relevant information.

Please check through all the code you just wrote and make sure it follows security best practices. make sure there are no sensitive information in the front and and there are no vulnerabilities that can be exploited

