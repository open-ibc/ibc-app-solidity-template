// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const path = require('path');
const configRelativePath = process.env.CONFIG_PATH || 'config.json';
const configPath = path.join(__dirname, '..' , configRelativePath);

async function main() {
    const config = require(configPath);
    const chanConfig = config["createChannel"];

    const accounts = await hre.ethers.getSigners();
    const networkName = hre.network.name;

    let newUcHandler;
    if (networkName === "optimism") {
        newUcHandler = config.proofsEnabled === true ? process.env.OP_UC_MW_SIM : process.env.OP_UC_MW;
    } else if (networkName === "base") {
        newUcHandler = config.proofsEnabled === true ? process.env.BASE_UC_MW_SIM : process.env.BASE_UC_MW;
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

    await ibcAppSrc.updateMiddleware(newUcHandler);
    console.log(`Universal channel handler updated to ${newUcHandler}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });