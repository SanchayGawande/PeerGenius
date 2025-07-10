// frontend/src/axios.js

import axios from "axios";
import { auth } from "./firebase";
import requestThrottle from "./utils/requestThrottle";

// Create axios instance with base URL that uses Vite proxy
const instance = axios.create({
  baseURL: "/api", // Use relative path to leverage Vite proxy
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token and throttling
instance.interceptors.request.use(
  async (config) => {
    // CRITICAL FIX: Check request throttling before proceeding
    const fullUrl = `${config.baseURL}${config.url}`;
    if (!requestThrottle.shouldAllowRequest(fullUrl)) {
      const error = new Error('Request blocked due to rate limiting');
      error.code = 'ERR_RATE_LIMITED';
      error.config = config;
      return Promise.reject(error);
    }
    
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
      
      // Record the request for throttling
      requestThrottle.recordRequest(fullUrl);
      
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
