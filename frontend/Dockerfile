FROM node:16-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
COPY package-lock.json* ./
RUN npm install

# Copy all files
COPY . .

# Set environment variables
ENV REACT_APP_API_URL=http://backend:5000/api

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]