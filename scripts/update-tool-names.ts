/**
 * Script to update all tool names with the datagovmy_ prefix
 * 
 * This script will:
 * 1. Find all server.tool() calls in the src directory
 * 2. Update them to use prefixToolName() helper
 * 3. Create a report of all changes made
 */

import * as fs from 'fs';
import * as path from 'path';

// Define the directory to search
const srcDir = path.join(process.cwd(), 'src');

// Regular expression to find server.tool calls
const toolRegex = /server\.tool\(\s*['"]([^'"]+)['"]/g;

// Function to process a file
function processFile(filePath: string): { file: string, changes: { original: string, updated: string }[] } {
  // Read the file content
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Find all tool registrations
  const changes: { original: string, updated: string }[] = [];
  let match;
  
  // Add the import if it doesn't exist
  if (!content.includes("import { prefixToolName }")) {
    // Find the last import statement
    const lastImportIndex = content.lastIndexOf('import');
    if (lastImportIndex !== -1) {
      const endOfImport = content.indexOf(';', lastImportIndex) + 1;
      const beforeImports = content.substring(0, endOfImport);
      const afterImports = content.substring(endOfImport);
      content = beforeImports + "\nimport { prefixToolName } from './utils/tool-naming.js';" + afterImports;
    }
  }
  
  // Replace all tool registrations
  while ((match = toolRegex.exec(originalContent)) !== null) {
    const toolName = match[1];
    const original = `server.tool(\n    '${toolName}'`;
    const updated = `server.tool(\n    prefixToolName('${toolName}')`;
    
    // Only update if the tool name doesn't already have the prefix
    if (!toolName.startsWith('datagovmy_')) {
      content = content.replace(
        `server.tool(\n    '${toolName}'`, 
        `server.tool(\n    prefixToolName('${toolName}')`
      );
      content = content.replace(
        `server.tool('${toolName}'`, 
        `server.tool(prefixToolName('${toolName}')`
      );
      changes.push({ original: toolName, updated: `datagovmy_${toolName}` });
    }
  }
  
  // Write the updated content back to the file
  if (originalContent !== content) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
  
  return { file: filePath, changes };
}

// Function to recursively process all files in a directory
function processDirectory(dir: string): { file: string, changes: { original: string, updated: string }[] }[] {
  const results: { file: string, changes: { original: string, updated: string }[] }[] = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      results.push(...processDirectory(filePath));
    } else if (stats.isFile() && (file.endsWith('.ts') || file.endsWith('.js'))) {
      const result = processFile(filePath);
      if (result.changes.length > 0) {
        results.push(result);
      }
    }
  }
  
  return results;
}

// Main function
function main() {
  console.log('Updating tool names with datagovmy_ prefix...');
  
  // Process all files
  const results = processDirectory(srcDir);
  
  // Print the results
  console.log('\nChanges made:');
  let totalChanges = 0;
  
  for (const result of results) {
    console.log(`\nFile: ${path.relative(process.cwd(), result.file)}`);
    for (const change of result.changes) {
      console.log(`  ${change.original} -> ${change.updated}`);
      totalChanges++;
    }
  }
  
  console.log(`\nTotal changes: ${totalChanges}`);
}

main();
