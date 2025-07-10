// frontend/src/contexts/WhiteboardContext.jsx

import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from '../axios';
import { handleApiError } from '../utils/errorHandler';

const WhiteboardContext = createContext();

export const WhiteboardProvider = ({ children }) => {
  const [whiteboards, setWhiteboards] = useState([]);
  const [currentWhiteboard, setCurrentWhiteboard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get all whiteboards for a thread
  const fetchWhiteboards = useCallback(async (threadId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/whiteboards/thread/${threadId}`);
      setWhiteboards(response.data.whiteboards);
      return response.data.whiteboards;
    } catch (err) {
      const errorMessage = handleApiError(err, 'fetching whiteboards');
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get specific whiteboard
  const fetchWhiteboard = useCallback(async (whiteboardId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/whiteboards/${whiteboardId}`);
      setCurrentWhiteboard(response.data.whiteboard);
      return response.data.whiteboard;
    } catch (err) {
      const errorMessage = handleApiError(err, 'fetching whiteboard');
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new whiteboard
  const createWhiteboard = useCallback(async (threadId, title, description) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`/whiteboards/thread/${threadId}`, {
        title,
        description
      });
      
      const newWhiteboard = response.data.whiteboard;
      setWhiteboards(prev => [newWhiteboard, ...prev]);
      console.log(`🎨 Created whiteboard: ${title}`);
      return newWhiteboard;
    } catch (err) {
      const errorMessage = handleApiError(err, 'creating whiteboard');
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update whiteboard elements
  const updateWhiteboardElements = useCallback(async (whiteboardId, elements, action = 'update') => {
    try {
      const response = await axios.put(`/whiteboards/${whiteboardId}/elements`, {
        elements,
        action
      });
      
      // Update current whiteboard if it's the one being edited
      if (currentWhiteboard && currentWhiteboard._id === whiteboardId) {
        setCurrentWhiteboard(prev => ({
          ...prev,
          elements: response.data.elements
        }));
      }
      
      return response.data.elements;
    } catch (err) {
      const errorMessage = handleApiError(err, 'updating whiteboard');
      setError(errorMessage);
      throw err;
    }
  }, [currentWhiteboard]);

  // Delete whiteboard
  const deleteWhiteboard = useCallback(async (whiteboardId) => {
    setIsLoading(true);
    setError(null);
    try {
      await axios.delete(`/whiteboards/${whiteboardId}`);
      
      setWhiteboards(prev => prev.filter(wb => wb._id !== whiteboardId));
      
      if (currentWhiteboard && currentWhiteboard._id === whiteboardId) {
        setCurrentWhiteboard(null);
      }
      
      console.log(`🎨 Deleted whiteboard: ${whiteboardId}`);
    } catch (err) {
      const errorMessage = handleApiError(err, 'deleting whiteboard');
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentWhiteboard]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear current whiteboard
  const clearCurrentWhiteboard = useCallback(() => {
    setCurrentWhiteboard(null);
  }, []);

  const value = {
    whiteboards,
    currentWhiteboard,
    isLoading,
    error,
    fetchWhiteboards,
    fetchWhiteboard,
    createWhiteboard,
    updateWhiteboardElements,
    deleteWhiteboard,
    clearError,
    clearCurrentWhiteboard,
    setCurrentWhiteboard
  };

  return (
    <WhiteboardContext.Provider value={value}>
      {children}
    </WhiteboardContext.Provider>
  );
};

export const useWhiteboard = () => {
  const context = useContext(WhiteboardContext);
  if (!context) {
    throw new Error('useWhiteboard must be used within a WhiteboardProvider');
  }
  return context;
};