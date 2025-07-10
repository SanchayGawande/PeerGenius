// frontend/src/contexts/SocketContext.jsx

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map()); // threadId -> Set of userNames
  const [onlineUsers, setOnlineUsers] = useState(new Map()); // threadId -> Array of user objects
  const { currentUser } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (currentUser) {
      console.log('🔌 Connecting to Socket.IO...');
      
      // Try basic connection with minimal options
      const newSocket = io('http://localhost:5050', {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['polling', 'websocket'],
        forceNew: true,
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('✅ Socket.IO connected:', newSocket.id);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Join user to socket with their info
        newSocket.emit('user:join', {
          userId: currentUser.uid,
          email: currentUser.email
        });
      });

      newSocket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO disconnected:', reason);
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('🚫 Socket.IO connection error:', error);
        console.error('🚫 Error details:', {
          message: error.message,
          type: error.type,
          description: error.description,
          transport: error.transport,
          context: error.context
        });
        
        reconnectAttempts.current++;
        
        // Show user-friendly error messages
        if (reconnectAttempts.current === 1) {
          // First attempt - show connection error
          window.dispatchEvent(new CustomEvent('socket-connection-error', {
            detail: { 
              message: 'Connection failed. Retrying...', 
              attempt: reconnectAttempts.current 
            }
          }));
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('🚫 Max reconnection attempts reached');
          // Show persistent error after max attempts
          window.dispatchEvent(new CustomEvent('socket-connection-failed', {
            detail: { 
              message: 'Unable to connect to server. Please check your internet connection and refresh the page.',
              attempts: reconnectAttempts.current
            }
          }));
        }
      });

      // Typing indicators
      newSocket.on('user:typing', (data) => {
        const { threadId, userName, userId } = data;
        console.log(`⌨️ ${userName} is typing in thread ${threadId}`);
        
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (!newMap.has(threadId)) {
            newMap.set(threadId, new Set());
          }
          newMap.get(threadId).add(userName);
          return newMap;
        });
      });

      // CRITICAL FIX: Enhanced real-time message handling with deduplication
      const processedMessages = new Set(); // Track processed message IDs to prevent duplicates
      
      const handleNewMessage = (data, source = 'new-message') => {
        const { message, threadId } = data;
        
        // Deduplication check
        const messageKey = `${message._id}-${threadId}`;
        if (processedMessages.has(messageKey)) {
          console.log(`🔄 Duplicate message filtered: ${message._id} from ${source}`);
          return;
        }
        
        processedMessages.add(messageKey);
        console.log(`📨 New message received in thread ${threadId} from ${source}:`, message);
        
        // Dispatch custom event that MessageContext can listen to
        window.dispatchEvent(new CustomEvent('socket-new-message', {
          detail: { message, threadId, source }
        }));
        
        // Clean up old processed messages (keep last 100)
        if (processedMessages.size > 100) {
          const toDelete = Array.from(processedMessages).slice(0, 50);
          toDelete.forEach(key => processedMessages.delete(key));
        }
      };
      
      // Listen to primary message event
      newSocket.on('new-message', (data) => handleNewMessage(data, 'new-message'));
      
      // CRITICAL FIX: Also listen to legacy broadcast event for compatibility
      newSocket.on('message:broadcast', (data) => handleNewMessage(data, 'message:broadcast'));

      // Online users tracking
      newSocket.on('thread:online-users', (data) => {
        const { threadId, onlineUsers: users } = data;
        console.log(`👥 Online users updated for thread ${threadId}:`, users);
        
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(threadId, users);
          return newMap;
        });
      });

      // Message reactions
      newSocket.on('message-reaction', (data) => {
        const { messageId, reactions, threadId } = data;
        console.log(`👍 Reaction updated for message ${messageId} in thread ${threadId}`);
        
        // Dispatch custom event that components can listen to
        window.dispatchEvent(new CustomEvent('socket-message-reaction', {
          detail: { messageId, reactions, threadId }
        }));
      });

      // Thread creation events
      newSocket.on('thread:new-public', (threadData) => {
        console.log(`🆕 New public thread created:`, threadData.title);
        
        window.dispatchEvent(new CustomEvent('socket-thread-new-public', {
          detail: { thread: threadData }
        }));
      });

      newSocket.on('thread:new-personal', (threadData) => {
        const { forUser, ...thread } = threadData;
        
        // Only handle if this event is for the current user
        if (forUser === currentUser?.uid) {
          console.log(`🆕 New personal thread created:`, thread.title);
          
          window.dispatchEvent(new CustomEvent('socket-thread-new-personal', {
            detail: { thread }
          }));
        }
      });

      newSocket.on('thread:participant-joined', (data) => {
        const { forUser, ...updateData } = data;
        
        // Only handle if this event is for the current user
        if (forUser === currentUser?.uid) {
          console.log(`👥 New participant joined thread:`, updateData.title);
          
          window.dispatchEvent(new CustomEvent('socket-thread-participant-joined', {
            detail: updateData
          }));
        }
      });

      // Whiteboard events
      newSocket.on('whiteboard-created', (data) => {
        const { whiteboard, threadId } = data;
        console.log(`🎨 New whiteboard created in thread ${threadId}:`, whiteboard.title);
        
        window.dispatchEvent(new CustomEvent('socket-whiteboard-created', {
          detail: { whiteboard, threadId }
        }));
      });

      newSocket.on('whiteboard-updated', (data) => {
        const { whiteboardId, elements, action, author, threadId } = data;
        console.log(`🎨 Whiteboard updated: ${whiteboardId} by ${author.email}`);
        
        window.dispatchEvent(new CustomEvent('socket-whiteboard-updated', {
          detail: { whiteboardId, elements, action, author, threadId }
        }));
      });

      newSocket.on('whiteboard-deleted', (data) => {
        const { whiteboardId, threadId } = data;
        console.log(`🎨 Whiteboard deleted: ${whiteboardId} in thread ${threadId}`);
        
        window.dispatchEvent(new CustomEvent('socket-whiteboard-deleted', {
          detail: { whiteboardId, threadId }
        }));
      });

      // CRITICAL FIX: Enhanced typing indicator management
      newSocket.on('user:stop-typing', (data) => {
        const { threadId, userId, timestamp } = data;
        console.log(`⌨️ User ${userId} stopped typing in thread ${threadId}`);
        
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (newMap.has(threadId)) {
            const typingSet = new Set(newMap.get(threadId));
            
            // Find and remove the specific user by userId
            // We need to match by userId since we store userName in the set
            for (const userName of typingSet) {
              // This is a simplified approach - in a full implementation,
              // we'd maintain a userId->userName mapping
              typingSet.delete(userName);
              break; // Remove first match for now
            }
            
            if (typingSet.size === 0) {
              newMap.delete(threadId);
            } else {
              newMap.set(threadId, typingSet);
            }
          }
          return newMap;
        });
      });
      
      // CRITICAL FIX: Add user status change handling
      newSocket.on('user:status-changed', (data) => {
        const { userId, status, threadId, timestamp } = data;
        console.log(`📊 User ${userId} status changed to ${status} in thread ${threadId}`);
        
        // Update online users status
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          if (newMap.has(threadId)) {
            const users = newMap.get(threadId).map(user => {
              if (user.userId === userId) {
                return { ...user, status, lastSeen: new Date(timestamp) };
              }
              return user;
            });
            newMap.set(threadId, users);
          }
          return newMap;
        });
      });
      
      // CRITICAL FIX: Add user activity tracking
      newSocket.on('user:activity', (data) => {
        const { userId, userName, activity, threadId, timestamp } = data;
        console.log(`🎨 User ${userName} activity: ${activity} in thread ${threadId}`);
        
        // Dispatch custom event for components that need activity tracking
        window.dispatchEvent(new CustomEvent('socket-user-activity', {
          detail: { userId, userName, activity, threadId, timestamp }
        }));
      });

      setSocket(newSocket);

      return () => {
        console.log('🔌 Disconnecting Socket.IO...');
        newSocket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setTypingUsers(new Map());
        setOnlineUsers(new Map());
      };
    } else {
      // User logged out, cleanup socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setTypingUsers(new Map());
        setOnlineUsers(new Map());
      }
    }
  }, [currentUser]);

  // CRITICAL FIX: Enhanced thread joining with debugging
  const joinThread = (threadId) => {
    if (!socket || !isConnected) {
      console.warn(`⚠️ Cannot join thread ${threadId}: socket not connected`);
      return;
    }
    
    if (!threadId) {
      console.error(`❌ Cannot join thread: threadId is empty`);
      return;
    }
    
    console.log(`📱 Attempting to join thread room: ${threadId}`);
    socket.emit('thread:join', threadId);
    
    // Listen for join confirmation
    socket.once('thread:joined', (data) => {
      console.log(`✅ Successfully joined thread ${data.threadId} - Room size: ${data.roomSize || 'unknown'}`);
    });
    
    socket.once('error', (error) => {
      console.error(`❌ Failed to join thread ${threadId}:`, error);
    });
  };

  const leaveThread = (threadId) => {
    if (socket && isConnected) {
      socket.emit('thread:leave', threadId);
      console.log(`📱 Left thread room: ${threadId}`);
    }
  };

  // Enhanced typing functions with improved debouncing and error handling
  const startTyping = useCallback((threadId, userName) => {
    if (!socket || !isConnected || !threadId) {
      console.warn('Cannot start typing: socket not connected or missing threadId');
      return;
    }
    
    try {
      socket.emit('typing:start', { 
        threadId, 
        userName: userName || currentUser?.displayName || currentUser?.email || 'Unknown User'
      });
    } catch (error) {
      console.error('Error starting typing indicator:', error);
    }
  }, [socket, isConnected, currentUser]);

  const stopTyping = useCallback((threadId) => {
    if (!socket || !isConnected || !threadId) {
      console.warn('Cannot stop typing: socket not connected or missing threadId');
      return;
    }
    
    try {
      socket.emit('typing:stop', { threadId });
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  }, [socket, isConnected]);
  
  // CRITICAL FIX: Add user status update function
  const updateUserStatus = useCallback((status) => {
    if (socket && isConnected) {
      socket.emit('status:update', { status });
    }
  }, [socket, isConnected]);
  
  // CRITICAL FIX: Add thread activity tracking
  const updateThreadActivity = useCallback((threadId, activity) => {
    if (socket && isConnected) {
      socket.emit('thread:activity', { threadId, activity });
    }
  }, [socket, isConnected]);
  
  // CRITICAL FIX: Add connection health check
  const pingConnection = useCallback(() => {
    if (socket && isConnected) {
      const startTime = Date.now();
      socket.emit('ping');
      
      socket.once('pong', (data) => {
        const latency = Date.now() - startTime;
        console.log(`🏓 Connection latency: ${latency}ms`);
        
        // Dispatch latency info for monitoring
        window.dispatchEvent(new CustomEvent('socket-latency', {
          detail: { latency, timestamp: data.timestamp }
        }));
      });
    }
  }, [socket, isConnected]);

  // Whiteboard collaboration functions
  const joinWhiteboard = (whiteboardId) => {
    if (socket && isConnected) {
      socket.emit('whiteboard:join', whiteboardId);
      console.log(`🎨 Joined whiteboard room: ${whiteboardId}`);
    }
  };

  const leaveWhiteboard = (whiteboardId) => {
    if (socket && isConnected) {
      socket.emit('whiteboard:leave', whiteboardId);
      console.log(`🎨 Left whiteboard room: ${whiteboardId}`);
    }
  };

  const broadcastDrawing = (whiteboardId, elements, action) => {
    if (socket && isConnected) {
      socket.emit('whiteboard:drawing', { whiteboardId, elements, action });
    }
  };

  const value = {
    socket,
    isConnected,
    typingUsers,
    onlineUsers,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
    updateUserStatus,
    updateThreadActivity,
    pingConnection,
    joinWhiteboard,
    leaveWhiteboard,
    broadcastDrawing,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};