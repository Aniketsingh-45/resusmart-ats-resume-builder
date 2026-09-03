# Multi-platform universal Dockerfile for ResuSmart
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for optimal Docker layer caching
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Expose server port
EXPOSE 3000

# Environment setup
ENV PORT=3000
ENV NODE_ENV=development

# Start development / hybrid server
CMD ["npm", "run", "dev"]
