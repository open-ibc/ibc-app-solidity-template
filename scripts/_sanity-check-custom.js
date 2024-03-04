// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const path = require('path');
const { env } = require("process");
const { areAddressesEqual, getIbcApp } = require("./_helpers");
const configRelativePath = process.env.CONFIG_PATH || 'config.json';
const configPath = path.join(__dirname, '..' , configRelativePath);

async function main() {
    const config = require(configPath);


    const accounts = await hre.ethers.getSigners();
    const networkName = hre.network.name;

    // Get the Dispatcher from your IBC enabled contract and compare it with the stored value in the .env file

    // 1. Get the contract type from the config and get the contract
    const ibcApp = await getIbcApp(networkName, false);

    // 2. Query your contract for the Dispatcher address
    const dispatcherAddr = await ibcApp.dispatcher();

    // 3. Compare with the value expected in the .env config file
    let sanityCheck = false;
    let envDispatcherAddr;
    if (networkName === "optimism") {
        envDispatcherAddr = config.proofsEnabled === true ? process.env.OP_DISPATCHER : process.env.OP_DISPATCHER_SIM;
        sanityCheck = areAddressesEqual(dispatcherAddr, envDispatcherAddr);
    } else if (networkName === "base") {
        envDispatcherAddr = config.proofsEnabled === true ? process.env.BASE_DISPATCHER : process.env.BASE_DISPATCHER_SIM;
        sanityCheck = areAddressesEqual(dispatcherAddr, envDispatcherAddr);
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