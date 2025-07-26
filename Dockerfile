# Use Node.js Alpine for a small and secure base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy only the necessary files
COPY package.json package-lock.json ./
COPY index.js ./

# Install only production dependencies
RUN npm ci --only=production

# Expose the port the application runs on
EXPOSE 8182

# Start the server
CMD ["node", "index.js"]
