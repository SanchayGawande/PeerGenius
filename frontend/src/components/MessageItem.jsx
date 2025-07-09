// frontend/src/components/MessageItem.jsx

import React from "react";
import { useAuth } from "../contexts/AuthContext";

export default function MessageItem({ message }) {
  const { currentUser } = useAuth();

  if (!message) return null;

  const isCurrentUser = message.sender === currentUser?.uid || message.senderEmail === currentUser?.email;
  const isAI = message.messageType === "ai" || message.sender === "AI Assistant" || message.sender === "AI" || message.sender === "ai-assistant";
  const isSystem = message.messageType === "system";
  const isSummary = message.type === "summary" || isSystem;
  
  // Get display name for sender
  const getSenderName = () => {
    if (isSummary || isSystem) return "📝 Thread Summary";
    if (isAI) return "AI";
    if (isCurrentUser) return "You";
    // Extract name from email or use full email
    const email = message.senderEmail || "User";
    const name = email.includes('@') ? email.split('@')[0] : email;
    return name;
  };

  return (
    <div
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} ${
        isAI ? "mb-3" : "mb-4"
      }`}
    >
      <div
        className={`max-w-[70%] rounded-2xl shadow-md ${
          isSummary
            ? "bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 px-6 py-4"
            : isCurrentUser
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 shadow-lg"
            : isAI
            ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700 px-4 py-2 shadow-sm"
            : isSystem
            ? "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300 px-6 py-4"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-6 py-4 shadow-lg"
        }`}
      >
        {/* Message Header */}
        <div className={`flex items-center space-x-2 ${isAI ? "mb-1" : "mb-2"}`}>
          <span className={`${
            isAI ? "font-medium text-xs" : "font-semibold text-sm"
          }`}>
            {getSenderName()}
          </span>
          {(message.timestamp || message.createdAt) && (
            <span
              className={`text-xs ${
                isCurrentUser 
                  ? "text-blue-100" 
                  : isAI 
                  ? "text-green-600 dark:text-green-400" 
                  : isSystem 
                  ? "text-yellow-600" 
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {new Date(message.timestamp || message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        {/* Message Content */}
        <div
          className={`${
            isSummary 
              ? "font-medium text-base" 
              : isAI 
              ? "text-sm font-normal leading-relaxed" 
              : "text-base font-medium leading-relaxed"
          } whitespace-pre-wrap break-words`}
        >
          {message.text || message.content}
        </div>

        {/* Special indicator for summary */}
        {isSummary && (
          <div className="mt-3 pt-3 border-t border-purple-200">
            <span className="text-xs text-purple-700 font-medium">
              AI-generated summary of the conversation
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
