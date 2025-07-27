# Use Node.js Alpine for a small and secure base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies for building
RUN npm ci

# Copy source code and configuration
COPY tsconfig.json ./
COPY smithery.yaml ./
COPY src ./src
COPY scripts ./scripts

# Build TypeScript code
RUN npm run build

# Copy smithery.yaml to dist directory
RUN mkdir -p dist && cp smithery.yaml dist/

# Expose the port the application runs on
EXPOSE 8182

# Start the server using Smithery
CMD ["npx", "@smithery/cli", "serve"]
