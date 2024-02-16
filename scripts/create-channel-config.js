const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const config = require("../config.json");

// Function to update config.json
function updateConfig(network, channel, cpNetwork, cpChannel) {
  const configPath = path.join(__dirname, '..', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Update the config object
  config["sendPacket"][`${network}`]["channelId"] = channel;
  config["sendPacket"][`${cpNetwork}`]["channelId"] = cpChannel;

  // Write the updated config back to the file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Function to run the deploy script and capture output
function createChannelAndCapture() {
  exec(`npx hardhat run scripts/_create-channel.js --network ${config.createChannel.srcChain}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }

    // Process stdout to find the contract address and network
    const output = stdout.trim();
    const match = output.match(/Channel created: (\S+) with portID (\S+) on network (\S+), Counterparty: (\S+) on network (\S+)/);

    if (match) {
      const channel = match[1];
      const portId = match[2];
      const network = match[3];
      const cpChannel = match[4];
      const cpNetwork = match[5];

      console.log(`Created channel: ${channel} with portID ${portId} on network ${network}, Counterparty: ${cpChannel} on network ${cpNetwork}`);

      // Update the config.json file
      updateConfig(network, channel, cpNetwork, cpChannel);
      console.log(`Updated config.json with ${channel} on network ${network} and ${cpChannel} on network ${cpNetwork}`);
    } else {
      console.error("Could not find required parameters in output");
    }
  });
}

createChannelAndCapture();
