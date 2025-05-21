# RTSP Person Detection System

This project provides a full-stack solution for processing RTSP video streams to detect persons, cars, and animals using Ultralytics YOLOv8. It consists of a Python Flask backend for video processing and a React frontend for user interaction.

## Features

- Process RTSP video streams and detect multiple object classes (persons, cars, and animals) using YOLOv8
- Display all detections in real-time with color-coded bounding boxes
- Start/stop detection sessions from the frontend
- Save person detections for later analysis (cars and animals are displayed but not saved)
- Track multiple detection sessions
- View detection statistics and history

## System Architecture

The system is composed of two main containers:

1. **Backend Container**:
   - Flask API server for handling client requests
   - YOLOv8 object detection using Ultralytics
   - OpenCV for video stream processing
   - Detection results storage (person detections only)

2. **Frontend Container**:
   - React-based user interface
   - Session management
   - Multi-class detection results visualization
   - Color-coded display of different object classes

## Requirements

- Docker and Docker Compose
- NVIDIA GPU with CUDA support (recommended)
- RTSP video stream source(s)

## Getting Started

### Clone the Repository

```bash
git clone <repository-url>
cd rtsp-detection-system
```

### Start the Containers

```bash
docker-compose up -d
```

This will:
- Build the backend and frontend images
- Start the containers
- Make the frontend available at http://localhost:3000
- Make the backend API available at http://localhost:5000

### Access the UI

Open your browser and navigate to http://localhost:3000 to access the frontend interface.

## Usage

1. Enter an RTSP URL in the format `rtsp://username:password@ip-address:port/stream`
2. Click "Start Detection" to begin processing the video stream
3. View real-time detection results in the dashboard
4. Stop the detection when finished

## Detection Details

- **Persons**: Displayed with green bounding boxes and saved to the database
- **Cars**: Displayed with red bounding boxes (not saved)
- **Animals**: Displayed with blue bounding boxes (not saved)

Only person detections are saved for historical analysis, but all object types are visible in the real-time stream display.

## API Endpoints

### Backend API

- `POST /api/start_detection`: Start a new detection session with an RTSP URL
- `POST /api/stop_detection/<session_id>`: Stop an active detection session
- `GET /api/detection_results/<session_id>`: Get detection results for a session
- `GET /api/session_status/<session_id>`: Get status of a detection session
- `GET /api/sessions`: List all active detection sessions

## NVIDIA GPU Support

The backend container is configured to use NVIDIA GPUs if available. Make sure you have the NVIDIA Docker runtime installed to take advantage of GPU acceleration.

## Project Structure

```
rtsp-detection-system/
├── backend/              # Python Flask backend
│   ├── app.py            # Main API server
│   ├── detection_service.py  # YOLOv8 multi-class detection
│   ├── utils.py          # Utility functions
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Backend container
├── frontend/             # React frontend
│   ├── src/              # React source code
│   │   ├── components/   # UI components
│   │   └── services/     # API services
│   └── Dockerfile        # Frontend container
└── docker-compose.yml    # Container orchestration
```

## Configuration

- Backend environment variables are set in `docker-compose.yml`
- Frontend API URL is set in the frontend Dockerfile as `REACT_APP_API_URL`

## Troubleshooting

- If detection performance is slow, ensure GPU acceleration is working properly
- For RTSP connection issues, verify the URL format and network connectivity
- Check container logs for specific error messages:
  ```bash
  docker logs rtsp-detection-backend
  docker logs rtsp-detection-frontend
  ```

## Extending the Project

- Add authentication for secure access
- Implement motion detection to trigger object detection
- Support additional object classes beyond persons, cars, and animals
- Add recording capabilities for detected events
- Integrate with notification systems

## License

This project is licensed under the MIT License - see the LICENSE file for details