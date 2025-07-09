// frontend/src/components/DiscoverThreads.jsx

import React, { useState, useEffect, useCallback } from "react";
import { useThread } from "../contexts/ThreadContext";
import { useSocket } from "../contexts/SocketContext";
import axios from "../axios";

export default function DiscoverThreads() {
  const [publicThreads, setPublicThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const { joinThread, threads } = useThread();
  const { socket, isConnected } = useSocket();

  // Get user's current thread IDs to avoid showing threads they're already in
  const userThreadIds = threads.map(t => t._id);

  const fetchPublicThreads = useCallback(async (isRetry = false) => {
    if (!isRetry) {
      setLoading(true);
      setError("");
      setRetryCount(0);
    }
    
    try {
      console.log("🔄 Fetching public threads...");
      const response = await axios.get('/threads/public');
      
      let threadsData;
      // Handle both old and new response formats
      if (response.data.success !== undefined) {
        // New format with success wrapper
        threadsData = response.data.data || [];
      } else if (Array.isArray(response.data)) {
        // Old format - direct array
        threadsData = response.data;
      } else {
        console.error("Unexpected response format:", response.data);
        threadsData = [];
      }
      
      // Filter out threads the user is already in
      const availableThreads = threadsData.filter(thread => !userThreadIds.includes(thread._id));
      setPublicThreads(availableThreads);
      
      console.log(`✅ Successfully loaded ${availableThreads.length} public threads`);
      setRetryCount(0); // Reset retry count on success
      
    } catch (err) {
      console.error("❌ Error fetching public threads:", err);
      
      let errorMessage = "Failed to load public threads";
      
      if (err.response?.status === 401) {
        errorMessage = "Authentication failed. Please try logging in again.";
      } else if (err.response?.status >= 500) {
        errorMessage = "Server error. Please try again in a moment.";
      } else if (err.code === 'ERR_NETWORK') {
        errorMessage = "Network error. Please check your connection.";
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      
      // Auto-retry logic for network errors (max 3 retries)
      if ((err.code === 'ERR_NETWORK' || err.response?.status >= 500) && retryCount < 3) {
        const newRetryCount = retryCount + 1;
        setRetryCount(newRetryCount);
        
        console.log(`⏰ Auto-retrying in ${newRetryCount * 2} seconds... (${newRetryCount}/3)`);
        
        setTimeout(() => {
          fetchPublicThreads(true); // isRetry = true
        }, newRetryCount * 2000); // Exponential backoff: 2s, 4s, 6s
      }
      
    } finally {
      if (!isRetry) {
        setLoading(false);
      }
    }
  }, [userThreadIds, retryCount]);

  useEffect(() => {
    fetchPublicThreads();
  }, [userThreadIds.length]); // Refetch when user's threads change

  // Listen for real-time public thread updates
  useEffect(() => {
    if (socket && isConnected) {
      const handleNewPublicThread = (newThread) => {
        console.log('📡 Received new public thread:', newThread.title);
        
        // Only add if user is not already in this thread
        if (!userThreadIds.includes(newThread._id)) {
          setPublicThreads(prev => {
            // Check if thread already exists to avoid duplicates
            const exists = prev.some(t => t._id === newThread._id);
            if (!exists) {
              return [newThread, ...prev]; // Add to beginning of list
            }
            return prev;
          });
        }
      };

      socket.on('thread:new-public', handleNewPublicThread);

      return () => {
        socket.off('thread:new-public', handleNewPublicThread);
      };
    }
  }, [socket, isConnected, userThreadIds]);

  const handleJoinPublicThread = async (threadId, threadTitle) => {
    try {
      await joinThread(threadId);
      // Remove the thread from public threads list since user joined it
      setPublicThreads(prev => prev.filter(t => t._id !== threadId));
    } catch (err) {
      setError(`Failed to join "${threadTitle}": ${err.message}`);
    }
  };

  if (!loading && publicThreads.length === 0 && !error) {
    return null; // Don't show component if no public threads
  }

  return (
    <div className="bg-white/60 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg p-6 mb-6">
      <h3 className="font-semibold text-slate-900 mb-2 flex items-center space-x-2">
        <span>🌍</span>
        <span>Discover Public Threads</span>
      </h3>
      
      <p className="text-xs text-slate-500 mb-4">
        Join public study groups and discussions created by other students.
      </p>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-slate-500">Loading public threads...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-600">{error}</p>
          {retryCount > 0 && (
            <p className="text-xs text-red-500 mt-1">
              Retrying... ({retryCount}/3)
            </p>
          )}
          {retryCount >= 3 && (
            <button
              onClick={() => {
                setRetryCount(0);
                fetchPublicThreads();
              }}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Try again manually
            </button>
          )}
        </div>
      )}

      {!loading && publicThreads.length > 0 && (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {publicThreads.map((thread) => (
            <div
              key={thread._id}
              className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-900 truncate text-sm">
                  {thread.title}
                </h4>
                <p className="text-xs text-slate-500 truncate">
                  {thread.description || "No description"}
                </p>
                <div className="flex items-center space-x-3 mt-1 text-xs text-slate-400">
                  <span>👥 {thread.memberCount || thread.participants?.length || 0} members</span>
                  <span>💬 {thread.messageCount || 0} messages</span>
                </div>
              </div>
              <button
                onClick={() => handleJoinPublicThread(thread._id, thread.title)}
                className="ml-3 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-md transition-colors"
              >
                Join
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && publicThreads.length === 0 && !error && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-500">No public threads available to join.</p>
        </div>
      )}

      <button
        onClick={fetchPublicThreads}
        disabled={loading}
        className="w-full mt-4 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg transition-colors disabled:opacity-50"
      >
        🔄 Refresh
      </button>
    </div>
  );
}