const Message = require("../models/Message");
const axios = require("axios");
const { shouldAIRespond } = require("../utils/aiDecisionEngine");

// 🧠 Intelligent AI Response Logic - Context-Aware Decision Engine
const determineAIResponseNeed = (thread, messageContent) => {
  const participantCount = thread.participants.length;
  
  // Use the new intelligent decision engine
  return shouldAIRespond(messageContent, participantCount);
};

// Get all messages for a thread
const getMessages = async (req, res) => {
  const { threadId } = req.params;
  const { since } = req.query; // For polling - get messages since timestamp
  const userId = req.user.uid;
  
  try {
    // Verify user is participant in thread
    const Thread = require("../models/Thread");
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    let isParticipant = thread.participants.some(p => p.userId === userId);
    
    // Auto-fix: If user is the creator but not in participants, add them
    if (!isParticipant && thread.createdBy === userId) {
      console.log(`Auto-fixing getMessages: Adding thread creator ${userId} (${req.user.email}) to participants`);
      thread.participants.push({
        userId,
        email: req.user.email,
        role: 'owner',
        joinedAt: new Date()
      });
      await thread.save();
      isParticipant = true;
      console.log(`✅ Auto-fix successful: User added to thread ${threadId}`);
    }
    
    if (!isParticipant) {
      console.log(`403 Error: User ${userId} not participant in thread ${threadId}`);
      console.log(`Thread participants:`, thread.participants.map(p => ({ userId: p.userId, email: p.email })));
      return res.status(403).json({ 
        message: "Not authorized to view this thread",
        threadId,
        userId,
        isOwner: thread.createdBy === userId
      });
    }

    // Build query for messages
    let query = { threadId };
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }

    const messages = await Message.find(query).sort({ createdAt: 1 });
    
    // Include thread info and participant list for context
    const response = {
      messages,
      thread: {
        id: thread._id,
        title: thread.title,
        description: thread.description,
        participants: thread.participants,
        messageCount: thread.messageCount,
        lastActivity: thread.lastActivity
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error("Failed to retrieve messages:", error);
    res.status(500).json({ message: "Failed to retrieve messages", error: error.message });
  }
};

// Post a single user message and generate AI response
const postMessage = async (req, res) => {
  const { threadId } = req.params;
  const { content } = req.body;

  const user = req.user;
  const senderName = user?.email || "Anonymous";
  const senderId = user?.uid;

  try {
    // Verify user is participant in thread
    const Thread = require("../models/Thread");
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    let isParticipant = thread.participants.some(p => p.userId === senderId);
    
    // Auto-fix: If user is the creator but not in participants, add them
    if (!isParticipant && thread.createdBy === senderId) {
      console.log(`Auto-fixing postMessage: Adding thread creator ${senderId} to participants`);
      thread.participants.push({
        userId: senderId,
        email: senderName,
        role: 'owner',
        joinedAt: new Date()
      });
      await thread.save();
      isParticipant = true;
    }
    
    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to post in this thread" });
    }

    // Save user message
    const userMessage = await Message.create({
      threadId,
      sender: senderId,
      senderEmail: senderName,
      text: content,
      messageType: 'user'
    });

    // Update thread activity and message count
    await Thread.findByIdAndUpdate(threadId, {
      lastActivity: new Date(),
      $inc: { messageCount: 1 }
    });

    // Check if AI should respond
    const shouldAIRespond = determineAIResponseNeed(thread, content);
    console.log(`🤖 AI Response Decision: ${shouldAIRespond ? 'YES' : 'NO'} for message: "${content.substring(0, 50)}..."`);

    if (!shouldAIRespond) {
      // Return only user message, no AI response
      return res.status(201).json({ userMessage, aiMessage: null });
    }

    // Get conversation context for AI response (last 20 messages for context)
    const messages = await Message.find({ threadId })
      .sort({ createdAt: 1 })
      .limit(20)
      .populate('threadId', 'title description');

    // Build conversation context with proper formatting
    const conversationHistory = messages.map(msg => {
      const role = msg.messageType === 'ai' ? 'assistant' : 'user';
      const sender = msg.messageType === 'ai' ? 'AI Assistant' : msg.senderEmail;
      return {
        role,
        content: `${sender}: ${msg.text}`
      };
    });

    // Generate AI response using Groq with proper conversation format
    try {
      const groqResponse = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content: `You are PeerGenius AI, a helpful educational assistant for students in collaborative study groups. 
              
              Guidelines:
              - Provide clear, educational answers that help students learn
              - Reference the conversation context when relevant
              - Keep responses concise but informative (max 300 words)
              - Encourage collaborative learning and discussion
              - If multiple students are discussing, acknowledge different perspectives
              - Be encouraging and supportive of the learning process
              
              Thread: "${thread.title}"
              ${thread.description ? `Description: "${thread.description}"` : ''}
              Participants: ${thread.participants.length} students`
            },
            ...conversationHistory,
          ],
          max_tokens: 400,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const aiResponse = groqResponse.data.choices[0].message.content;

      // Save AI response
      const aiMessage = await Message.create({
        threadId,
        sender: "ai-assistant",
        senderEmail: "AI Assistant",
        text: aiResponse,
        messageType: 'ai'
      });

      // Update thread activity again for AI message
      await Thread.findByIdAndUpdate(threadId, {
        lastActivity: new Date(),
        $inc: { messageCount: 1 }
      });

      // Return both user message and AI response
      res.status(201).json({ userMessage, aiMessage });
    } catch (aiError) {
      console.error("AI response failed:", aiError);
      // Return user message even if AI fails
      res.status(201).json({ userMessage, aiMessage: null });
    }
  } catch (error) {
    console.error("Message posting failed:", error);
    res.status(500).json({ message: "Failed to post message", error: error.message });
  }
};

// Summarize thread using Groq Llama 3
const summarizeThread = async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user.uid;

  try {
    // Verify user is participant in thread
    const Thread = require("../models/Thread");
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isParticipant = thread.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to summarize this thread" });
    }

    const messages = await Message.find({ threadId }).sort({ createdAt: 1 });
    
    if (messages.length === 0) {
      return res.status(400).json({ message: "No messages to summarize" });
    }

    // Create context using proper message format
    const context = messages
      .map((msg) => {
        const sender = msg.messageType === 'ai' ? 'AI Assistant' : (msg.senderEmail || msg.sender);
        return `${sender}: ${msg.text}`;
      })
      .join("\n");

    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "You are PeerGenius AI, a helpful educational assistant. Create a concise, well-structured summary of the conversation that highlights key learning points, questions discussed, and important insights. Format your response as bullet points for easy reading.",
          },
          {
            role: "user",
            content: `Please summarize the following educational discussion thread titled "${thread.title}":\n\n${context}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiSummary = groqResponse.data.choices[0].message.content;

    // Create summary message with proper schema
    const summaryMessage = await Message.create({
      threadId,
      sender: "ai-assistant",
      senderEmail: "AI Assistant",
      text: aiSummary,
      messageType: 'system'
    });

    // Update thread activity
    await Thread.findByIdAndUpdate(threadId, {
      lastActivity: new Date(),
      $inc: { messageCount: 1 }
    });

    res.status(201).json(summaryMessage);
  } catch (error) {
    console.error("Summary error:", error);
    res
      .status(500)
      .json({ message: "Failed to summarize thread", error: error.message });
  }
};

// Get user message statistics
const getMessageStats = async (req, res) => {
  const userId = req.user.uid;
  
  try {
    // Count total messages sent by user
    const messageCount = await Message.countDocuments({ 
      sender: userId 
    });
    
    // Count AI interactions (messages where user gets AI response)
    const aiInteractions = await Message.countDocuments({ 
      sender: userId,
      messageType: 'user'
    });
    
    res.json({ 
      messageCount, 
      aiInteractions 
    });
  } catch (error) {
    console.error("Failed to get message stats:", error);
    res.status(500).json({ 
      message: "Failed to get message stats", 
      error: error.message 
    });
  }
};

module.exports = { getMessages, postMessage, summarizeThread, getMessageStats };
