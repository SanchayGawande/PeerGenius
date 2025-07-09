# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React + Vite)

```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Backend (Node.js + Express)

```bash
cd backend
npm run dev      # Start development server with nodemon
npm start        # Start production server
```

## Architecture Overview

This is a full-stack academic assistance platform called **PeerGenius** with AI integration.

### Frontend Architecture

- **Framework**: React 19.1.0 with Vite build tool
- **Styling**: Tailwind CSS with custom PeerGenius theme (purple/blue branding)
- **UI Components**: Radix UI primitives for consistent design
- **State Management**: React Context API (AuthContext, ThreadContext, MessageContext)
- **Routing**: React Router DOM with protected routes
- **Authentication**: Firebase Auth client-side

### Backend Architecture

- **Framework**: Express.js RESTful API
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Firebase Admin SDK for token verification
- **AI Integration**: Groq API with LangChain, OpenAI for academic assistance
- **Models**: User, Thread, Message schemas

### Key Integration Points

- Frontend proxies `/api` calls to backend via Vite config
- Backend serves API endpoints on port 5050
- Firebase UID synchronization between client auth and MongoDB user records
- Authentication middleware protects all API routes

## File Structure Context

### Frontend Structure

- `src/components/`: Reusable UI components
- `src/contexts/`: React Context providers (Auth, Thread, Message)
- `src/pages/`: Route components for different views
- `src/utils/`: Utility functions and helpers
- `src/firebase.js`: Firebase client configuration

### Backend Structure

- `controllers/`: API route handlers and business logic
- `models/`: MongoDB/Mongoose data models
- `routes/`: API route definitions
- `middleware/`: Authentication and validation middleware
- `firebaseAdmin.js`: Firebase Admin SDK setup
- `groqClient.js`: Groq AI API client configuration

## Development Workflow

### Environment Setup

Both frontend and backend require `.env` files with:

- Firebase configuration (API keys, project ID)
- MongoDB connection string
- Groq API key for AI features

### Common Development Tasks

- **API Development**: Add new routes in `backend/routes/`, implement handlers in `backend/controllers/`
- **Frontend Features**: Create components in `src/components/`, add pages in `src/pages/`
- **Authentication**: All backend routes use Firebase middleware, frontend uses AuthContext
- **Database**: Mongoose models in `backend/models/` define data structure
- **AI Integration**: Groq client handles AI-powered academic assistance

### Testing

No specific test commands configured - check with project maintainers for testing approach.

## Key Technologies

- **Frontend**: React, Vite, Tailwind CSS, Radix UI, Firebase Auth, Axios
- **Backend**: Node.js, Express, MongoDB, Mongoose, Firebase Admin, Groq API, LangChain
- **Authentication**: Firebase (client + admin)
- **AI**: Groq API for academic assistance features

1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the [todo.md](http://todo.md/) file with a summary of the changes you made and any other relevant information.

Please check through all the code you just wrote and make sure it follows security best practices. make sure there are no sensitive information in the front and and there are no vulnerabilities that can be exploited
