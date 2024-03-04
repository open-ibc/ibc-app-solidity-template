// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { determineNewUcHandler, getIbcApp } = require("./_helpers");

async function main() {
    const accounts = await hre.ethers.getSigners();
    const networkName = hre.network.name;

    // Determine the new universal channel handler, based on the network.
    const newUcHandler = determineNewUcHandler(networkName);

    // Get the contract type from the config and get the contract
    const ibcApp = await getIbcApp(networkName, true);

    await ibcApp.updateMiddleware(newUcHandler);
    console.log(`Universal channel handler updated to ${newUcHandler}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });