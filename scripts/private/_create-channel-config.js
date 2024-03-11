const { exec } = require("child_process");
const { getConfigPath, updateConfigCreateChannel, getWhitelistedNetworks } = require('./_helpers.js');
const { setupIbcChannelEventListener } = require('./_events.js');

// Function to run the deploy script and capture output
function createChannelAndCapture() {
  const config = require(getConfigPath());
  const srcChain = config.createChannel.srcChain;
  const allowedNetworks = getWhitelistedNetworks();
  if (!allowedNetworks.includes(srcChain)) {
    console.error('Invalid network name');
    return;
  }
  exec(`npx hardhat run scripts/private/_create-channel.js --network ${srcChain}`, (error, stdout, stderr) => {
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

      console.log(`
          🎊   Created Channel   🎊
          -----------------------------------------
          🛣️  Channel ID: ${channel}
          🔗 Port ID: ${portId}
          🌍 Network: ${network}
          -----------------------------------------
          🛣️  Counterparty Channel ID: ${cpChannel}
          🪐 Counterparty Network: ${cpNetwork}
          -----------------------------------------\n`
        );

      // Update the config.json file
      updateConfigCreateChannel(network, channel, cpNetwork, cpChannel);
      console.log(`Updated config.json with ${channel} on network ${network} and ${cpChannel} on network ${cpNetwork}`);
    } else {
      console.error("Could not find required parameters in output");
    }
  });
}

async function main() {
  await setupIbcChannelEventListener();
  createChannelAndCapture();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
