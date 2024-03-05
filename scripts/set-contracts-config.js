const fs = require('fs');
const { getConfigPath } = require('./_helpers.js');

if(process.argv.length < 4) {
  console.error('Incorrect number of args. Usage: node set-contracts-config.js <chain> <contractType>');
  process.exit(1);
}
// Run script with source and destination networks as arguments
// Example: 
// $ node set-contracts-config.js optimism XCounterUC
const chain = process.argv[2];
const contractType = process.argv[3];
const configPath = getConfigPath();

// Function to update config.json
function updateConfig(network, contractType) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Update the config object
      config["deploy"][`${network}`] = contractType;
    
      // Write the updated config back to the file
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(`Failed to update config: ${error.message}`);
      process.exit(1);
    }
  }

  updateConfig(chain, contractType);