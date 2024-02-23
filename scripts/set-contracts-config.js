const fs = require('fs');
const path = require('path');
const configRelativePath = process.env.CONFIG_PATH || 'config.json';
const configPath = path.join(__dirname, '..' , configRelativePath);

// Run script with source and destination networks as arguments
// Example: 
// $ node set-contracts-config.js optimism XCounterUC
const chain = process.argv[2];
const contractType = process.argv[3];

// Function to update config.json
function updateConfig(network, contractType) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
    // Update the config object
    config["deploy"][`${network}`] = contractType;
        
    // Write the updated config back to the file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  updateConfig(chain, contractType);