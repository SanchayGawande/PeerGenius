// frontend/src/contexts/MessageContext.jsx

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "../axios";
import { handleApiError, isAuthError } from "../utils/errorHandler";
import { useAuth } from "./AuthContext";

const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isLargeSummary, setIsLargeSummary] = useState(false);
  const [error, setError] = useState(null);
  const [threadInfo, setThreadInfo] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { logout, currentUser } = useAuth();
  
  // Refs for polling
  const pollingIntervalRef = useRef(null);
  const currentThreadIdRef = useRef(null);
  const lastMessageTimeRef = useRef(null);

  // Fetch messages for a thread
  const fetchMessages = useCallback(async (threadId, since = null) => {
    if (!since) setIsLoading(true);
    setError(null);
    try {
      const url = since ? `/messages/${threadId}?since=${since}` : `/messages/${threadId}`;
      const response = await axios.get(url);
      
      if (response.data.messages) {
        // New API response format with thread info
        if (since) {
          // For polling, append only new messages that don't already exist
          setMessages(prev => {
            const existingIds = new Set(prev.map(msg => msg._id));
            const newMessages = response.data.messages.filter(msg => !existingIds.has(msg._id));
            return [...prev, ...newMessages];
          });
        } else {
          // For initial load, replace all messages
          setMessages(response.data.messages);
        }
        setThreadInfo(response.data.thread);
        
        // Update last message time for polling
        if (response.data.messages.length > 0) {
          const lastMessage = response.data.messages[response.data.messages.length - 1];
          lastMessageTimeRef.current = lastMessage.createdAt;
        }
      } else {
        // Fallback for old API format
        setMessages(response.data || []);
      }
    } catch (err) {
      const errorMessage = handleApiError(err, 'fetching messages');
      setError(errorMessage);
      if (!since) setMessages([]);
      
      // Handle 403 Forbidden - user not authorized for this thread
      if (err.response?.status === 403) {
        console.error("Access denied to thread:", threadId, err.response?.data);
        // Clear the problematic thread from selection
        if (currentThreadIdRef.current === threadId) {
          stopPolling();
          currentThreadIdRef.current = null;
        }
      }
      
      if (isAuthError(err)) {
        await logout();
      }
    } finally {
      if (!since) setIsLoading(false);
    }
  }, [logout]);

  // Post a new message
  const postMessage = async (threadId, content) => {
    setIsLoading(true);
    setError(null);
    setIsRateLimited(false);
    
    try {
      const response = await axios.post(`/messages/${threadId}`, {
        content,
      });
      const { userMessage, aiMessage } = response.data;

      // Add the user message immediately (with deduplication safety)
      if (userMessage) {
        setMessages((prev) => {
          const exists = prev.some(msg => msg._id === userMessage._id);
          return exists ? prev : [...prev, userMessage];
        });
      }

      // Add AI response if available (with deduplication safety)
      if (aiMessage) {
        setMessages((prev) => {
          const exists = prev.some(msg => msg._id === aiMessage._id);
          return exists ? prev : [...prev, aiMessage];
        });
      }

      return { userMessage, aiMessage };
    } catch (err) {
      const errorMessage = handleApiError(err, 'posting message');
      setError(errorMessage);
      
      // Handle rate limiting
      if (err.response?.status === 429) {
        setIsRateLimited(true);
        // Clear rate limit state after 30 seconds
        setTimeout(() => setIsRateLimited(false), 30000);
      }
      
      if (isAuthError(err)) {
        await logout();
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Summarize thread
  const summarizeThread = async (threadId) => {
    setIsSummarizing(true);
    setIsLargeSummary(messages.length > 20);
    setError(null);
    try {
      const response = await axios.post(`/messages/${threadId}/summarize`);

      // Refresh messages to get the summary
      await fetchMessages(threadId);

      return response.data;
    } catch (err) {
      console.error("Failed to summarize thread:", err);
      setError(err.message || "Failed to summarize thread");
      throw err;
    } finally {
      setIsSummarizing(false);
      setIsLargeSummary(false);
    }
  };

  // Start polling for new messages
  const startPolling = (threadId) => {
    // Only start polling if user is authenticated
    if (!currentUser) {
      console.log('Not starting polling - user not authenticated');
      return;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    currentThreadIdRef.current = threadId;
    setIsPolling(true);
    
    pollingIntervalRef.current = setInterval(async () => {
      // Stop polling if user is no longer authenticated
      if (!currentUser || !currentThreadIdRef.current || !lastMessageTimeRef.current) {
        console.log('Stopping polling - user not authenticated or no thread selected');
        stopPolling();
        return;
      }
      
      try {
        await fetchMessages(currentThreadIdRef.current, lastMessageTimeRef.current);
      } catch (err) {
        console.error('Polling error:', err);
        // If we get rate limited, increase polling interval temporarily
        if (err.response?.status === 429) {
          console.log('Rate limited - slowing down polling temporarily');
          clearInterval(pollingIntervalRef.current);
          setTimeout(() => {
            if (currentThreadIdRef.current && currentUser) {
              startPolling(currentThreadIdRef.current); // Restart with same interval
            }
          }, 10000); // Wait 10 seconds before resuming
        }
        // If we get auth errors, stop polling completely
        else if (err.response?.status === 401 || err.response?.status === 403) {
          console.log('Auth error in polling - stopping');
          stopPolling();
        }
      }
    }, 5000); // Poll every 5 seconds (reduced frequency)
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    currentThreadIdRef.current = null;
  };

  // Switch to a different thread
  const switchThread = useCallback(async (threadId) => {
    try {
      stopPolling();
      clearMessages();
      await fetchMessages(threadId);
      startPolling(threadId);
    } catch (error) {
      // Ensure polling is stopped if thread switch fails
      stopPolling();
      clearMessages();
      throw error; // Re-throw so calling code can handle it
    }
  }, [fetchMessages]);

  // Clear messages when switching threads
  const clearMessages = () => {
    setMessages([]);
    setThreadInfo(null);
    setError(null);
    lastMessageTimeRef.current = null;
  };

  // Stop polling when user logs out
  useEffect(() => {
    if (!currentUser) {
      console.log('User logged out - stopping polling and clearing messages');
      stopPolling();
      clearMessages();
      currentThreadIdRef.current = null;
    }
  }, [currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const value = {
    messages,
    setMessages,
    fetchMessages,
    postMessage,
    summarizeThread,
    clearMessages,
    startPolling,
    stopPolling,
    switchThread,
    threadInfo,
    isLoading,
    isSummarizing,
    isLargeSummary,
    isPolling,
    isRateLimited,
    error,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessageProvider");
  }
  return context;
};
