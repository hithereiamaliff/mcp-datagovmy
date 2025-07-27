import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GitHub API URL for the data-catalogue directory
const apiUrl = 'https://api.github.com/repos/data-gov-my/datagovmy-meta/contents/data-catalogue';

// Function to fetch data from GitHub API
function fetchFromGitHub(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Node.js GitHub Dataset Extractor'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Function to extract dataset details from a single file
async function extractDatasetDetails(fileInfo) {
  // Extract dataset ID from filename (remove .json extension)
  const datasetId = path.basename(fileInfo.name, '.json');
  
  // Fetch the file content to get the title
  const contentUrl = fileInfo.download_url;
  
  try {
    // Fetch the raw content
    const rawContent = await new Promise((resolve, reject) => {
      https.get(contentUrl, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve(data);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
    
    // Parse the JSON content
    const content = JSON.parse(rawContent);
    
    // Extract the English title
    const description = content.title_en || datasetId;
    
    return { id: datasetId, description };
  } catch (error) {
    console.error(`Error fetching details for ${datasetId}:`, error.message);
    // Return basic info if we can't get the title
    return { id: datasetId, description: datasetId };
  }
}

// Main function to extract all dataset IDs
async function extractAllDatasetIds() {
  try {
    // Fetch the list of files in the data-catalogue directory
    const files = await fetchFromGitHub(apiUrl);
    
    // Filter for JSON files only
    const jsonFiles = files.filter(file => file.name.endsWith('.json'));
    
    console.log(`Found ${jsonFiles.length} JSON files in the data-catalogue directory`);
    
    // Extract dataset details from each file
    const datasets = [];
    for (const file of jsonFiles) {
      const dataset = await extractDatasetDetails(file);
      datasets.push(dataset);
      console.log(`Processed: ${dataset.id} - ${dataset.description}`);
    }
    
    // Sort datasets alphabetically by ID
    datasets.sort((a, b) => a.id.localeCompare(b.id));
    
    // Format the datasets as JavaScript code
    const formattedDatasets = datasets.map(dataset => 
      `  { id: '${dataset.id}', description: '${dataset.description.replace(/'/g, "\\'")}' }`
    ).join(',\n');
    
    // Write to a file
    const outputContent = `// Generated from GitHub repository: data-gov-my/datagovmy-meta
// Timestamp: ${new Date().toISOString()}
// Total datasets: ${datasets.length}

const EXTRACTED_DATASETS = [
${formattedDatasets}
];

export default EXTRACTED_DATASETS;
`;
    
    const outputPath = path.join(__dirname, 'extracted-datasets.js');
    fs.writeFileSync(outputPath, outputContent);
    console.log(`Successfully extracted ${datasets.length} dataset IDs to extracted-datasets.js`);
    
    return datasets;
  } catch (error) {
    console.error('Error extracting dataset IDs:', error);
    throw error;
  }
}

// Run the extraction
extractAllDatasetIds().catch(console.error);
