// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const { getIbcApp } = require('./_vibc-helpers.js');

async function main() {
  const networkName = hre.network.name;

  // Get the contract type from the config and get the contract
  const ibcApp = await getIbcApp(networkName);
  const connectedChannels = await ibcApp.getConnectedChannels();
  if (connectedChannels.length > 0) {
    const cpChannelBytes = connectedChannels[connectedChannels.length - 1];
    const cpChannel = hre.ethers.decodeBytes32String(cpChannelBytes);

    console.log(`✅ Counterparty: ${cpChannel} on network ${networkName}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
