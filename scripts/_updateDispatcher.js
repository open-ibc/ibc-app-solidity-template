// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
    const config = require(configPath);
    const networkName = hre.network.name;

    let newDispatcher;
    if (network === "optimism") {
        newDispatcher = config.proofsEnabled ? process.env.OP_DISPATCHER_SIM : process.env.OP_DISPATCHER;
    } else if (network === "base") {
        newDispatcher = config.proofsEnabled ? process.env.BASE_DISPATCHER_SIM : process.env.BASE_DISPATCHER;
    } else {
        console.error("Invalid network name");
        process.exit(1);
    }

    // Get the contract type from the config and get the contract
    const contractType = config["deploy"][`${networkName}`];
  
    const ibcAppSrc = await hre.ethers.getContractAt(
        `${contractType}`,
        chanConfig.srcAddr
    );

    await ibcAppSrc.updateDispatcher(newDispatcher);
    console.log(`Dispatcher updated to ${newDispatcher}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });