const { exec } = require('child_process');
const { getConfigPath, updateConfigCreateChannel, getWhitelistedNetworks, convertNetworkToChainId } = require('./_helpers.js');
const { setupIbcChannelEventListener } = require('./_events.js');

// Function to run the deploy script and capture output
async function createChannelAndCapture(config, srcChain, dstChain) {
  // Check if the source chain from user input is whitelisted
  const allowedNetworks = await getWhitelistedNetworks();
  const srcChainId = convertNetworkToChainId(srcChain);
  const dstChainId = convertNetworkToChainId(dstChain);

  if (!allowedNetworks.includes(`${srcChainId}`)) {
    console.error('❌ Invalid network name: Please provide a valid source chain');
    return;
  }
  if (!allowedNetworks.includes(`${dstChainId}`)) {
    console.error('❌ Invalid network name: Please provide a valid destination chain');
    return;
  }
  exec(`npx hardhat run scripts/private/_create-channel.js --network ${srcChain}`, (error, stdout) => {
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
          -----------------------------------------\n`);

      // Update the config.json file
      updateConfigCreateChannel(network, channel, cpNetwork, cpChannel);
      console.log(`🆗 Updated config.json with ${channel} on network ${network} and ${cpChannel} on network ${cpNetwork}`);
    } else {
      console.error('❌ Could not find required parameters in output');
    }
  });
}

async function main() {
  const config = require(getConfigPath());
  const srcChain = config.createChannel.srcChain;
  const dstChain = config.createChannel.dstChain;
  await setupIbcChannelEventListener(srcChain, dstChain);
  await createChannelAndCapture(config, srcChain, dstChain);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
