// frontend/src/components/WhiteboardManager.jsx

import React, { useState, useEffect } from 'react';
import { useWhiteboard } from '../contexts/WhiteboardContext';
import { useAuth } from '../contexts/AuthContext';
import Whiteboard from './Whiteboard';

export default function WhiteboardManager({ threadId }) {
  const { 
    whiteboards, 
    currentWhiteboard, 
    isLoading, 
    error,
    fetchWhiteboards, 
    fetchWhiteboard,
    createWhiteboard, 
    deleteWhiteboard,
    clearCurrentWhiteboard 
  } = useWhiteboard();
  
  const { currentUser } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWhiteboardTitle, setNewWhiteboardTitle] = useState('');
  const [newWhiteboardDescription, setNewWhiteboardDescription] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'whiteboard'

  // Load whiteboards when component mounts
  useEffect(() => {
    if (threadId) {
      fetchWhiteboards(threadId);
    }
  }, [threadId, fetchWhiteboards]);

  // Handle create whiteboard
  const handleCreateWhiteboard = async (e) => {
    e.preventDefault();
    if (!newWhiteboardTitle.trim()) return;

    try {
      const whiteboard = await createWhiteboard(
        threadId, 
        newWhiteboardTitle.trim(), 
        newWhiteboardDescription.trim()
      );
      
      setNewWhiteboardTitle('');
      setNewWhiteboardDescription('');
      setShowCreateForm(false);
      
      // Open the new whiteboard
      await fetchWhiteboard(whiteboard._id);
      setViewMode('whiteboard');
    } catch (error) {
      console.error('Failed to create whiteboard:', error);
    }
  };

  // Handle open whiteboard
  const handleOpenWhiteboard = async (whiteboardId) => {
    try {
      await fetchWhiteboard(whiteboardId);
      setViewMode('whiteboard');
    } catch (error) {
      console.error('Failed to open whiteboard:', error);
    }
  };

  // Handle delete whiteboard
  const handleDeleteWhiteboard = async (whiteboardId, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      try {
        await deleteWhiteboard(whiteboardId);
      } catch (error) {
        console.error('Failed to delete whiteboard:', error);
      }
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (viewMode === 'whiteboard' && currentWhiteboard) {
    return (
      <div className="space-y-4">
        {/* Whiteboard Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{currentWhiteboard.title}</h2>
            {currentWhiteboard.description && (
              <p className="text-gray-600 text-sm">{currentWhiteboard.description}</p>
            )}
          </div>
          <button
            onClick={() => {
              clearCurrentWhiteboard();
              setViewMode('list');
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            ← Back to List
          </button>
        </div>

        {/* Whiteboard Canvas */}
        <Whiteboard 
          whiteboardId={currentWhiteboard._id} 
          width={1000} 
          height={600} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Whiteboards</h2>
          <p className="text-gray-600">Collaborate on visual diagrams and sketches</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          + New Whiteboard
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Create New Whiteboard</h3>
            
            <form onSubmit={handleCreateWhiteboard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newWhiteboardTitle}
                  onChange={(e) => setNewWhiteboardTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter whiteboard title"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newWhiteboardDescription}
                  onChange={(e) => setNewWhiteboardDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewWhiteboardTitle('');
                    setNewWhiteboardDescription('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newWhiteboardTitle.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading whiteboards...</span>
        </div>
      )}

      {/* Whiteboards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {whiteboards.map((whiteboard) => (
          <div
            key={whiteboard._id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 mb-1">{whiteboard.title}</h3>
                {whiteboard.description && (
                  <p className="text-gray-600 text-sm mb-2">{whiteboard.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  Created by {whiteboard.creatorEmail.split('@')[0]} on {formatDate(whiteboard.createdAt)}
                </p>
              </div>
              
              {/* Actions */}
              {whiteboard.createdBy === currentUser?.uid && (
                <button
                  onClick={() => handleDeleteWhiteboard(whiteboard._id, whiteboard.title)}
                  className="text-red-600 hover:text-red-800 text-sm ml-2"
                  title="Delete whiteboard"
                >
                  🗑️
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Last updated: {formatDate(whiteboard.lastActivity)}
              </div>
              <button
                onClick={() => handleOpenWhiteboard(whiteboard._id)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Open
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {!isLoading && whiteboards.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🎨</span>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No whiteboards yet</h3>
          <p className="text-gray-600 mb-4">Create your first whiteboard to start collaborating visually</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Whiteboard
          </button>
        </div>
      )}
    </div>
  );
}