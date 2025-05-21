import React, { useState, useEffect } from "react";
import axios from "axios";

function ImageGallery({ activeSession }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState("annotated"); // "annotated" or "original"

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
    timeout: 10000,
  });

  // Fetch images for the active session
  const fetchImages = async () => {
    if (!activeSession || !activeSession.session_id) return;

    try {
      setLoading(true);
      const response = await api.get(`/images/${activeSession.session_id}`);
      setImages(response.data.images || []);
      setError(null);
    } catch (err) {
      setError("Failed to load images. Please try again.");
      console.error("Error fetching images:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch images when active session changes
  useEffect(() => {
    if (activeSession) {
      fetchImages();

      // Set up polling if the session is running
      let interval;
      if (activeSession.status === "running") {
        interval = setInterval(fetchImages, 5000); // Poll every 5 seconds
      }

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      // Clear images if no active session
      setImages([]);
    }
  }, [activeSession, activeSession?.status]);

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    try {
      // Expected format: 20240521_121030_123456 (YYYYMMdd_HHmmss_SSS)
      const year = timestamp.substring(0, 4);
      const month = timestamp.substring(4, 6);
      const day = timestamp.substring(6, 8);
      const hour = timestamp.substring(9, 11);
      const minute = timestamp.substring(11, 13);
      const second = timestamp.substring(13, 15);

      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    } catch (e) {
      return timestamp;
    }
  };

  // Filter images based on view type
  const filteredImages = images.filter((image) => image.type === viewType);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Saved Images</h2>

        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              viewType === "annotated"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setViewType("annotated")}
          >
            Annotated
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${
              viewType === "original"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setViewType("original")}
          >
            Original
          </button>
          <button
            className="btn btn-primary text-sm ml-2"
            onClick={fetchImages}
            disabled={loading || !activeSession}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {!activeSession ? (
        <p>No active session selected. Start or select a detection session.</p>
      ) : filteredImages.length === 0 ? (
        <p>
          No {viewType} images found for this session yet.
          {activeSession.status === "running" &&
            " Images will appear automatically as detections occur."}
        </p>
      ) : (
        <div>
          <p className="mb-4 text-sm text-gray-600">
            Showing {filteredImages.length} {viewType} images from session{" "}
            <span className="font-mono">
              {activeSession.session_id.substring(0, 8)}...
            </span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.filename}
                className="border rounded-md overflow-hidden bg-gray-50"
              >
                <img
                  src={image.url}
                  alt={`${viewType} frame`}
                  className="w-full object-contain h-48"
                  loading="lazy"
                />
                <div className="p-2 text-xs">
                  <p className="font-medium">
                    {formatTimestamp(image.timestamp)}
                  </p>
                  <p className="text-gray-500 truncate">{image.filename}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageGallery;
