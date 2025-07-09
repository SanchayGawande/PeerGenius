// frontend/src/contexts/SocketContext.jsx

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map()); // threadId -> Set of userNames
  const { currentUser } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (currentUser) {
      console.log('🔌 Connecting to Socket.IO...');
      
      const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5050', {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
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
        reconnectAttempts.current++;
        if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('🚫 Max reconnection attempts reached');
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

      newSocket.on('user:stop-typing', (data) => {
        const { threadId, userId } = data;
        console.log(`⌨️ User stopped typing in thread ${threadId}`);
        
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (newMap.has(threadId)) {
            // Remove by userId (we need to find the userName)
            // For now, clear all typing for this thread when anyone stops
            // This is a simple approach - could be improved with userId->userName mapping
            newMap.delete(threadId);
          }
          return newMap;
        });
      });

      setSocket(newSocket);

      return () => {
        console.log('🔌 Disconnecting Socket.IO...');
        newSocket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setTypingUsers(new Map());
      };
    } else {
      // User logged out, cleanup socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setTypingUsers(new Map());
      }
    }
  }, [currentUser]);

  // Helper functions
  const joinThread = (threadId) => {
    if (socket && isConnected) {
      socket.emit('thread:join', threadId);
      console.log(`📱 Joined thread room: ${threadId}`);
    }
  };

  const leaveThread = (threadId) => {
    if (socket && isConnected) {
      socket.emit('thread:leave', threadId);
      console.log(`📱 Left thread room: ${threadId}`);
    }
  };

  const startTyping = (threadId, userName) => {
    if (socket && isConnected) {
      socket.emit('typing:start', { threadId, userName });
    }
  };

  const stopTyping = (threadId) => {
    if (socket && isConnected) {
      socket.emit('typing:stop', { threadId });
    }
  };

  const value = {
    socket,
    isConnected,
    typingUsers,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
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