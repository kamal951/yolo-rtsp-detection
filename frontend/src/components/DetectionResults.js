import React, { useState, useEffect } from "react";
import { getDetectionResults } from "../services/api";
import StreamView from "./StreamView";

function DetectionResults({
  activeSession,
  detectionResults,
  setDetectionResults,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch detection results for the active session
  const fetchResults = async () => {
    if (!activeSession || !activeSession.session_id) return;

    try {
      setLoading(true);
      const data = await getDetectionResults(activeSession.session_id);
      setDetectionResults(data.results || []);
      setError(null);
    } catch (err) {
      setError("Failed to load detection results. Please try again.");
      console.error("Error fetching detection results:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch results when active session changes or periodically if session is running
  useEffect(() => {
    if (activeSession) {
      fetchResults();

      // Set up polling only if the session is running
      let interval;
      if (activeSession.status === "running") {
        interval = setInterval(fetchResults, 2000); // Poll every 2 seconds
      }

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      // Clear results if no active session
      setDetectionResults([]);
    }
  }, [activeSession, activeSession?.status]);

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get the latest detection result (if any)
  const latestResult = detectionResults.length > 0 ? detectionResults[0] : null;

  // Function to get count details
  const getCountDetails = (result) => {
    if (result.detection_counts) {
      return `${result.detection_counts.person || 0} persons, ${
        result.detection_counts.car || 0
      } cars, ${result.detection_counts.animal || 0} animals`;
    } else if (result.total_persons !== undefined) {
      return `${result.total_persons} persons`;
    } else {
      return `${result.detections?.length || 0} detections`;
    }
  };

  // Function to check if a result has any detections
  const hasDetections = (result) => {
    if (result.detection_counts) {
      return (
        result.detection_counts.person > 0 ||
        result.detection_counts.car > 0 ||
        result.detection_counts.animal > 0
      );
    } else if (result.total_persons !== undefined) {
      return result.total_persons > 0;
    } else {
      return result.detections && result.detections.length > 0;
    }
  };

  // Filter results to only include those with detections
  const resultsWithDetections = detectionResults.filter(hasDetections);

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Detection Results</h2>

        <button
          className="btn btn-primary text-sm"
          onClick={fetchResults}
          disabled={loading || !activeSession}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {!activeSession ? (
        <p>No active session selected. Start or select a detection session.</p>
      ) : detectionResults.length === 0 ? (
        <p>No detection results available for this session yet.</p>
      ) : (
        <div>
          {/* Live Stream View */}
          {activeSession.status === "running" && (
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Live Stream</h3>
              <div className="text-sm text-gray-500 mb-2">
                Showing live RTSP stream with real-time object detection
              </div>
              {latestResult && (
                <StreamView
                  result={latestResult}
                  activeSession={activeSession}
                />
              )}
            </div>
          )}

          {/* Latest Detection Preview */}
          {latestResult && activeSession.status !== "running" && (
            <div className="mb-4">
              <h3 className="font-bold text-lg mb-2">Latest Detection</h3>
              <StreamView result={latestResult} activeSession={activeSession} />

              <div className="mt-2 bg-gray-50 p-3 rounded-md">
                <p>
                  <strong>Timestamp:</strong>{" "}
                  {formatTimestamp(latestResult.timestamp)}
                </p>
                <p>
                  <strong>Detections:</strong> {getCountDetails(latestResult)}
                </p>
                <p>
                  <strong>Frame ID:</strong> {latestResult.frame_id}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  <em>
                    Note: Only person detections are saved to the database
                  </em>
                </p>
              </div>
            </div>
          )}

          {/* Detection History */}
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-2">Detection History</h3>

            {resultsWithDetections.length === 0 ? (
              <p>No detections found in this session yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Frame</th>
                      <th>Detections</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsWithDetections.map((result, index) => (
                      <tr key={`${result.timestamp}-${index}`}>
                        <td>{formatTimestamp(result.timestamp)}</td>
                        <td>{result.frame_id}</td>
                        <td>
                          <span className="inline-flex items-center">
                            {getCountDetails(result)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="text-blue-600 hover:underline text-sm"
                            onClick={() => {
                              // Display detection details in a nicer way
                              const counts = result.detection_counts || {
                                person: result.total_persons || 0,
                                car: 0,
                                animal: 0,
                              };

                              const detailsMessage = `
                                Frame: ${result.frame_id}
                                Timestamp: ${formatTimestamp(result.timestamp)}
                                
                                Detected objects:
                                - Persons: ${counts.person || 0}
                                - Cars: ${counts.car || 0}
                                - Animals: ${counts.animal || 0}
                              `;

                              alert(detailsMessage);
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DetectionResults;
