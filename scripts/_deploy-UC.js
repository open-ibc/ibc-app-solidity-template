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
const config = require(configPath);
const argsObject = require('../arguments.js');
const { getUcHandlerAddress } = require('./_vibc-helpers.js');

async function main() {
  const networkName = hre.network.name;

  // The config should have a deploy object with the network name as the key and contract type as the value
  const contractType = config["deploy"][`${networkName}`];
  const args = argsObject[`${contractType}`];
  if (!args) {
    console.warn(`No arguments found for contract type: ${contractType}`);
 }

  // TODO: update to switch statement when supporting more networks
  const ucHandlerAddr = getUcHandlerAddress(networkName);
  const constructorArgs = [ucHandlerAddr, ...(args ?? [])];
  
  // Deploy the contract
  // NOTE: when adding additional args to the constructor, add them to the array as well
  const myContract = await hre.ethers.deployContract(contractType, constructorArgs);

  await myContract.waitForDeployment();

  // NOTE: Do not change the output string, its output is formatted to be used in the deploy-config.js script
  // to update the config.json file
  console.log(
    `Contract ${contractType} deployed to ${myContract.target} on network ${networkName}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});