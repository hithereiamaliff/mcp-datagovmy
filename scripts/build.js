#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure scripts directory exists
const scriptsDir = path.join(__dirname);
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

console.log('🚀 Building Malaysia Open Data MCP...');

try {
  // Clean previous build
  console.log('📦 Cleaning previous build...');
  if (fs.existsSync(path.join(__dirname, '..', 'dist'))) {
    if (process.platform === 'win32') {
      execSync('cmd.exe /c rmdir /s /q dist', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } else {
      execSync('rm -rf dist', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    }
  }

  // Run TypeScript compiler
  console.log('📦 Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // Copy smithery.yaml to dist
  console.log('📦 Copying configuration files...');
  fs.copyFileSync(
    path.join(__dirname, '..', 'smithery.yaml'),
    path.join(__dirname, '..', 'dist', 'smithery.yaml')
  );

  console.log('✅ Build completed successfully!');
  console.log('\nTo start the development server:');
  console.log('  npx @smithery/cli dev');
  console.log('\nTo deploy to Smithery:');
  console.log('  npx @smithery/cli deploy');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
