import React from "react";

function StreamView({ result }) {
  // In a real implementation, we would display the actual frame image here
  // For now, we'll create a visualization of the detected persons

  if (!result || !result.detections) {
    return (
      <div className="bg-gray-200 h-48 flex items-center justify-center">
        No detection data available
      </div>
    );
  }

  const containerStyle = {
    position: "relative",
    width: "100%",
    height: "300px",
    backgroundColor: "#333",
    overflow: "hidden",
  };

  // Draw detected persons as boxes
  return (
    <div className="border rounded-md overflow-hidden">
      <div style={containerStyle}>
        {/* This simulates a frame from the video stream */}
        <div className="text-white text-center pt-2 opacity-50">
          Stream visualization (Frame {result.frame_id})
        </div>

        {/* Draw detected persons */}
        {result.detections.map((detection, index) => {
          // Use relative coordinates to position boxes
          const box = detection.rel_bbox;
          const style = {
            position: "absolute",
            left: `${box[0] * 100}%`,
            top: `${box[1] * 100}%`,
            width: `${(box[2] - box[0]) * 100}%`,
            height: `${(box[3] - box[1]) * 100}%`,
            border: "2px solid #00ff00",
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
                  backgroundColor: "rgba(0, 255, 0, 0.7)",
                  color: "white",
                  padding: "2px 4px",
                  fontSize: "10px",
                  borderRadius: "2px",
                  marginTop: "-20px",
                }}
              >
                Person {(detection.confidence * 100).toFixed(1)}%
              </div>
            </div>
          );
        })}

        {/* Message when no persons detected */}
        {result.detections.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white opacity-70">
            No persons detected in this frame
          </div>
        )}
      </div>

      <div className="p-2 bg-black text-white text-xs">
        {result.total_persons} person{result.total_persons !== 1 ? "s" : ""}{" "}
        detected
      </div>
    </div>
  );
}

export default StreamView;
