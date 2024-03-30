// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const { getDispatcherAddress, getUcHandlerAddress, getIbcApp } = require('./_vibc-helpers');
const { getConfigPath } = require('./_helpers');

async function main() {
  await hre.ethers.getSigners();
  const networkName = hre.network.name;
  const config = require(getConfigPath());

  if (!config.isUniversal) {
    // Determine the new dispatcher, based on the network.
    const newDispatcher = getDispatcherAddress(networkName);

    // Get the contract type from the config and get the contract
    const ibcApp = await getIbcApp(networkName);
    try {
      await ibcApp.updateDispatcher(newDispatcher);
    } catch (error) {
      console.error(`❌ Error getting dispatcher address from IBC app. Check if the configuration file has the correct isUniversal flag set...`);
      return;
    }
    console.log(`✅ Dispatcher updated to ${newDispatcher}`);
  } else if (config.isUniversal) {
    // Determine the new universal channel handler, based on the network.
    const newUcHandler = getUcHandlerAddress(networkName);

    // Get the contract type from the config and get the contract
    const ibcApp = await getIbcApp(networkName, true);
    try {
      await ibcApp.setDefaultMw(newUcHandler);
    } catch (error) {
      console.log(
        `❌ Error updating Universal Channel Mw address from IBC app. Check if the configuration file has the correct isUniversal flag set...`,
      );
      return;
    }
    console.log(`✅ Universal channel handler updated to ${newUcHandler}`);
  } else {
    console.error('❌ Check the config file for isUniversal value. It should be a boolean.');
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
