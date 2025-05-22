import axios from "axios";

// Fonction pour détecter l'environnement et configurer l'URL
function getApiUrl() {
  // Si REACT_APP_API_URL est défini, l'utiliser
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  // Sinon, utiliser l'URL dynamique basée sur l'hôte actuel
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;

  // Si on est en localhost, utiliser localhost:5000
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return `${protocol}//localhost:5000/api`;
  }

  // Sinon, utiliser la même IP que le frontend mais port 5000
  return `${protocol}//${hostname}:5000/api`;
}

// Create an axios instance with dynamic base URL
const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Afficher l'URL utilisée pour debug
console.log("API URL:", getApiUrl());

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
