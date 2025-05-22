import React, { useEffect, useState } from "react";

function StreamView({ result, activeSession }) {
  const [streamUrl, setStreamUrl] = useState("");
  const [showSimulation, setShowSimulation] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // If we have an active session, create the stream URL
    if (
      activeSession &&
      activeSession.session_id &&
      activeSession.status === "running"
    ) {
      // Get the current page's protocol and hostname
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;

      // Determine the correct API URL
      let apiBaseUrl;
      if (process.env.REACT_APP_API_URL) {
        // Use environment variable if set
        apiBaseUrl = process.env.REACT_APP_API_URL.replace("/api", "");
      } else {
        // Fallback to current hostname with port 5000
        apiBaseUrl = `${protocol}//${hostname}:5000`;
      }

      const streamEndpoint = `${apiBaseUrl}/api/stream/${activeSession.session_id}`;
      setStreamUrl(streamEndpoint);
      setShowSimulation(false);
      setStreamError(false);
      setRetryCount(0);

      console.log("Stream URL:", streamEndpoint);
    } else {
      setStreamUrl("");
      setShowSimulation(true);
    }
  }, [activeSession]);

  // Handle image load error
  const handleImageError = (e) => {
    console.error("Stream image error:", e);
    setStreamError(true);

    // Try to retry a few times
    if (retryCount < 3) {
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setStreamError(false);
        // Force reload by adding timestamp
        const newUrl = streamUrl.includes("?")
          ? `${streamUrl}&retry=${Date.now()}`
          : `${streamUrl}?retry=${Date.now()}`;
        setStreamUrl(newUrl);
      }, 2000);
    } else {
      setShowSimulation(true);
    }
  };

  // Handle image load success
  const handleImageLoad = () => {
    setStreamError(false);
    setRetryCount(0);
  };

  // Container style for both real stream and simulation
  const containerStyle = {
    position: "relative",
    width: "550px",
    height: "309px",
    backgroundColor: "#333",
    overflow: "hidden",
  };

  // Different colors for different object classes in simulation mode
  const classColors = {
    person: "#00ff00", // Green for persons
    car: "#ff0000", // Red for cars
    animal: "#0000ff", // Blue for animals
  };

  // If there's no result data, show a placeholder
  if (!result || !result.detections) {
    return (
      <div className="bg-gray-200 h-48 flex items-center justify-center">
        <div className="text-center">
          <p>No detection data available</p>
          {streamUrl && (
            <p className="text-xs text-gray-500 mt-2">
              Stream URL: {streamUrl}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show actual video stream if available and no errors
  if (streamUrl && !showSimulation && !streamError) {
    return (
      <div className="border rounded-md overflow-hidden">
        <div
          style={containerStyle}
          className="flex items-center justify-center"
        >
          <img
            src={streamUrl}
            alt="RTSP Stream"
            className="object-contain max-w-full max-h-full"
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{
              width: "auto",
              height: "auto",
              maxWidth: "550px",
              maxHeight: "309px",
            }}
          />
        </div>

        <div className="p-2 bg-black text-white text-xs flex justify-between">
          {/* Show detection counts if available */}
          {result.detection_counts ? (
            <div className="flex space-x-3">
              <span className="text-green-400">
                {result.detection_counts.person || 0} person
                {result.detection_counts.person !== 1 ? "s" : ""}
              </span>
              <span className="text-red-400">
                {result.detection_counts.car || 0} car
                {result.detection_counts.car !== 1 ? "s" : ""}
              </span>
              <span className="text-blue-400">
                {result.detection_counts.animal || 0} animal
                {result.detection_counts.animal !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <span>
              {result.total_persons || result.detections.length} object
              {(result.total_persons || result.detections.length) !== 1
                ? "s"
                : ""}{" "}
              detected
            </span>
          )}

          {/* Stream status */}
          <span className="italic opacity-75 text-xs">
            Live Stream {retryCount > 0 ? `(Retry ${retryCount})` : ""}
          </span>
        </div>
      </div>
    );
  }

  // Show error state
  if (streamError && retryCount >= 3) {
    return (
      <div className="border rounded-md overflow-hidden">
        <div
          style={containerStyle}
          className="flex items-center justify-center bg-red-900"
        >
          <div className="text-white text-center">
            <p>Stream Error</p>
            <p className="text-xs mt-2">Could not load live stream</p>
            <p className="text-xs mt-1">URL: {streamUrl}</p>
            <button
              className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded"
              onClick={() => {
                setStreamError(false);
                setRetryCount(0);
                setShowSimulation(false);
              }}
            >
              Retry Stream
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show simulation if no stream is available or on persistent error
  return (
    <div className="border rounded-md overflow-hidden">
      <div style={containerStyle}>
        {/* This simulates a frame from the video stream */}
        <div className="text-white text-center pt-2 opacity-50">
          Stream visualization (Frame {result.frame_id})
          {streamError && (
            <div className="text-red-400 text-xs">
              Stream offline - showing simulation
            </div>
          )}
        </div>

        {/* Draw detected objects */}
        {result.detections.map((detection, index) => {
          // Use relative coordinates to position boxes
          const box = detection.rel_bbox;
          const objectClass = detection.class || "person";
          const color = classColors[objectClass] || "#ffffff";

          const style = {
            position: "absolute",
            left: `${box[0] * 100}%`,
            top: `${box[1] * 100}%`,
            width: `${(box[2] - box[0]) * 100}%`,
            height: `${(box[3] - box[1]) * 100}%`,
            border: `2px solid ${color}`,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
          };

          return (
            <div key={index} style={style}>
              <div
                style={{
                  backgroundColor: `${color}99`, // Add alpha for transparency
                  color: "white",
                  padding: "2px 4px",
                  fontSize: "10px",
                  borderRadius: "2px",
                  marginTop: "-20px",
                  textTransform: "capitalize",
                }}
              >
                {objectClass} {(detection.confidence * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}

        {/* Message when no objects detected */}
        {result.detections.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white opacity-70">
            No objects detected in this frame
          </div>
        )}
      </div>

      <div className="p-2 bg-black text-white text-xs flex justify-between">
        {/* Show detection counts if available */}
        {result.detection_counts ? (
          <div className="flex space-x-3">
            <span className="text-green-400">
              {result.detection_counts.person || 0} person
              {result.detection_counts.person !== 1 ? "s" : ""}
            </span>
            <span className="text-red-400">
              {result.detection_counts.car || 0} car
              {result.detection_counts.car !== 1 ? "s" : ""}
            </span>
            <span className="text-blue-400">
              {result.detection_counts.animal || 0} animal
              {result.detection_counts.animal !== 1 ? "s" : ""}
            </span>
          </div>
        ) : (
          <span>
            {result.total_persons || result.detections.length} object
            {(result.total_persons || result.detections.length) !== 1
              ? "s"
              : ""}{" "}
            detected
          </span>
        )}

        {/* Note about simulation */}
        <span className="italic opacity-75 text-xs">
          {streamError ? "Simulation Mode" : "Only person detections are saved"}
        </span>
      </div>
    </div>
  );
}

export default StreamView;
