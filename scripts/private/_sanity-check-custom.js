// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const { getConfigPath } = require('./_helpers');
const { areAddressesEqual } = require('./_helpers');
const { getIbcApp } = require('./_vibc-helpers');

const polyConfig = require('../../lib/polymer-registry-poc/dist/output.json');

async function main() {
  const configPath = getConfigPath();
  const config = require(configPath);
  const networkName = hre.network.name;
  const chainId = hre.config.networks[`${networkName}`].chainId;

  // Get the Dispatcher from your IBC enabled contract and compare it with the stored value in the .env file

  // 1. Get the contract type from the config and get the contract
  const ibcApp = await getIbcApp(networkName);

  // 2. Query your contract for the Dispatcher address
  let dispatcherAddr;
  try {
    dispatcherAddr = await ibcApp.dispatcher();
  } catch (error) {
    console.log(`❌ Error getting dispatcher address from IBC app. Check if the configuration file has the correct isUniversal flag set...`);
    return;
  }

  // 3. Compare with the value expected in the .env config file
  let sanityCheck = false;
  let envDispatcherAddr;
  try {
    envDispatcherAddr =
      config.proofsEnabled === true
        ? polyConfig[`${chainId}`]['clients']['op-client'].dispatcherAddr
        : polyConfig[`${chainId}`]['clients']['sim-client'].dispatcherAddr;
    sanityCheck = areAddressesEqual(dispatcherAddr, envDispatcherAddr);
  } catch (error) {
    console.log(`❌ Error comparing dispatcher addresses in .env file and IBC app: ${error}`);
    return;
  }

  // 4. Print the result of the sanity check
  // If true, it means all values in the contracts check out with those in the .env file and we can continue with the other scripts.
  if (sanityCheck) {
    console.log(`✅ Sanity check passed for network ${networkName}`);
  } else {
    console.log(`
⛔ Sanity check failed for network ${networkName}, 
check if the values provided in the .env file for the Universal Channel Mw and the dispatcher are correct.
--------------------------------------------------
🔮 Expected dispatcher (in IBC contract): ${dispatcherAddr}...
🗃️ Found dispatcher (in .env file): ${envDispatcherAddr}...
--------------------------------------------------
        `);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
