const Thread = require("../models/Thread");
const { asyncHandler } = require("../middleware/errorHandler");

const createThread = asyncHandler(async (req, res) => {
  const userId = req.user.uid; // From auth middleware
  const userEmail = req.user.email; // From auth middleware
  const { title, description = "", isPublic = false } = req.body;

  console.log(`🔧 Creating thread for user ${userId} (${userEmail}): "${title}", public: ${isPublic}`);

  const newThread = new Thread({ 
    title,
    description,
    createdBy: userId,
    isPublic,
    participants: [{
      userId,
      email: userEmail,
      role: 'owner',
      joinedAt: new Date()
    }],
    lastActivity: new Date(),
    messageCount: 0
  });
  const savedThread = await newThread.save();

  console.log(`✅ Thread created successfully: ${savedThread._id} - "${savedThread.title}", public: ${savedThread.isPublic}`);
  
  // Real-time notification for public threads
  if (isPublic) {
    const io = req.app.get('io');
    if (io) {
      // Broadcast new public thread to all connected clients
      const threadForBroadcast = {
        _id: savedThread._id,
        title: savedThread.title,
        description: savedThread.description,
        memberCount: savedThread.participants.length,
        messageCount: savedThread.messageCount,
        createdAt: savedThread.createdAt,
        lastActivity: savedThread.lastActivity,
        isPublic: savedThread.isPublic,
        createdBy: savedThread.createdBy
      };
      
      io.emit('thread:new-public', threadForBroadcast);
      console.log(`📡 Broadcast new public thread "${savedThread.title}" to all clients`);
    }
  }
  
  res.status(201).json(savedThread);
});

const getThreads = asyncHandler(async (req, res) => {
  const userId = req.user.uid; // From auth middleware
  
  console.log(`🔍 Getting threads for user ${userId} (${req.user.email})`);
  
  // Only return threads where user is a participant
  const threads = await Thread.find({
    "participants.userId": userId
  }).sort({ lastActivity: -1 });
  
  console.log(`📋 Found ${threads.length} threads for user ${userId}:`);
  threads.forEach(thread => {
    console.log(`  - ${thread._id}: "${thread.title}" (public: ${thread.isPublic}, participants: ${thread.participants.length})`);
  });
  
  res.json(threads);
});

// Join a thread
const joinThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user.uid;
  const userEmail = req.user.email;

  const thread = await Thread.findById(threadId);
  if (!thread) {
    return res.status(404).json({ error: "Thread not found" });
  }

  // Check if user is already a participant
  const isParticipant = thread.participants.some(p => p.userId === userId);
  if (isParticipant) {
    return res.status(400).json({ error: "User already in thread" });
  }

  // Add user to participants
  thread.participants.push({
    userId,
    email: userEmail,
    role: 'member',
    joinedAt: new Date()
  });

  await thread.save();
  res.json({ message: "Successfully joined thread", thread });
});

// Leave a thread
const leaveThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user.uid;

  const thread = await Thread.findById(threadId);
  if (!thread) {
    return res.status(404).json({ error: "Thread not found" });
  }

  // Check if user is a participant
  const userParticipant = thread.participants.find(p => p.userId === userId);
  if (!userParticipant) {
    return res.status(400).json({ error: "User is not a participant in this thread" });
  }

  // Prevent thread owner from leaving if there are other participants
  if (userParticipant.role === 'owner' && thread.participants.length > 1) {
    return res.status(400).json({ error: "Thread owner cannot leave while other participants exist. Transfer ownership first." });
  }

  // Remove user from participants
  thread.participants = thread.participants.filter(p => p.userId !== userId);
  
  await thread.save();
  res.json({ message: "Successfully left thread" });
});

// Get public threads (for discovery)
const getPublicThreads = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const userEmail = req.user.email;
  
  console.log(`🌍 Getting public threads for user ${userId} (${userEmail})`);
  
  try {
    // Find public threads where user is NOT already a participant
    const publicThreads = await Thread.find({
      isPublic: true,
      "participants.userId": { $ne: userId }
    })
    .select('title description participants messageCount lastActivity isPublic createdAt createdBy')
    .sort({ createdAt: -1 }) // Sort by creation date (newest first)
    .limit(50) // Increased limit
    .populate('participants', 'email') // Populate participant details if needed
    .lean(); // Use lean for better performance
    
    // Add member count for each thread
    const threadsWithMemberCount = publicThreads.map(thread => ({
      ...thread,
      memberCount: thread.participants ? thread.participants.length : 0,
      messageCount: thread.messageCount || 0
    }));
    
    console.log(`🌍 Found ${threadsWithMemberCount.length} public threads available to join:`);
    threadsWithMemberCount.forEach(thread => {
      console.log(`  - ${thread._id}: "${thread.title}" (members: ${thread.memberCount}, messages: ${thread.messageCount})`);
    });
    
    res.status(200).json({
      success: true,
      count: threadsWithMemberCount.length,
      data: threadsWithMemberCount
    });
    
  } catch (error) {
    console.error(`❌ Error fetching public threads for user ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public threads',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = { createThread, getThreads, joinThread, leaveThread, getPublicThreads };
