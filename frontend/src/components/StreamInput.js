import React, { useState } from "react";
import { toast } from "react-toastify";
import { startDetection, stopDetection } from "../services/api";

function StreamInput({ onSessionStart, activeSession }) {
  const [rtspUrl, setRtspUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission to start detection
  const handleStartDetection = async (e) => {
    e.preventDefault();

    if (!rtspUrl || !rtspUrl.trim().startsWith("rtsp://")) {
      toast.error("Please enter a valid RTSP URL starting with rtsp://");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await startDetection(rtspUrl.trim());

      if (response && response.session_id) {
        toast.success("Detection started successfully");
        onSessionStart(response);
        // Don't clear the URL to make it easier to restart the same stream
      } else {
        toast.error("Failed to start detection");
      }
    } catch (error) {
      console.error("Error starting detection:", error);
      toast.error(error.response?.data?.error || "Failed to start detection");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle stopping the active detection
  const handleStopDetection = async () => {
    if (!activeSession) return;

    try {
      setIsSubmitting(true);
      await stopDetection(activeSession.session_id);
      toast.success("Detection stopped successfully");

      // Update the active session status
      onSessionStart({
        ...activeSession,
        status: "stopped",
      });
    } catch (error) {
      console.error("Error stopping detection:", error);
      toast.error(error.response?.data?.error || "Failed to stop detection");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">RTSP Stream Input</h2>

      <form onSubmit={handleStartDetection}>
        <div className="form-group">
          <label htmlFor="rtspUrl">RTSP URL:</label>
          <input
            type="text"
            id="rtspUrl"
            className="form-control"
            placeholder="rtsp://username:password@example.com:554/stream"
            value={rtspUrl}
            onChange={(e) => setRtspUrl(e.target.value)}
            required
          />
          <small className="text-gray-500">
            Example: rtsp://username:password@192.168.1.100:554/stream
          </small>
        </div>

        <div className="flex space-x-2">
          <button
            type="submit"
            className="btn btn-primary flex-1"
            disabled={
              isSubmitting ||
              (activeSession && activeSession.status === "running")
            }
          >
            {isSubmitting ? "Starting..." : "Start Detection"}
          </button>

          {activeSession && activeSession.status === "running" && (
            <button
              type="button"
              className="btn btn-danger flex-1"
              onClick={handleStopDetection}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Stopping..." : "Stop Detection"}
            </button>
          )}
        </div>
      </form>

      {activeSession && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <h3 className="font-bold mb-2">Active Session</h3>
          <div className="text-sm">
            <p className="mb-1">
              <strong>Session ID:</strong>{" "}
              <span className="text-xs">{activeSession.session_id}</span>
            </p>
            <p className="mb-1">
              <strong>RTSP URL:</strong>{" "}
              <span className="text-xs break-all">
                {activeSession.rtsp_url}
              </span>
            </p>
            <p className="mb-1">
              <strong>Status:</strong>{" "}
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  activeSession.status === "running"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {activeSession.status}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default StreamInput;
