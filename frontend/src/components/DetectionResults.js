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
          {/* Latest Detection Preview */}
          {latestResult && (
            <div className="mb-4">
              <h3 className="font-bold text-lg mb-2">Latest Detection</h3>
              <StreamView result={latestResult} />

              <div className="mt-2 bg-gray-50 p-3 rounded-md">
                <p>
                  <strong>Timestamp:</strong>{" "}
                  {formatTimestamp(latestResult.timestamp)}
                </p>
                <p>
                  <strong>Total Persons:</strong> {latestResult.total_persons}
                </p>
                <p>
                  <strong>Frame ID:</strong> {latestResult.frame_id}
                </p>
              </div>
            </div>
          )}

          {/* Detection History */}
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-2">Detection History</h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Frame</th>
                    <th>Persons</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {detectionResults.map((result, index) => (
                    <tr key={`${result.timestamp}-${index}`}>
                      <td>{formatTimestamp(result.timestamp)}</td>
                      <td>{result.frame_id}</td>
                      <td>{result.total_persons}</td>
                      <td>
                        <button
                          className="text-blue-600 hover:underline text-sm"
                          onClick={() => {
                            // This could open a modal with more details
                            console.log("Detection details:", result);
                            alert(`Detected ${result.total_persons} persons`);
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
          </div>
        </div>
      )}
    </div>
  );
}

export default DetectionResults;
