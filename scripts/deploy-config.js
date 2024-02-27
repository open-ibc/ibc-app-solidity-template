const { exec } = require("child_process");
const fs = require("fs");
const path = require('path');
const configRelativePath = process.env.CONFIG_PATH || 'config.json';
const configPath = path.join(__dirname, '..' , configRelativePath);
const ibcConfig = require("../ibc.json");

// Run script with source and destination networks as arguments
// Example: 
// $ node deploy-config.js optimism base
const source = process.argv[2];
const destination = process.argv[3];
const isUniversalChannel = process.argv[4].toLowerCase();

if (!source || !destination || (isUniversalChannel !== "true" && isUniversalChannel !== "false")) {
  console.error('Usage: node deploy-config.js <source_network> <destination_network> <universal_channel_bool>');
  process.exit(1);
}

// Function to update config.json
function updateConfig(network, address, isSource) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Update the config object
  if (isUniversalChannel === "false") {
    if (isSource) {
      config["createChannel"]["srcChain"] = network;
      config["createChannel"]["srcAddr"] = address;
    } else {
      config["createChannel"]["dstChain"] = network;
      config["createChannel"]["dstAddr"] = address;
    }

    config["sendPacket"][`${network}`]["portAddr"] = address;    
  } else if (isUniversalChannel === "true"){
    // When using the universal channel, we can skip channel creation and instead update the sendUniversalPacket field in the config
    config["sendUniversalPacket"][`${network}`]["portAddr"] = address;
    config["sendUniversalPacket"][`${network}`]["channelId"] = ibcConfig[`${network}`]["universalChannel"];
  }

  // Write the updated config back to the file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Function to run the deploy script and capture output
function deployAndCapture(network, isSource) {
  const deployScript = isUniversalChannel === "true" ? "_deploy-UC.js" : "_deploy.js";
  exec(`npx hardhat run scripts/${deployScript} --network ${network}`, (error, stdout, stderr) => {
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
