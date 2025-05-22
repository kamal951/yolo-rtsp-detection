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
                 save_interval=1.0,
                 detect_classes=[0, 2, 16],
                 save_classes=[0],
                 images_dir=None,
                 device='cpu'):
        
        self.rtsp_url = rtsp_url
        self.session_id = session_id
        self.output_dir = output_dir
        self.images_dir = images_dir or os.environ.get('IMAGES_DIR', '/app/saved_images')
        self.model_name = model_name
        self.confidence = confidence
        self.save_interval = save_interval
        self.detect_classes = detect_classes
        self.save_classes = save_classes
        
        # Force CPU usage
        self.device = device if device else 'cpu'
        
        # Set PyTorch to use CPU
        torch.set_num_threads(4)
        
        # Class name mapping
        self.class_names = {
            0: "person",
            2: "car",
            16: "animal"
        }
        
        self.running = False
        self.last_save_time = 0
        self.frame_count = 0
        self.current_frame = None
        self.current_results = None
        self.current_full_detections = None
        
        # Ensure images directory exists
        os.makedirs(self.images_dir, exist_ok=True)
        
        # Create session-specific directory for images
        self.session_images_dir = os.path.join(self.images_dir, session_id)
        os.makedirs(self.session_images_dir, exist_ok=True)
        
        # Initialize model with CPU
        try:
            import logging
            logging.getLogger("ultralytics").setLevel(logging.WARNING)
            
            self.model = YOLO(model_name)
            # Explicitly move model to CPU
            if hasattr(self.model, 'to'):
                self.model.to(self.device)
            print(f"Model {model_name} loaded successfully on {self.device}")
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def start_detection(self):
        """Start the detection process on the RTSP stream"""
        self.running = True
        
        try:
            # Open RTSP stream with optimized settings
            cap = cv2.VideoCapture(self.rtsp_url)
            
            # Set buffer size to reduce latency
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            # Set frame rate
            cap.set(cv2.CAP_PROP_FPS, 10)
            
            if not cap.isOpened():
                raise Exception(f"Could not open RTSP stream: {self.rtsp_url}")
            
            print(f"[Session {self.session_id[:8]}] Detection started on stream: {self.rtsp_url}")
            print(f"[Session {self.session_id[:8]}] Using device: {self.device}")
            print(f"[Session {self.session_id[:8]}] Saving images to: {self.session_images_dir}")
            
            frame_skip = 0  # Process every frame initially
            
            # Main detection loop
            while self.running:
                ret, frame = cap.read()
                
                if not ret:
                    print("Failed to read frame, retrying...")
                    time.sleep(1)
                    cap.release()
                    cap = cv2.VideoCapture(self.rtsp_url)
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    cap.set(cv2.CAP_PROP_FPS, 10)
                    continue
                
                self.frame_count += 1
                
                # Always update current frame for streaming
                self.current_frame = frame.copy()
                
                # Process detection every few frames to reduce CPU load
                if frame_skip == 0:
                    # Run detection on CPU with optimized settings
                    results = self.model(
                        frame, 
                        conf=self.confidence, 
                        verbose=False,
                        device=self.device,
                        half=False  # Disable half precision for CPU
                    )
                    
                    # Process results
                    self._process_results(results, frame)
                    
                    # Save results at intervals
                    current_time = time.time()
                    if current_time - self.last_save_time >= self.save_interval:
                        self._save_results()
                        self.last_save_time = current_time
                    
                    frame_skip = 2  # Skip next 2 frames for performance
                else:
                    frame_skip -= 1
                
                # Small delay to prevent CPU overload
                time.sleep(0.05)  # 20 FPS max
            
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
        height, width = frame.shape[:2]
        
        saved_detections = []
        all_detections = []
        
        if len(results) > 0:
            result = results[0]
            
            if result.boxes is not None and len(result.boxes) > 0:
                for i, det in enumerate(result.boxes):
                    class_id = int(det.cls)
                    
                    if class_id in self.detect_classes:
                        box = det.xyxy[0].tolist()
                        
                        rel_box = [
                            box[0] / width,
                            box[1] / height,
                            box[2] / width,
                            box[3] / height
                        ]
                        
                        class_name = self.class_names.get(class_id, "unknown")
                        
                        detection = {
                            "id": i,
                            "class": class_name,
                            "class_id": class_id,
                            "confidence": float(det.conf),
                            "bbox": [float(x) for x in box],
                            "rel_bbox": [float(x) for x in rel_box]
                        }
                        
                        all_detections.append(detection)
                        
                        if class_id in self.save_classes:
                            saved_detections.append(detection)
        
        self.current_results = {
            "timestamp": datetime.now().isoformat(),
            "frame_id": self.frame_count,
            "detections": saved_detections,
            "total_persons": len(saved_detections)
        }
        
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
        
        if all_detections:
            counts = self.current_full_detections["detection_counts"]
            print(f"[Session {self.session_id[:8]}] Detected: {counts['person']} persons, {counts['car']} cars, {counts['animal']} animals")
    
    def _save_results(self):
        """Save detection results to file"""
        if self.current_results is None:
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        
        results_file = os.path.join(self.output_dir, f"detection_{timestamp}.json")
        with open(results_file, 'w') as f:
            json.dump(self.current_results, f)
        
        if self.current_frame is not None and self.current_full_detections["total_detections"] > 0:
            original_frame_file = os.path.join(self.session_images_dir, f"original_{timestamp}.jpg")
            cv2.imwrite(original_frame_file, self.current_frame)
            
            annotated_frame = self.current_frame.copy()
            
            colors = {
                "person": (0, 255, 0),
                "car": (0, 0, 255),
                "animal": (255, 0, 0)
            }
            
            for det in self.current_full_detections["detections"]:
                bbox = det["bbox"]
                x1, y1, x2, y2 = int(bbox[0]), int(bbox[1]), int(bbox[2]), int(bbox[3])
                conf = det["confidence"]
                class_name = det["class"]
                
                color = colors.get(class_name, (255, 255, 255))
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                
                label = f"{class_name}: {conf:.2f}"
                cv2.putText(annotated_frame, label, (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            cv2.putText(
                annotated_frame,
                f"Session: {self.session_id[:8]}... | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 255),
                2
            )
            
            annotated_frame_file = os.path.join(self.output_dir, f"frame_{timestamp}.jpg")
            cv2.imwrite(annotated_frame_file, annotated_frame)
            
            annotated_image_file = os.path.join(self.session_images_dir, f"annotated_{timestamp}.jpg")
            cv2.imwrite(annotated_image_file, annotated_frame)
            
            self.current_results["original_image_path"] = original_frame_file
            self.current_results["annotated_image_path"] = annotated_image_file
        
        if self.current_results and self.current_results["detections"]:
            print(f"[Session {self.session_id[:8]}] Saved frame {self.frame_count} with {self.current_results['total_persons']} persons")