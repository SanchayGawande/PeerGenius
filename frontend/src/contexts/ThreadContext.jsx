// frontend/src/contexts/ThreadContext.jsx

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "../axios";
import { handleApiError, isAuthError } from "../utils/errorHandler";
import { useAuth } from "./AuthContext";

const ThreadContext = createContext();

export const ThreadProvider = ({ children }) => {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { logout, currentUser } = useAuth();

  // Fetch all threads
  const fetchThreads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get("/threads");
      setThreads(response.data);
    } catch (err) {
      const errorMessage = handleApiError(err, 'fetching threads');
      setError(errorMessage);
      
      if (isAuthError(err)) {
        await logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // Create a new thread
  const createThread = async (title, description = "", isPublic = false, category = null, tags = []) => {
    setError(null);
    try {
      const response = await axios.post("/threads", { 
        title, 
        description,
        isPublic,
        category,
        tags
      });
      const newThread = response.data;
      setThreads((prev) => [...prev, newThread]);
      setSelectedThread(newThread);
      return newThread;
    } catch (err) {
      const errorMessage = handleApiError(err, 'creating thread');
      setError(errorMessage);
      
      if (isAuthError(err)) {
        await logout();
      }
      
      throw new Error(errorMessage);
    }
  };

  // Delete a thread
  const deleteThread = async (threadId) => {
    try {
      await axios.delete(`/threads/${threadId}`);
      setThreads((prev) => prev.filter((thread) => thread._id !== threadId));
      if (selectedThread?._id === threadId) {
        setSelectedThread(null);
      }
    } catch (err) {
      console.error("Failed to delete thread:", err);
      throw err;
    }
  };

  // Join a thread
  const joinThread = async (threadId) => {
    setError(null);
    try {
      const response = await axios.post(`/threads/${threadId}/join`);
      const updatedThread = response.data.thread;
      
      // Update the thread in the list if it exists, otherwise add it
      setThreads((prev) => {
        const existingIndex = prev.findIndex((t) => t._id === threadId);
        if (existingIndex >= 0) {
          // Update existing thread
          const newThreads = [...prev];
          newThreads[existingIndex] = updatedThread;
          return newThreads;
        } else {
          // Add new thread
          return [...prev, updatedThread];
        }
      });
      
      setSelectedThread(updatedThread);
      return updatedThread;
    } catch (err) {
      const errorMessage = handleApiError(err, 'joining thread');
      setError(errorMessage);
      
      if (isAuthError(err)) {
        await logout();
      }
      
      throw new Error(errorMessage);
    }
  };

  // Leave a thread
  const leaveThread = async (threadId) => {
    setError(null);
    try {
      await axios.post(`/threads/${threadId}/leave`);
      
      // Remove thread from list
      setThreads((prev) => prev.filter((thread) => thread._id !== threadId));
      
      // Clear selection if this was the selected thread
      if (selectedThread?._id === threadId) {
        setSelectedThread(null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = handleApiError(err, 'leaving thread');
      setError(errorMessage);
      
      if (isAuthError(err)) {
        await logout();
      }
      
      throw new Error(errorMessage);
    }
  };

  // Clear threads and selection when user logs out
  useEffect(() => {
    if (!currentUser) {
      console.log('User logged out - clearing threads and selection');
      setThreads([]);
      setSelectedThread(null);
      setError(null);
    }
  }, [currentUser]);

  const value = {
    threads,
    setThreads,
    selectedThread,
    setSelectedThread,
    fetchThreads,
    createThread,
    deleteThread,
    joinThread,
    leaveThread,
    isLoading,
    error,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
};

export const useThread = () => {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error("useThread must be used within a ThreadProvider");
  }
  return context;
};
