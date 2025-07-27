#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Deploying Malaysia Open Data MCP to Smithery...');

try {
  // Build the project first
  console.log('📦 Building the project...');
  execSync('cmd.exe /c npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // Deploy to Smithery
  console.log('🚀 Deploying to Smithery...');
  execSync('cmd.exe /c npx @smithery/cli deploy', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  console.log('✅ Deployment completed successfully!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
