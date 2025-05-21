import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import StreamInput from "./components/StreamInput";
import DetectionResults from "./components/DetectionResults";
import ImageGallery from "./components/ImageGallery";
import "./App.css";

function App() {
  const [activeSession, setActiveSession] = useState(null);
  const [detectionResults, setDetectionResults] = useState([]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>RTSP Person Detection System</h1>
      </header>

      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Stream Input and Controls */}
          <div className="md:col-span-4">
            <StreamInput
              onSessionStart={setActiveSession}
              activeSession={activeSession}
            />
          </div>

          {/* Detection Results Panel */}
          <div className="md:col-span-8">
            <DetectionResults
              activeSession={activeSession}
              detectionResults={detectionResults}
              setDetectionResults={setDetectionResults}
            />
          </div>
        </div>

        {/* Image Gallery */}
        <div className="mt-8">
          <ImageGallery activeSession={activeSession} />
        </div>

        {/* Dashboard with All Sessions */}
        <div className="mt-8">
          <Dashboard
            activeSession={activeSession}
            onSessionSelect={setActiveSession}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
