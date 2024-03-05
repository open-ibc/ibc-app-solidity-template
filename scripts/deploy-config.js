const { exec } = require("child_process");
const fs = require("fs");
const {getConfigPath} = require('./_helpers');

const ibcConfig = require("../ibc.json");

// Run script with source and destination networks as arguments
// Example: 
// $ node deploy-config.js optimism base
const source = process.argv[2];
const destination = process.argv[3];

if (!source || !destination) {
  console.error('Usage: node deploy-config.js <source_network> <destination_network>');
  process.exit(1);
}

const configPath = getConfigPath();
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Function to update config.json
function updateConfig(network, address, isSource) {

  // Update the config object
  if (config.isUniversalChannel === "false") {
    if (isSource) {
      config["createChannel"]["srcChain"] = network;
      config["createChannel"]["srcAddr"] = address;
    } else {
      config["createChannel"]["dstChain"] = network;
      config["createChannel"]["dstAddr"] = address;
    }

    config["sendPacket"][`${network}`]["portAddr"] = address;    
  } else if (config.isUniversalChannel === "true"){
    // When using the universal channel, we can skip channel creation and instead update the sendUniversalPacket field in the config
    config["sendUniversalPacket"][`${network}`]["portAddr"] = address;
    config["sendUniversalPacket"][`${network}`]["channelId"] = ibcConfig[`${network}`]["sim-client"]["universalChannel"];
  }

  // Write the updated config back to the file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Function to run the deploy script and capture output
function deployAndCapture(network, isSource) {
  // const configPath = getConfigPath();
  // const config = require(configPath);
  const deployScript = config.isUniversalChannel === "true" ? "_deploy-UC.js" : "_deploy.js";
  exec(`npx hardhat run scripts/${deployScript} --network ${network}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    } else {
      console.log(stdout);
    }

    // Process stdout to find the contract address and network
    const output = stdout.trim();
    const match = output.match(/Contract (\S+) deployed to (\S+) on network (\S+)/);

    if (match) {
      const contractType = match[1];
      const address = match[2];
      const network = match[3];

      console.log(`
          ✅   Deployment Successful   ✅
          -------------------------------
          📄 Contract Type: ${contractType}
          📍 Address: ${address}
          🌍 Network: ${network}
          -------------------------------\n
      `);

      // Update the config.json file
      updateConfig(network, address, isSource);
      console.log(`Updated config.json with address ${address} on network ${network}`);
    } else {
      console.error("Could not find contract address and network in output");
    }
  });
}

function main() {
  deployAndCapture(source, true);
  deployAndCapture(destination, false);
}

main();
