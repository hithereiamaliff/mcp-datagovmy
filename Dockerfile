FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application code
COPY . .

# Expose the port
EXPOSE 8182

# Simple command to run the server
CMD ["node", "server.cjs"]
