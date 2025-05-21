# RTSP Person Detection System

This project provides a full-stack solution for processing RTSP video streams to detect persons using Ultralytics YOLOv8. It consists of a Python Flask backend for video processing and a React frontend for user interaction.

## Features

- Process RTSP video streams and detect persons using YOLOv8
- Start/stop detection sessions from the frontend
- View real-time detection results with bounding boxes
- Track multiple detection sessions
- Save detection results for later analysis

## System Architecture

The system is composed of two main containers:

1. **Backend Container**:
   - Flask API server for handling client requests
   - YOLOv8 person detection using Ultralytics
   - OpenCV for video stream processing
   - Detection results storage

2. **Frontend Container**:
   - React-based user interface
   - Session management
   - Detection results visualization

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
│   ├── detection_service.py  # YOLOv8 detection
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
- Implement motion detection to trigger person detection
- Support multiple object classes beyond just person detection
- Add recording capabilities for detected events
- Integrate with notification systems

## License

This project is licensed under the MIT License - see the LICENSE file for details.