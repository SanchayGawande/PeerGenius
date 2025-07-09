const Thread = require("../models/Thread");
const ThreadCategory = require("../models/ThreadCategory");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

const createThread = asyncHandler(async (req, res) => {
  const userId = req.user.uid; // From auth middleware
  const userEmail = req.user.email; // From auth middleware
  const { title, description = "", isPublic = false, category, tags = [] } = req.body;

  console.log(`🔧 Creating thread for user ${userId} (${userEmail}): "${title}", public: ${isPublic}`);

  const newThread = new Thread({ 
    title,
    description,
    createdBy: userId,
    isPublic,
    category: category || null,
    tags: tags || [],
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

// Advanced search threads with filters
const searchThreads = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { 
    query, 
    category, 
    tags, 
    sortBy = 'relevance', 
    page = 1, 
    limit = 20,
    includeOwned = false 
  } = req.query;

  console.log(`🔍 Advanced search for user ${userId}: query="${query}", category="${category}", tags="${tags}"`);

  try {
    const skip = (page - 1) * limit;
    let searchFilter = {
      isPublic: true,
      isArchived: { $ne: true }
    };

    // Exclude threads user is already in (unless includeOwned is true)
    if (!includeOwned) {
      searchFilter["participants.userId"] = { $ne: userId };
    }

    // Category filter
    if (category && category !== 'all') {
      searchFilter.category = category;
    }

    // Tags filter
    if (tags && tags.length > 0) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      searchFilter.tags = { $in: tagArray };
    }

    let threads;
    
    if (query && query.trim()) {
      // Text search
      threads = await Thread.find({
        ...searchFilter,
        $text: { $search: query }
      }, {
        score: { $meta: "textScore" }
      })
      .populate('category', 'name color icon')
      .populate('participants', 'userId email')
      .sort(sortBy === 'relevance' ? { score: { $meta: "textScore" } } : getSortOptions(sortBy))
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    } else {
      // General browse without search query
      threads = await Thread.find(searchFilter)
        .populate('category', 'name color icon')
        .populate('participants', 'userId email')
        .sort(getSortOptions(sortBy))
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    // Add computed fields
    const threadsWithMetrics = threads.map(thread => ({
      ...thread,
      memberCount: thread.participants ? thread.participants.length : 0,
      isJoined: thread.participants?.some(p => p.userId === userId) || false
    }));

    // Get total count for pagination
    const totalCount = await Thread.countDocuments(searchFilter);

    res.json({
      success: true,
      threads: threadsWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('Thread search failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Get recommended threads based on user interests
const getRecommendedThreads = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { limit = 10 } = req.query;

  try {
    // Get user profile to extract interests
    const user = await User.findOne({ uid: userId }).select('profile.interests');
    const userInterests = user?.profile?.interests || [];

    let recommendedThreads = [];

    if (userInterests.length > 0) {
      // Find threads with matching tags/keywords based on user interests
      const interestRegex = new RegExp(userInterests.join('|'), 'i');
      
      recommendedThreads = await Thread.find({
        isPublic: true,
        isArchived: { $ne: true },
        "participants.userId": { $ne: userId },
        $or: [
          { tags: { $regex: interestRegex } },
          { searchKeywords: { $regex: interestRegex } },
          { title: { $regex: interestRegex } },
          { description: { $regex: interestRegex } }
        ]
      })
      .populate('category', 'name color icon')
      .sort({ 'metrics.engagement': -1, lastActivity: -1 })
      .limit(parseInt(limit))
      .lean();
    }

    // If no interest-based recommendations or not enough, fill with popular threads
    if (recommendedThreads.length < limit) {
      const remainingLimit = limit - recommendedThreads.length;
      const existingIds = recommendedThreads.map(t => t._id);
      
      const popularThreads = await Thread.find({
        isPublic: true,
        isArchived: { $ne: true },
        "participants.userId": { $ne: userId },
        _id: { $nin: existingIds }
      })
      .populate('category', 'name color icon')
      .sort({ 'metrics.engagement': -1, 'metrics.views': -1 })
      .limit(remainingLimit)
      .lean();

      recommendedThreads = [...recommendedThreads, ...popularThreads];
    }

    // Add computed fields
    const threadsWithMetrics = recommendedThreads.map(thread => ({
      ...thread,
      memberCount: thread.participants ? thread.participants.length : 0,
      recommendationReason: getRecommendationReason(thread, userInterests)
    }));

    res.json({
      success: true,
      threads: threadsWithMetrics,
      userInterests
    });
  } catch (err) {
    console.error('Get recommended threads failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Get thread statistics and analytics
const getThreadAnalytics = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user.uid;

  try {
    const thread = await Thread.findById(threadId)
      .populate('category', 'name color icon')
      .lean();

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Check if user is a participant (for privacy)
    const isParticipant = thread.participants.some(p => p.userId === userId);
    if (!isParticipant && !thread.isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Track view
    if (isParticipant) {
      await Thread.findByIdAndUpdate(threadId, {
        $inc: { 'metrics.views': 1 },
        $addToSet: {
          'metrics.uniqueViewers': {
            userId,
            viewedAt: new Date()
          }
        }
      });
    }

    const analytics = {
      threadId: thread._id,
      title: thread.title,
      category: thread.category,
      tags: thread.tags,
      metrics: {
        views: thread.metrics?.views || 0,
        uniqueViewers: thread.metrics?.uniqueViewers?.length || 0,
        engagement: thread.metrics?.engagement || 0,
        helpfulnessScore: thread.metrics?.helpfulnessScore || 0
      },
      memberCount: thread.participants.length,
      messageCount: thread.messageCount,
      createdAt: thread.createdAt,
      lastActivity: thread.lastActivity
    };

    res.json({
      success: true,
      analytics
    });
  } catch (err) {
    console.error('Get thread analytics failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Helper functions
function getSortOptions(sortBy) {
  switch (sortBy) {
    case 'newest':
      return { createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    case 'activity':
      return { lastActivity: -1 };
    case 'popular':
      return { 'metrics.engagement': -1, 'metrics.views': -1 };
    case 'members':
      return { 'participants': -1 };
    case 'messages':
      return { messageCount: -1 };
    default:
      return { 'metrics.engagement': -1, lastActivity: -1 };
  }
}

function getRecommendationReason(thread, userInterests) {
  const matchingInterests = userInterests.filter(interest => 
    thread.tags?.some(tag => tag.toLowerCase().includes(interest.toLowerCase())) ||
    thread.title?.toLowerCase().includes(interest.toLowerCase()) ||
    thread.description?.toLowerCase().includes(interest.toLowerCase())
  );

  if (matchingInterests.length > 0) {
    return `Matches your interests: ${matchingInterests.join(', ')}`;
  }
  
  if (thread.metrics?.engagement > 50) {
    return 'Highly engaged community';
  }
  
  if (thread.participants?.length > 10) {
    return 'Active discussion group';
  }
  
  return 'Popular thread';
}

module.exports = { 
  createThread, 
  getThreads, 
  joinThread, 
  leaveThread, 
  getPublicThreads,
  searchThreads,
  getRecommendedThreads,
  getThreadAnalytics
};
