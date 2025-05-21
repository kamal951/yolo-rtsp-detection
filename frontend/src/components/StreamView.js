import React, { useEffect, useState } from "react";

function StreamView({ result, activeSession }) {
  const [streamUrl, setStreamUrl] = useState("");
  const [showSimulation, setShowSimulation] = useState(false);

  useEffect(() => {
    // If we have an active session, create the stream URL
    if (
      activeSession &&
      activeSession.session_id &&
      activeSession.status === "running"
    ) {
      const apiUrl =
        process.env.REACT_APP_API_URL || "http://localhost:5000/api";
      const baseUrl = apiUrl.replace("/api", ""); // Remove '/api' if present
      setStreamUrl(`${baseUrl}/api/stream/${activeSession.session_id}`);
      setShowSimulation(false);
    } else {
      setStreamUrl("");
      setShowSimulation(true);
    }
  }, [activeSession]);

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
        No detection data available
      </div>
    );
  }

  // Show actual video stream if available
  if (streamUrl && !showSimulation) {
    return (
      <div className="border rounded-md overflow-hidden">
        <div
          style={containerStyle}
          className="flex items-center justify-center"
        >
          <img
            src={streamUrl}
            alt="RTSP Stream"
            className="object-contain"
            style={{ width: "550px", height: "309px" }}
            onError={() => setShowSimulation(true)} // Fall back to simulation on error
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

          {/* Note about saving */}
          <span className="italic opacity-75 text-xs">
            Only person detections are saved
          </span>
        </div>
      </div>
    );
  }

  // Show simulation if no stream is available or on error
  return (
    <div className="border rounded-md overflow-hidden">
      <div style={containerStyle}>
        {/* This simulates a frame from the video stream */}
        <div className="text-white text-center pt-2 opacity-50">
          Stream visualization (Frame {result.frame_id})
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

        {/* Note about saving */}
        <span className="italic opacity-75 text-xs">
          Only person detections are saved
        </span>
      </div>
    </div>
  );
}

export default StreamView;
