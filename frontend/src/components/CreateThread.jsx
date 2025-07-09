// frontend/src/components/CreateThread.jsx

import React, { useState } from "react";
import { useThread } from "../contexts/ThreadContext";

export default function CreateThread() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { createThread } = useThread();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await createThread(title.trim(), description.trim(), isPublic);
      setTitle("");
      setDescription("");
      setIsPublic(false);
    } catch (err) {
      console.error("Failed to create thread:", err);
      alert(`Failed to create thread: ${err.message || 'Please try again.'}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Title Input */}
      <div className="relative">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter thread title..."
          disabled={isCreating}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-slate-400"
        />
      </div>

      {/* Description Input */}
      <div className="relative">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)..."
          disabled={isCreating}
          rows={2}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-slate-400 resize-none"
        />
      </div>

      {/* Public Toggle */}
      <div className="flex items-center space-x-3">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={isCreating}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-600">
            🌍 Make this thread public (others can discover and join)
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!title.trim() || isCreating}
        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
          !title.trim() || isCreating
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg"
        }`}
      >
        {isCreating ? (
          <span className="flex items-center justify-center space-x-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Creating Thread...</span>
          </span>
        ) : (
          <span>✨ Create New Thread</span>
        )}
      </button>
    </form>
  );
}
