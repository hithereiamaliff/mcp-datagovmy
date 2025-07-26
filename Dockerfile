FROM node:18-alpine

WORKDIR /app

# Copy only the minimal files needed
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy minimal server implementation
COPY minimal-server.js ./

# Expose the port
EXPOSE 8182

# Simple command to run the minimal server
CMD ["node", "-e", "require('http').createServer((req, res) => { if (req.url === '/') { res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({status: 'ok', message: 'Malaysia Open Data MCP Server'})); } else { const server = require('./minimal-server.js')({sessionId: 'test'}); const tools = server.connect(); res.writeHead(200, {'Content-Type': 'application/json'}); res.end(JSON.stringify({tools: Object.keys(tools)})); } }).listen(8182, () => console.log('Server running on port 8182'));"]
