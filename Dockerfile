# Use Node.js slim for a small and secure base image
FROM node:22-slim

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

# Build with specific Smithery CLI version
RUN npx -y @smithery/cli@1.2.14 build -o .smithery/index.cjs

# Copy smithery.yaml to dist directory
RUN mkdir -p dist && cp smithery.yaml dist/

# Expose the port the application runs on
EXPOSE 8182

# Start the server using Smithery with specific version
CMD ["npx", "@smithery/cli@1.2.14", "serve"]
