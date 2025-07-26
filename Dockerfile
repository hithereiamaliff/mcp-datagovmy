# Use the recommended Node.js Alpine image for a small and secure base.
FROM node:18-alpine

# Set the working directory inside the container.
WORKDIR /app

# Copy package.json and package-lock.json for dependency installation.
# This is done first to leverage Docker's layer caching.
COPY package.json package-lock.json ./

# Install production dependencies.
RUN npm ci --only=production

# Copy the new, universal server entry point.
COPY mcp-server.js ./

# Expose the port the application will run on.
EXPOSE 8182

# The command to start the server.
# This directly runs the entry point with Node.
CMD ["node", "mcp-server.js"]
