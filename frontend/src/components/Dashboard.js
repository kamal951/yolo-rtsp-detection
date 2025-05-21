import React, { useState, useEffect } from "react";
import { getSessions } from "../services/api";

function Dashboard({ activeSession, onSessionSelect }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all active sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await getSessions();
      setSessions(data.sessions || []);
      setError(null);
    } catch (err) {
      setError("Failed to load sessions. Please try again.");
      console.error("Error fetching sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch sessions on component mount and periodically
  useEffect(() => {
    fetchSessions();

    // Refresh sessions every 10 seconds
    const interval = setInterval(fetchSessions, 10000);

    return () => clearInterval(interval);
  }, []);

  // Format duration from seconds
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hrs > 0 ? `${hrs}h ` : ""}${mins > 0 ? `${mins}m ` : ""}${secs}s`;
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">All Detection Sessions</h2>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <button
        className="btn btn-primary mb-4"
        onClick={fetchSessions}
        disabled={loading}
      >
        {loading ? "Refreshing..." : "Refresh Sessions"}
      </button>

      {sessions.length === 0 ? (
        <p>No active sessions found. Start a new detection session.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>RTSP URL</th>
                <th>Start Time</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.session_id}
                  className={
                    activeSession?.session_id === session.session_id
                      ? "bg-blue-50"
                      : ""
                  }
                >
                  <td className="truncate max-w-xs">{session.session_id}</td>
                  <td className="truncate max-w-xs">{session.rtsp_url}</td>
                  <td>{formatTimestamp(session.start_time)}</td>
                  <td>{formatDuration(session.runtime)}</td>
                  <td>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        session.status === "running"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary text-sm py-1 px-2"
                      onClick={() => onSessionSelect(session)}
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
  );
}

export default Dashboard;
