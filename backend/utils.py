# utils.py
import os
import re
import json
import glob
from datetime import datetime

def validate_rtsp_url(url):
    """
    Validate if the given URL is a proper RTSP URL
    """
    # Basic pattern for RTSP URLs
    rtsp_pattern = r'^rtsp://(?:[\w\.@:%-]+)+(?:/[\w\.%-]+)+(?:\?[\w=&\.-]+)?$'
    
    # Allow some common RTSP formats that might not match the strict pattern
    if url.startswith('rtsp://'):
        return True
    
    return bool(re.match(rtsp_pattern, url))

def get_latest_detection_results(session_dir, limit=10):
    """
    Get the latest detection results from the session directory
    """
    # Find all detection JSON files
    json_files = glob.glob(os.path.join(session_dir, 'detection_*.json'))
    
    # Sort by modification time (most recent first)
    json_files.sort(key=os.path.getmtime, reverse=True)
    
    # Limit the number of results
    json_files = json_files[:limit]
    
    results = []
    for json_file in json_files:
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
                
                # Get corresponding frame file if it exists
                base_timestamp = os.path.basename(json_file).replace('detection_', '').replace('.json', '')
                frame_file = os.path.join(session_dir, f'frame_{base_timestamp}.jpg')
                
                # Add frame path if exists
                if os.path.exists(frame_file):
                    data['frame_path'] = frame_file
                
                results.append(data)
        except Exception as e:
            print(f"Error reading detection file {json_file}: {e}")
    
    return results

def get_session_statistics(session_dir):
    """
    Calculate statistics for a detection session
    """
    json_files = glob.glob(os.path.join(session_dir, 'detection_*.json'))
    
    if not json_files:
        return {
            "total_frames_processed": 0,
            "total_persons_detected": 0,
            "avg_persons_per_frame": 0
        }
    
    total_frames = len(json_files)
    total_persons = 0
    
    for json_file in json_files:
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
                total_persons += data.get("total_persons", 0)
        except Exception:
            pass
    
    return {
        "total_frames_processed": total_frames,
        "total_persons_detected": total_persons,
        "avg_persons_per_frame": total_persons / total_frames if total_frames > 0 else 0
    }

def parse_timestamp(timestamp_str):
    """
    Parse ISO format timestamp into datetime object
    """
    return datetime.fromisoformat(timestamp_str)