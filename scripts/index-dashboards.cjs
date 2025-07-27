/**
 * Script to generate a dashboard index file from individual dashboard JSON files
 */
const fs = require('fs');
const path = require('path');

// Path to dashboards directory
const dashboardsDir = path.join(process.cwd(), 'dashboards');

// Path to output file
const outputFile = path.join(process.cwd(), 'scripts', 'dashboards-index.js');

// Read all dashboard files
try {
  console.log('Reading dashboard files from:', dashboardsDir);
  const files = fs.readdirSync(dashboardsDir).filter(file => file.endsWith('.json'));
  console.log(`Found ${files.length} dashboard files`);
  
  // Read and parse each file
  const dashboards = files.map(file => {
    try {
      const content = fs.readFileSync(path.join(dashboardsDir, file), 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading dashboard file ${file}:`, error);
      return null;
    }
  }).filter(Boolean);
  
  // Generate the output file content
  const timestamp = new Date().toISOString();
  const outputContent = `// Generated from local dashboard files
// Timestamp: ${timestamp}
// Total dashboards: ${dashboards.length}

export const DASHBOARDS_INDEX = ${JSON.stringify(dashboards, null, 2)};
`;

  // Write the output file
  fs.writeFileSync(outputFile, outputContent, 'utf8');
  console.log(`Dashboard index generated successfully: ${outputFile}`);
  
  // Create TypeScript declaration file
  const declarationFile = path.join(process.cwd(), 'scripts', 'dashboards-index.d.ts');
  const declarationContent = `export declare const DASHBOARDS_INDEX: any[];
`;
  fs.writeFileSync(declarationFile, declarationContent, 'utf8');
  console.log(`TypeScript declaration file generated: ${declarationFile}`);
  
} catch (error) {
  console.error('Error generating dashboard index:', error);
  process.exit(1);
}
