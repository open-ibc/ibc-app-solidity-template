const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const ibcConfig = require("../ibc.json");

// Run script with source and destination networks as arguments
// Example: 
// $ node deploy-config.js optimism base
const source = process.argv[2];
const destination = process.argv[3];
const universalChannel = process.argv[4];

if (!source || !destination) {
  console.error('Usage: node deploy-config.js <source_network> <destination_network> <universal_channel_bool>');
  process.exit(1);
}

if (process.argv[4] === undefined) {
  console.error('Usage: node deploy-config.js <source_network> <destination_network> <universal_channel_bool>');
  process.exit(1);
}

// Function to update config.json
function updateConfig(network, address, isSource) {
  const configPath = path.join(__dirname, '..', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Update the config object
  if (universalChannel === "false") {
    if (isSource) {
      config["createChannel"]["srcChain"] = network;
      config["createChannel"]["srcAddr"] = address;
    } else {
      config["createChannel"]["dstChain"] = network;
      config["createChannel"]["dstAddr"] = address;
    }

    config["sendPacket"][`${network}`]["portAddr"] = address;    
  } else {
    config["sendUniversalPacket"][`${network}`]["portAddr"] = address;
    config["sendUniversalPacket"][`${network}`]["channelId"] = ibcConfig[`${network}`]["universalChannel"];
  }

  // Write the updated config back to the file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Function to run the deploy script and capture output
function deployAndCapture(network, isSource) {
  exec(`npx hardhat run scripts/deploy.js --network ${network}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }

    // Process stdout to find the contract address and network
    const output = stdout.trim();
    const match = output.match(/Contract (\S+) deployed to (\S+) on network (\S+)/);

    if (match) {
      const contractType = match[1];
      const address = match[2];
      const network = match[3];

      console.log(`Deployed ${contractType} to address ${address} on network ${network}`);

      // Update the config.json file
      updateConfig(network, address, isSource);
      console.log(`Updated config.json with address ${address} on network ${network}`);
    } else {
      console.error("Could not find contract address and network in output");
    }
  });
}

deployAndCapture(source, true);
deployAndCapture(destination, false);
