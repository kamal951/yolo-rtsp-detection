FROM python:3.9-slim

# Install dependencies for OpenCV and CPU optimization
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg \
    libgomp1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install PyTorch CPU version explicitly first
RUN pip install --no-cache-dir torch==2.0.1 torchvision==0.15.2 --index-url https://download.pytorch.org/whl/cpu

# Install other requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for detection results and saved images
RUN mkdir -p /app/detection_results
RUN mkdir -p /app/saved_images

# Set environment variables for CPU optimization
ENV OMP_NUM_THREADS=4
ENV MKL_NUM_THREADS=4
ENV NUMBA_NUM_THREADS=4
ENV TORCH_NUM_THREADS=4

# Expose API port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]