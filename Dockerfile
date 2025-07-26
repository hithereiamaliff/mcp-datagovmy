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

# Command to run the server directly
CMD ["node", "src/index.js"]
