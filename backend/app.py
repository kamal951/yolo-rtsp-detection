# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import time
import threading
from detection_service import RTSPDetector
import utils

app = Flask(__name__)
CORS(app)

# Directory to save detection results
RESULTS_DIR = os.environ.get('RESULTS_DIR', '/app/detection_results')
os.makedirs(RESULTS_DIR, exist_ok=True)

# Dictionary to store active detection sessions
active_sessions = {}

@app.route('/api/start_detection', methods=['POST'])
def start_detection():
    data = request.json
    rtsp_url = data.get('rtsp_url')
    
    if not rtsp_url:
        return jsonify({"error": "RTSP URL is required"}), 400
    
    try:
        # Validate RTSP URL
        if not utils.validate_rtsp_url(rtsp_url):
            return jsonify({"error": "Invalid RTSP URL format"}), 400
        
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        session_dir = os.path.join(RESULTS_DIR, session_id)
        os.makedirs(session_dir, exist_ok=True)
        
        # Create detector for this session
        detector = RTSPDetector(
            rtsp_url=rtsp_url,
            session_id=session_id,
            output_dir=session_dir
        )
        
        # Start detection in a separate thread
        detection_thread = threading.Thread(target=detector.start_detection)
        detection_thread.daemon = True
        detection_thread.start()
        
        # Store session info
        active_sessions[session_id] = {
            "rtsp_url": rtsp_url,
            "start_time": time.time(),
            "detector": detector,
            "thread": detection_thread,
            "status": "running"
        }
        
        return jsonify({
            "session_id": session_id,
            "status": "started",
            "message": "Person detection started successfully"
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stop_detection/<session_id>', methods=['POST'])
def stop_detection(session_id):
    if session_id not in active_sessions:
        return jsonify({"error": "Session not found"}), 404
    
    try:
        # Stop the detector
        active_sessions[session_id]["detector"].stop_detection()
        active_sessions[session_id]["status"] = "stopped"
        
        return jsonify({
            "session_id": session_id,
            "status": "stopped",
            "message": "Detection stopped successfully"
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/session_status/<session_id>', methods=['GET'])
def session_status(session_id):
    if session_id not in active_sessions:
        return jsonify({"error": "Session not found"}), 404
    
    session = active_sessions[session_id]
    
    return jsonify({
        "session_id": session_id,
        "rtsp_url": session["rtsp_url"],
        "start_time": session["start_time"],
        "status": session["status"],
        "runtime": time.time() - session["start_time"]
    }), 200

@app.route('/api/detection_results/<session_id>', methods=['GET'])
def get_detection_results(session_id):
    if session_id not in active_sessions:
        return jsonify({"error": "Session not found"}), 404
    
    session_dir = os.path.join(RESULTS_DIR, session_id)
    
    try:
        # Get the latest detection results
        results = utils.get_latest_detection_results(session_dir)
        
        return jsonify({
            "session_id": session_id,
            "results": results
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessions', methods=['GET'])
def list_sessions():
    sessions_data = []
    
    for session_id, session in active_sessions.items():
        sessions_data.append({
            "session_id": session_id,
            "rtsp_url": session["rtsp_url"],
            "start_time": session["start_time"],
            "status": session["status"],
            "runtime": time.time() - session["start_time"]
        })
    
    return jsonify({"sessions": sessions_data}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)