// frontend/src/axios.js

import axios from "axios";
import { auth } from "./firebase";

// Create axios instance with base URL
const instance = axios.create({
  baseURL: "/api", // Use Vite proxy instead of direct backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
instance.interceptors.request.use(
  async (config) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
        // Only log in development
        if (import.meta.env.DEV) {
          console.log(`📡 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }
      } else if (import.meta.env.DEV) {
        console.warn("⚠️ No authenticated user found for API request");
      }
    } catch (error) {
      console.error("❌ Error getting auth token:", error);
    }
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
instance.interceptors.response.use(
  (response) => {
    // Only log in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  (error) => {
    // Always log errors
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error);
    
    if (error.response?.status === 401) {
      console.error("🚫 Unauthorized access - redirecting to login");
    } else if (error.code === 'ERR_NETWORK') {
      console.error("🌐 Network error - check if backend is running on http://localhost:5050");
    }
    
    return Promise.reject(error);
  }
);

export default instance;
