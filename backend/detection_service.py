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
                 # COCO class IDs: 0-person, 2-car, 16-dog (representing animals)
                 detect_classes=[0, 2, 16],
                 save_classes=[0],   # Only save person detections
                 images_dir=None):   # Directory for saved images
        
        self.rtsp_url = rtsp_url
        self.session_id = session_id
        self.output_dir = output_dir
        self.images_dir = images_dir or os.environ.get('IMAGES_DIR', '/app/saved_images')
        self.model_name = model_name
        self.confidence = confidence
        self.save_interval = save_interval
        self.detect_classes = detect_classes
        self.save_classes = save_classes
        
        # Class name mapping
        self.class_names = {
            0: "person",
            2: "car",
            16: "animal"  # Using dog as a representative for animals
        }
        
        self.running = False
        self.last_save_time = 0
        self.frame_count = 0
        self.current_frame = None
        self.current_results = None
        self.current_full_detections = None  # Store all detections (person, car, animal)
        
        # Ensure images directory exists
        os.makedirs(self.images_dir, exist_ok=True)
        
        # Create session-specific directory for images
        self.session_images_dir = os.path.join(self.images_dir, session_id)
        os.makedirs(self.session_images_dir, exist_ok=True)
        
        # Initialize model
        try:
            # Disable verbose output from YOLO model
            import logging
            logging.getLogger("ultralytics").setLevel(logging.WARNING)
            
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
            
            print(f"[Session {self.session_id[:8]}] Detection started on stream: {self.rtsp_url}")
            print(f"[Session {self.session_id[:8]}] Saving images to: {self.session_images_dir}")
            
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
                results = self.model(frame, conf=self.confidence, verbose=False)
                
                # Process results
                self._process_results(results, frame)
                
                # Save results at intervals
                current_time = time.time()
                if current_time - self.last_save_time >= self.save_interval:
                    self._save_results()
                    self.last_save_time = current_time
            
            # Clean up
            cap.release()
            print(f"[Session {self.session_id[:8]}] Detection stopped")
            
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
        
        saved_detections = []    # Detections to be saved (persons only)
        all_detections = []      # All detections for display (persons, cars, animals)
        
        if len(results) > 0:
            # Process first result (we're processing one frame at a time)
            result = results[0]
            
            for i, det in enumerate(result.boxes):
                class_id = int(det.cls)
                
                # Check if this class should be detected (person, car, or animal)
                if class_id in self.detect_classes:
                    # Get bounding box coordinates
                    box = det.xyxy[0].tolist()  # Convert tensor to list
                    
                    # Calculate relative coordinates (normalized)
                    rel_box = [
                        box[0] / width,   # x1
                        box[1] / height,  # y1
                        box[2] / width,   # x2
                        box[3] / height   # y2
                    ]
                    
                    # Map class ID to name (use "animal" for class 16)
                    class_name = self.class_names.get(class_id, "unknown")
                    
                    # Create detection object
                    detection = {
                        "id": i,
                        "class": class_name,
                        "class_id": class_id,
                        "confidence": float(det.conf),
                        "bbox": [float(x) for x in box],  # Absolute coordinates
                        "rel_bbox": [float(x) for x in rel_box]  # Relative coordinates
                    }
                    
                    # Add to all detections list
                    all_detections.append(detection)
                    
                    # Also add to saved detections if it's in save_classes
                    if class_id in self.save_classes:
                        saved_detections.append(detection)
        
        # Store detections for saving (persons only)
        self.current_results = {
            "timestamp": datetime.now().isoformat(),
            "frame_id": self.frame_count,
            "detections": saved_detections,
            "total_persons": len(saved_detections)
        }
        
        # Store all detections for display (persons, cars, animals)
        self.current_full_detections = {
            "timestamp": datetime.now().isoformat(),
            "frame_id": self.frame_count,
            "detections": all_detections,
            "detection_counts": {
                "person": sum(1 for d in all_detections if d["class"] == "person"),
                "car": sum(1 for d in all_detections if d["class"] == "car"),
                "animal": sum(1 for d in all_detections if d["class"] == "animal")
            },
            "total_detections": len(all_detections)
        }
        
        # Log only when we find objects (to reduce verbose output)
        if all_detections:
            counts = self.current_full_detections["detection_counts"]
            print(f"[Session {self.session_id[:8]}] Detected: {counts['person']} persons, {counts['car']} cars, {counts['animal']} animals")
    
    def _save_results(self):
        """Save detection results to file (persons only)"""
        if self.current_results is None:
            return
        
        # Create timestamp for filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        
        # Save detection results as JSON (persons only)
        results_file = os.path.join(self.output_dir, f"detection_{timestamp}.json")
        with open(results_file, 'w') as f:
            json.dump(self.current_results, f)
        
        # Save both the original frame and the annotated frame if we have detections
        if self.current_frame is not None and self.current_full_detections["total_detections"] > 0:
            # Save original frame to the images directory
            original_frame_file = os.path.join(self.session_images_dir, f"original_{timestamp}.jpg")
            cv2.imwrite(original_frame_file, self.current_frame)
            
            # Draw bounding boxes on a copy of the frame
            annotated_frame = self.current_frame.copy()
            
            # Different colors for different classes
            colors = {
                "person": (0, 255, 0),  # Green for persons
                "car": (0, 0, 255),     # Red for cars
                "animal": (255, 0, 0)   # Blue for animals
            }
            
            for det in self.current_full_detections["detections"]:
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
            
            # Add a timestamp and session info
            cv2.putText(
                annotated_frame,
                f"Session: {self.session_id[:8]}... | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2
            )
            
            # Save annotated frame to both directories
            annotated_frame_file = os.path.join(self.output_dir, f"frame_{timestamp}.jpg")
            cv2.imwrite(annotated_frame_file, annotated_frame)
            
            # Also save to the images directory
            annotated_image_file = os.path.join(self.session_images_dir, f"annotated_{timestamp}.jpg")
            cv2.imwrite(annotated_image_file, annotated_frame)
            
            # Update the current_results to include the image paths
            self.current_results["original_image_path"] = original_frame_file
            self.current_results["annotated_image_path"] = annotated_image_file
        
        # Only log when we're actually saving results with detections
        if self.current_results and self.current_results["detections"]:
            print(f"[Session {self.session_id[:8]}] Saved frame {self.frame_count} with {self.current_results['total_persons']} persons")