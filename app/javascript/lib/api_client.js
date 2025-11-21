/**
 * Shared API client using axios
 * Provides consistent error handling and configuration
 */
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error("API Error:", error);
    return Promise.reject(error);
  }
);

export default api;
