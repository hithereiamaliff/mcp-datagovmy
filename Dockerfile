FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8182

# Expose the port the app runs on
EXPOSE 8182

# Create a simple startup script for Smithery compatibility
RUN echo '#!/bin/sh
node -e "require(\"./smithery-entry.js\")({ config: require(\"./smithery.config.cjs\") })"' > start.sh && \
    chmod +x start.sh

# Command to run the entry point
CMD ["./start.sh"]
