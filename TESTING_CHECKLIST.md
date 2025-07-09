# PeerGenius Multi-User Testing Checklist

## 🚀 Pre-Testing Setup
- [ ] Backend server running on port 5050
- [ ] Frontend server running on port 5174
- [ ] MongoDB connected and accessible
- [ ] Groq API key configured
- [ ] Firebase Auth configured

## 👥 User Management Testing
- [ ] Create User 1 account successfully
- [ ] Create User 2 account successfully
- [ ] Both users can login/logout
- [ ] Profile pages load with correct user data
- [ ] Settings persist for each user independently

## 💬 Core Chat Functionality
- [ ] User 1 can create new threads
- [ ] User 2 can see and join available threads
- [ ] Messages appear in real-time for both users
- [ ] Message timestamps are accurate
- [ ] User avatars/names display correctly

## 🤖 AI Integration Testing
- [ ] AI responds to user messages automatically
- [ ] AI responses are contextually relevant
- [ ] AI can handle educational questions
- [ ] AI doesn't respond to every message (check logic)
- [ ] AI responses have proper formatting

## 🔄 Real-time Features
- [ ] Messages appear instantly for both users
- [ ] Typing indicators work (if implemented)
- [ ] Message delivery confirmations
- [ ] Thread participant list updates

## 📊 Statistics & Data
- [ ] Message counts increment correctly
- [ ] Thread participation tracked accurately
- [ ] AI interaction counts update
- [ ] User stats display real numbers

## 🌙 Theme & UI Testing
- [ ] Dark mode works for both users independently
- [ ] Settings save per user account
- [ ] Notifications appear correctly
- [ ] Responsive design works on different screen sizes

## 🚨 Error Scenarios
- [ ] What happens when one user disconnects?
- [ ] How does AI handle inappropriate content?
- [ ] Can users join threads they're already in?
- [ ] Error handling for failed message sends

## 📱 Advanced Testing
- [ ] Multiple threads with same users
- [ ] Long conversation threads
- [ ] Special characters and emojis in messages
- [ ] Very long messages
- [ ] Rapid message sending

## Conversation Test Scenarios

### Scenario 1: Math Study Session
```
User1: "Can someone help me with quadratic equations?"
AI: [Provides quadratic formula and explanation]
User2: "I had the same problem! The AI's explanation is really clear"
User1: "Thanks! Can you give me a practice problem?"
User2: "Try solving: x² + 5x + 6 = 0"
AI: [Shows step-by-step solution if asked]
```

### Scenario 2: Science Discussion
```
User1: "What's the difference between mitosis and meiosis?"
AI: [Explains cell division processes]
User2: "The key difference is that meiosis creates gametes"
User1: "Oh that makes sense! So meiosis is for reproduction?"
AI: [Confirms and adds more detail]
```

### Scenario 3: Group Project Planning
```
User1: "We need to divide up the history presentation"
User2: "I can take the causes of WWI"
User1: "I'll handle the timeline of events"
AI: [Might suggest additional topics or resources]
User2: "Should we meet tomorrow to practice?"
```

## Expected Behavior Notes
- AI should respond to questions but not dominate conversation
- Real-time updates should be near-instantaneous
- Each user should see their own avatar/name correctly
- Thread creation should be restricted to authenticated users
- Message history should persist between sessions