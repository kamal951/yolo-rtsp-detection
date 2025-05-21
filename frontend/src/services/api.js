import axios from "axios";

// Create an axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Start a new detection session
export const startDetection = async (rtspUrl) => {
  try {
    const response = await api.post("/start_detection", { rtsp_url: rtspUrl });
    return response.data;
  } catch (error) {
    console.error("API Error - startDetection:", error);
    throw error;
  }
};

// Stop an existing detection session
export const stopDetection = async (sessionId) => {
  try {
    const response = await api.post(`/stop_detection/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error("API Error - stopDetection:", error);
    throw error;
  }
};

// Get detection results for a session
export const getDetectionResults = async (sessionId) => {
  try {
    const response = await api.get(`/detection_results/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error("API Error - getDetectionResults:", error);
    throw error;
  }
};

// Get session status
export const getSessionStatus = async (sessionId) => {
  try {
    const response = await api.get(`/session_status/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error("API Error - getSessionStatus:", error);
    throw error;
  }
};

// Get all active sessions
export const getSessions = async () => {
  try {
    const response = await api.get("/sessions");
    return response.data;
  } catch (error) {
    console.error("API Error - getSessions:", error);
    throw error;
  }
};

export default api;
