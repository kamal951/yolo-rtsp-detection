FROM node:16-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
COPY package-lock.json* ./
RUN npm install

# Copy all files
COPY . .

# IMPORTANT: Ne pas définir REACT_APP_API_URL ici pour permettre 
# la configuration dynamique via docker-compose
# ENV REACT_APP_API_URL=http://backend:5000/api

# Build the app
RUN npm run build

# Install serve to serve the build
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Serve the built app instead of development server
CMD ["serve", "-s", "build", "-l", "3000"]