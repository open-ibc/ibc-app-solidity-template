// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const deployConfig = require('../config.json').deploy;

async function main() {
  console.log(deployConfig);
  const myContract = await hre.ethers.deployContract(deployConfig.name, deployConfig.args);

  await myContract.waitForDeployment();

  console.log(
    `${deployConfig.name} deployed to ${myContract.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
