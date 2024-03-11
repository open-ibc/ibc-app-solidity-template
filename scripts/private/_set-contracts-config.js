// Run script to set the contract in the config.json file along with the isUniversal flag
// Example: 
// $ node set-contracts-config.js optimism XCounterUC true
const fs = require('fs');
const { getConfigPath } = require('./_helpers.js');

if(process.argv.length < 5) {
  console.error('Incorrect number of args. Usage: node set-contracts-config.js <chain> <contractType> <isUniversal>');
  process.exit(1);
}
const chain = process.argv[2];
const contractType = process.argv[3];
const universalBoolean = process.argv[4].trim().toLowerCase()

if (chain !== "optimism" && chain !== "base") {
  console.error('Incorrect chain value. Usage: node set-contracts-config.js <chain> <contractType> <isUniversal>');
  process.exit(1);
}

let isUniversal;
if (universalBoolean === "true") {
  isUniversal = true;
} else if (universalBoolean === "false") {
  isUniversal = false;
} else {
  console.error('Incorrect boolean value. Usage: node set-contracts-config.js <chain> <contractType> <isUniversal>');
  process.exit(1);
}

const configPath = getConfigPath();

// Function to update config.json
function updateConfig(network, contractType) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Update the config object
      config["deploy"][`${network}`] = contractType;
      config["isUniversal"] = isUniversal;
    
      // Write the updated config back to the file
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(`Failed to update config: ${error.message}`);
      process.exit(1);
    }
  }

  updateConfig(chain, contractType);