# detection_service.py
import cv2
import torch
import json
import time
import os
import threading
from datetime import datetime
import numpy as np
from ultralytics import YOLO

class RTSPDetector:
    def __init__(self, rtsp_url, session_id, output_dir, 
                 model_name="yolov8n.pt", 
                 confidence=0.5,
                 save_interval=1.0,  # Save results every 1 second
                 person_class_id=0):  # Person class ID in COCO dataset
        
        self.rtsp_url = rtsp_url
        self.session_id = session_id
        self.output_dir = output_dir
        self.model_name = model_name
        self.confidence = confidence
        self.save_interval = save_interval
        self.person_class_id = person_class_id
        
        self.running = False
        self.last_save_time = 0
        self.frame_count = 0
        self.current_frame = None
        self.current_results = None
        
        # Initialize model
        try:
            self.model = YOLO(model_name)
            print(f"Model {model_name} loaded successfully")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def start_detection(self):
        """Start the detection process on the RTSP stream"""
        self.running = True
        
        try:
            # Open RTSP stream
            cap = cv2.VideoCapture(self.rtsp_url)
            
            if not cap.isOpened():
                raise Exception(f"Could not open RTSP stream: {self.rtsp_url}")
            
            print(f"Successfully opened RTSP stream: {self.rtsp_url}")
            
            # Main detection loop
            while self.running:
                ret, frame = cap.read()
                
                if not ret:
                    print("Failed to read frame, retrying...")
                    time.sleep(1)
                    # Reopen the stream if reading fails
                    cap.release()
                    cap = cv2.VideoCapture(self.rtsp_url)
                    continue
                
                self.frame_count += 1
                self.current_frame = frame
                
                # Run detection
                results = self.model(frame, conf=self.confidence)
                
                # Process results
                self._process_results(results, frame)
                
                # Save results at intervals
                current_time = time.time()
                if current_time - self.last_save_time >= self.save_interval:
                    self._save_results()
                    self.last_save_time = current_time
            
            # Clean up
            cap.release()
            print(f"Detection stopped for session {self.session_id}")
            
        except Exception as e:
            print(f"Error in detection process: {e}")
            self.running = False
    
    def stop_detection(self):
        """Stop the detection process"""
        self.running = False
    
    def _process_results(self, results, frame):
        """Process detection results"""
        # Get frame dimensions
        height, width = frame.shape[:2]
        
        detections = []
        if len(results) > 0:
            # Process first result (we're processing one frame at a time)
            result = results[0]
            
            for i, det in enumerate(result.boxes):
                # Check if detection is a person
                if int(det.cls) == self.person_class_id:
                    # Get bounding box coordinates
                    box = det.xyxy[0].tolist()  # Convert tensor to list
                    
                    # Calculate relative coordinates (normalized)
                    rel_box = [
                        box[0] / width,   # x1
                        box[1] / height,  # y1
                        box[2] / width,   # x2
                        box[3] / height   # y2
                    ]
                    
                    # Add detection
                    detections.append({
                        "id": i,
                        "class": "person",
                        "confidence": float(det.conf),
                        "bbox": [float(x) for x in box],  # Absolute coordinates
                        "rel_bbox": [float(x) for x in rel_box]  # Relative coordinates
                    })
        
        # Store current results
        self.current_results = {
            "timestamp": datetime.now().isoformat(),
            "frame_id": self.frame_count,
            "detections": detections,
            "total_persons": len(detections)
        }
    
    def _save_results(self):
        """Save detection results to file"""
        if self.current_results is None:
            return
        
        # Create timestamp for filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        
        # Save detection results as JSON
        results_file = os.path.join(self.output_dir, f"detection_{timestamp}.json")
        with open(results_file, 'w') as f:
            json.dump(self.current_results, f)
        
        # Optionally save frame with detections
        if self.current_frame is not None:
            # Draw bounding boxes on a copy of the frame
            annotated_frame = self.current_frame.copy()
            
            for det in self.current_results["detections"]:
                bbox = det["bbox"]
                x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
                conf = det["confidence"]
                
                # Draw bounding box
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                
                # Add label
                label = f"Person: {conf:.2f}"
                cv2.putText(annotated_frame, label, (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Save annotated frame
            frame_file = os.path.join(self.output_dir, f"frame_{timestamp}.jpg")
            cv2.imwrite(frame_file, annotated_frame)
        
        print(f"Saved detection results for session {self.session_id}, frame {self.frame_count}")