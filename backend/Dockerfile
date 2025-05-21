FROM python:3.9-slim

# Install dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for detection results and saved images
RUN mkdir -p /app/detection_results
RUN mkdir -p /app/saved_images

# Expose API port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]