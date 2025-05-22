# app.py
from flask import Flask, request, jsonify, Response, send_from_directory
from flask_cors import CORS, cross_origin
import os
import uuid
import time
import threading
from detection_service import RTSPDetector
import utils
import cv2
import numpy as np
import logging
import traceback

# Configure Flask logging to be less verbose
logging.getLogger('werkzeug').setLevel(logging.WARNING)

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Directory to save detection results
RESULTS_DIR = os.environ.get('RESULTS_DIR', '/app/detection_results')
os.makedirs(RESULTS_DIR, exist_ok=True)

# Directory to save images
IMAGES_DIR = os.environ.get('IMAGES_DIR', '/app/saved_images')
os.makedirs(IMAGES_DIR, exist_ok=True)

# Dictionary to store active detection sessions
active_sessions = {}

def run_detection_in_thread(detector, session_id):
    """Wrapper function to run detection in a thread with error handling"""
    try:
        detector.start_detection()
    except Exception as e:
        print(f"[API] Error in detection thread for session {session_id[:8]}: {e}")
        print(f"[API] Traceback: {traceback.format_exc()}")
        # Update session status to indicate error
        if session_id in active_sessions:
            active_sessions[session_id]["status"] = "error"
            active_sessions[session_id]["error"] = str(e)

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
        
        # Create session-specific directory for images
        session_images_dir = os.path.join(IMAGES_DIR, session_id)
        os.makedirs(session_images_dir, exist_ok=True)
        
        # Create detector for this session with CPU device
        detector = RTSPDetector(
            rtsp_url=rtsp_url,
            session_id=session_id,
            output_dir=session_dir,
            images_dir=IMAGES_DIR,
            device='cpu'  # Explicitly use CPU
        )
        
        # Verify that the detector has the start_detection method
        if not hasattr(detector, 'start_detection'):
            return jsonify({"error": "Detection service initialization failed"}), 500
        
        # Start detection in a separate thread with error handling
        detection_thread = threading.Thread(
            target=run_detection_in_thread, 
            args=(detector, session_id)
        )
        detection_thread.daemon = True
        detection_thread.start()
        
        # Store session info
        active_sessions[session_id] = {
            "rtsp_url": rtsp_url,
            "start_time": time.time(),
            "detector": detector,
            "thread": detection_thread,
            "status": "running",
            "images_dir": session_images_dir,
            "error": None
        }
        
        print(f"[API] New detection session started: {session_id[:8]}... for {rtsp_url}")
        print(f"[API] Images will be saved to: {session_images_dir}")
        
        return jsonify({
            "session_id": session_id,
            "status": "started",
            "message": "Person detection started successfully",
            "images_dir": session_images_dir
        }), 201
        
    except Exception as e:
        print(f"[API] Error starting detection: {e}")
        print(f"[API] Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/stop_detection/<session_id>', methods=['POST'])
def stop_detection(session_id):
    if session_id not in active_sessions:
        return jsonify({"error": "Session not found"}), 404
    
    try:
        # Stop the detector
        detector = active_sessions[session_id].get("detector")
        if detector and hasattr(detector, 'stop_detection'):
            detector.stop_detection()
        
        active_sessions[session_id]["status"] = "stopped"
        
        print(f"[API] Detection session stopped: {session_id[:8]}...")
        
        return jsonify({
            "session_id": session_id,
            "status": "stopped",
            "message": "Detection stopped successfully"
        }), 200
        
    except Exception as e:
        print(f"[API] Error stopping detection: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/session_status/<session_id>', methods=['GET'])
def session_status(session_id):
    if session_id not in active_sessions:
        return jsonify({"error": "Session not found"}), 404
    
    session = active_sessions[session_id]
    
    response_data = {
        "session_id": session_id,
        "rtsp_url": session["rtsp_url"],
        "start_time": session["start_time"],
        "status": session["status"],
        "runtime": time.time() - session["start_time"],
        "images_dir": session.get("images_dir", "")
    }
    
    # Include error information if present
    if session.get("error"):
        response_data["error"] = session["error"]
    
    return jsonify(response_data), 200

@app.route('/api/detection_results/<session_id>', methods=['GET'])
def get_detection_results(session_id):
    if session_id not in active_sessions:
        return jsonify({"error": "Session not found"}), 404
    
    session_dir = os.path.join(RESULTS_DIR, session_id)
    
    try:
        # Get the latest detection results
        results = utils.get_latest_detection_results(session_dir)
        
        # If the session has a detector with current_full_detections, add them
        detector = active_sessions[session_id].get("detector")
        if detector and hasattr(detector, 'current_full_detections') and detector.current_full_detections:
            # Add the full detections as a separate field
            full_results = []
            
            for i, result in enumerate(results):
                if i == 0 and detector.current_full_detections:
                    # Add full detections to the latest result
                    full_result = detector.current_full_detections
                    
                    # Add frame path if exists
                    if "frame_path" in result:
                        full_result["frame_path"] = result["frame_path"]
                    
                    full_results.append(full_result)
                else:
                    full_results.append(result)
                
            return jsonify({
                "session_id": session_id,
                "results": full_results,
                "include_all_classes": True,
                "images_dir": active_sessions[session_id].get("images_dir", "")
            }), 200
        
        return jsonify({
            "session_id": session_id,
            "results": results,
            "include_all_classes": False,
            "images_dir": active_sessions[session_id].get("images_dir", "")
        }), 200
        
    except Exception as e:
        print(f"[API] Error getting detection results: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/sessions', methods=['GET'])
def list_sessions():
    sessions_data = []
    
    for session_id, session in active_sessions.items():
        session_info = {
            "session_id": session_id,
            "rtsp_url": session["rtsp_url"],
            "start_time": session["start_time"],
            "status": session["status"],
            "runtime": time.time() - session["start_time"],
            "images_dir": session.get("images_dir", "")
        }
        
        # Include error information if present
        if session.get("error"):
            session_info["error"] = session["error"]
            
        sessions_data.append(session_info)
    
    return jsonify({"sessions": sessions_data}), 200

@app.route('/api/images/<session_id>/<image_name>', methods=['GET'])
def get_image(session_id, image_name):
    """
    Serve image files from the saved_images directory
    """
    session_images_dir = os.path.join(IMAGES_DIR, session_id)
    return send_from_directory(session_images_dir, image_name)

@app.route('/api/images/<session_id>', methods=['GET'])
def list_session_images(session_id):
    """
    List all images for a specific session
    """
    session_images_dir = os.path.join(IMAGES_DIR, session_id)
    
    if not os.path.exists(session_images_dir):
        return jsonify({"error": "Session images directory not found"}), 404
    
    try:
        image_files = [f for f in os.listdir(session_images_dir) if f.endswith('.jpg')]
        image_files.sort(key=lambda x: os.path.getmtime(os.path.join(session_images_dir, x)), reverse=True)
        
        # Create full URLs for each image
        base_url = request.host_url.rstrip('/')
        images = []
        
        for image_file in image_files:
            image_type = "original" if image_file.startswith("original_") else "annotated"
            timestamp = image_file.split('_', 1)[1].rsplit('.', 1)[0]
            
            images.append({
                "filename": image_file,
                "type": image_type,
                "timestamp": timestamp,
                "url": f"{base_url}/api/images/{session_id}/{image_file}"
            })
        
        return jsonify({
            "session_id": session_id,
            "image_count": len(images),
            "images": images
        }), 200
        
    except Exception as e:
        print(f"[API] Error listing images: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/stream/<session_id>')
@cross_origin()
def video_feed(session_id):
    """
    Video streaming route. Put this in the src attribute of an img tag.
    """
    def generate():
        if session_id not in active_sessions:
            yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + utils.create_error_frame("Session not found") + b'\r\n'
            return
        
        detector = active_sessions[session_id].get("detector")
        if not detector:
            yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + utils.create_error_frame("Detector not found") + b'\r\n'
            return
        
        # Check if session is running
        if active_sessions[session_id]["status"] != "running":
            yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + utils.create_error_frame("Session not running") + b'\r\n'
            return
        
        while active_sessions[session_id]["status"] == "running":
            try:
                # Get the current processed frame from detector
                if hasattr(detector, 'current_frame') and detector.current_frame is not None:
                    # Create a copy of the frame with bounding boxes
                    annotated_frame = detector.current_frame.copy()
                    
                    # Draw bounding boxes for all detected objects
                    if hasattr(detector, 'current_full_detections') and detector.current_full_detections:
                        # Different colors for different classes
                        colors = {
                            "person": (0, 255, 0),  # Green for persons
                            "car": (0, 0, 255),     # Red for cars
                            "animal": (255, 0, 0)   # Blue for animals
                        }
                        
                        for det in detector.current_full_detections["detections"]:
                            bbox = det["bbox"]
                            x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
                            conf = det["confidence"]
                            class_name = det["class"]
                            
                            # Draw bounding box with class-specific color
                            color = colors.get(class_name, (255, 255, 255))
                            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                            
                            # Add label
                            label = f"{class_name}: {conf:.2f}"
                            cv2.putText(annotated_frame, label, (x1, y1 - 10),
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                    
                    # Add a timestamp
                    cv2.putText(
                        annotated_frame,
                        f"Session: {session_id[:8]}... | Frame: {getattr(detector, 'frame_count', 0)}",
                        (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7,
                        (255, 255, 255),
                        2
                    )
                    
                    # Encode to JPEG format with better quality
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
                    ret, buffer = cv2.imencode('.jpg', annotated_frame, encode_param)
                    
                    if ret:
                        frame = buffer.tobytes()
                        yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
                    else:
                        yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + utils.create_error_frame("Encoding error") + b'\r\n'
                else:
                    # If no frame is available, yield a placeholder
                    yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + utils.create_error_frame("No frame available") + b'\r\n'
                
                # Sleep briefly to control frame rate
                time.sleep(0.1)  # 10 FPS for better performance on CPU
                
            except Exception as e:
                print(f"Error generating frame: {e}")
                yield b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + utils.create_error_frame(f"Error: {str(e)}") + b'\r\n'
                time.sleep(1)  # Longer delay on error
    
    return Response(
        generate(),
        mimetype='multipart/x-mixed-replace; boundary=frame',
        headers={
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    )

if __name__ == '__main__':
    print("[API] RTSP Detection System starting...")
    print(f"[API] Detection results will be saved to: {RESULTS_DIR}")
    print(f"[API] Images will be saved to: {IMAGES_DIR}")
    app.run(host='0.0.0.0', port=5000, debug=False)