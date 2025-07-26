FROM node:18-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8182

# Expose the port the app runs on
EXPOSE 8182

# Command to run the non-interactive container entry point
CMD ["node", "container-start.js"]
