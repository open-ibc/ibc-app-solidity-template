const { exec } = require('child_process');
const { getConfigPath, updateConfigCreateChannelCP, getWhitelistedNetworks } = require('./_helpers.js');
const { setupIbcChannelEventListener } = require('./_events.js');

async function getCPInfo() {
  const config = require(getConfigPath());
  const dstChain = config.createChannel.dstChain;

  // Check if the source chain from user input is whitelisted
  // const allowedNetworks = getWhitelistedNetworks();
  // if (!allowedNetworks.includes(dstChain)) {
  //   console.error('❌ Invalid network name');
  //   return;
  // }
  await exec(`npx hardhat run scripts/private/_get_cp_channel.js --network ${dstChain}`, (error, stdout) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }

    // Process stdout to find the contract address and network
    const output = stdout.trim();
    const match = output.match(/Counterparty: (\S+) on network (\S+)/);

    if (match) {
      const channel = match[1];
      const cpNetwork = match[2];

      console.log(`
          🎊   Counterparty Channel   🎊
          -----------------------------------------
          🛣️  Counterparty Channel ID: ${channel}
          🪐 Counterparty Network: ${cpNetwork}
          -----------------------------------------\n`);

      // Update the config.json file
      updateConfigCreateChannelCP(cpNetwork, channel);
      console.log(`🆗 Updated config.json with ${channel} on network ${cpNetwork}`);
    } else {
      console.error('❌ Could not find required parameters in output');
    }
  });
}

async function main() {
  // const config = require(getConfigPath());
  // const srcChain = config.createChannel.srcChain;
  // const dstChain = config.createChannel.dstChain;
  // await setupIbcChannelEventListener(srcChain, dstChain);
  await getCPInfo();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
