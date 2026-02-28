# Malaysia Open Data MCP Server - Streamable HTTP
# For self-hosting on VPS with nginx reverse proxy

FROM node:22-slim

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code and configuration
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript code
RUN npm run build

# Remove devDependencies after build
RUN npm prune --production

# Expose port for HTTP server
EXPOSE 8080

# Environment variables (can be overridden at runtime)
ENV PORT=8080
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the HTTP server
CMD ["node", "dist/http-server.js"]
