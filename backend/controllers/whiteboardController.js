const Whiteboard = require("../models/Whiteboard");
const Thread = require("../models/thread");

// Get all whiteboards for a thread
const getWhiteboards = async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user.uid;

  try {
    // Verify user is participant in thread
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isParticipant = thread.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to view whiteboards for this thread" });
    }

    // Get all active whiteboards for the thread
    const whiteboards = await Whiteboard.find({ 
      threadId, 
      isActive: true 
    }).sort({ lastActivity: -1 });

    res.json({ whiteboards });
  } catch (error) {
    console.error("Get whiteboards failed:", error);
    res.status(500).json({ message: "Failed to retrieve whiteboards" });
  }
};

// Get specific whiteboard with elements
const getWhiteboard = async (req, res) => {
  const { whiteboardId } = req.params;
  const userId = req.user.uid;

  try {
    const whiteboard = await Whiteboard.findById(whiteboardId);
    if (!whiteboard) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }

    // Verify user is participant in thread
    const thread = await Thread.findById(whiteboard.threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isParticipant = thread.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to view this whiteboard" });
    }

    res.json({ whiteboard });
  } catch (error) {
    console.error("Get whiteboard failed:", error);
    res.status(500).json({ message: "Failed to retrieve whiteboard" });
  }
};

// Create new whiteboard
const createWhiteboard = async (req, res) => {
  const { threadId } = req.params;
  const { title, description } = req.body;
  const userId = req.user.uid;
  const userEmail = req.user.email;

  try {
    // Verify user is participant in thread
    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isParticipant = thread.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to create whiteboard for this thread" });
    }

    // Create whiteboard
    const whiteboard = await Whiteboard.create({
      threadId,
      title: title || "New Whiteboard",
      description: description || "",
      createdBy: userId,
      creatorEmail: userEmail,
      collaborators: [{
        userId,
        email: userEmail,
        role: 'editor'
      }],
      elements: []
    });

    // Broadcast new whiteboard to thread
    const io = req.app.get('io');
    if (io) {
      io.to(`thread:${threadId}`).emit('whiteboard-created', {
        whiteboard: {
          _id: whiteboard._id,
          title: whiteboard.title,
          description: whiteboard.description,
          createdBy: whiteboard.createdBy,
          creatorEmail: whiteboard.creatorEmail,
          createdAt: whiteboard.createdAt
        },
        threadId
      });
      console.log(`📡 Broadcasted whiteboard creation to thread:${threadId}`);
    }

    res.status(201).json({ 
      message: "Whiteboard created successfully",
      whiteboard 
    });
  } catch (error) {
    console.error("Create whiteboard failed:", error);
    res.status(500).json({ message: "Failed to create whiteboard" });
  }
};

// Update whiteboard elements (real-time drawing)
const updateWhiteboardElements = async (req, res) => {
  const { whiteboardId } = req.params;
  const { elements, action } = req.body; // action: 'add', 'update', 'delete'
  const userId = req.user.uid;
  const userEmail = req.user.email;

  try {
    const whiteboard = await Whiteboard.findById(whiteboardId);
    if (!whiteboard) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }

    // Verify user is participant in thread
    const thread = await Thread.findById(whiteboard.threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isParticipant = thread.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ message: "Not authorized to edit this whiteboard" });
    }

    // Process elements based on action
    let updatedElements = [...whiteboard.elements];
    
    if (action === 'add') {
      // Add new elements
      const newElements = elements.map(element => ({
        ...element,
        author: { userId, email: userEmail },
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      updatedElements.push(...newElements);
    } else if (action === 'update') {
      // Update existing elements
      elements.forEach(updatedElement => {
        const index = updatedElements.findIndex(el => el.id === updatedElement.id);
        if (index !== -1) {
          updatedElements[index] = {
            ...updatedElements[index],
            ...updatedElement,
            updatedAt: new Date()
          };
        }
      });
    } else if (action === 'delete') {
      // Delete elements
      const elementIds = elements.map(el => el.id);
      updatedElements = updatedElements.filter(el => !elementIds.includes(el.id));
    }

    // Update whiteboard
    whiteboard.elements = updatedElements;
    await whiteboard.save();

    // Broadcast changes to all users in the thread
    const io = req.app.get('io');
    if (io) {
      io.to(`thread:${whiteboard.threadId}`).emit('whiteboard-updated', {
        whiteboardId,
        elements: updatedElements,
        action,
        author: { userId, email: userEmail },
        threadId: whiteboard.threadId
      });
      console.log(`📡 Broadcasted whiteboard update to thread:${whiteboard.threadId}`);
    }

    res.json({ 
      message: "Whiteboard updated successfully",
      elements: updatedElements 
    });
  } catch (error) {
    console.error("Update whiteboard failed:", error);
    res.status(500).json({ message: "Failed to update whiteboard" });
  }
};

// Delete whiteboard
const deleteWhiteboard = async (req, res) => {
  const { whiteboardId } = req.params;
  const userId = req.user.uid;

  try {
    const whiteboard = await Whiteboard.findById(whiteboardId);
    if (!whiteboard) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }

    // Verify user is creator or thread participant with permissions
    const thread = await Thread.findById(whiteboard.threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isCreator = whiteboard.createdBy === userId;
    const isParticipant = thread.participants.some(p => p.userId === userId);
    
    if (!isCreator && !isParticipant) {
      return res.status(403).json({ message: "Not authorized to delete this whiteboard" });
    }

    // Soft delete (mark as inactive)
    whiteboard.isActive = false;
    await whiteboard.save();

    // Broadcast deletion to thread
    const io = req.app.get('io');
    if (io) {
      io.to(`thread:${whiteboard.threadId}`).emit('whiteboard-deleted', {
        whiteboardId,
        threadId: whiteboard.threadId
      });
      console.log(`📡 Broadcasted whiteboard deletion to thread:${whiteboard.threadId}`);
    }

    res.json({ message: "Whiteboard deleted successfully" });
  } catch (error) {
    console.error("Delete whiteboard failed:", error);
    res.status(500).json({ message: "Failed to delete whiteboard" });
  }
};

module.exports = {
  getWhiteboards,
  getWhiteboard,
  createWhiteboard,
  updateWhiteboardElements,
  deleteWhiteboard
};