// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // proxy all /api calls to your backend
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:5050",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
