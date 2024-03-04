// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const path = require('path');
const configRelativePath = process.env.CONFIG_PATH || 'config.json';
const configPath = path.join(__dirname, '..' , configRelativePath);
const config = require(configPath);
const sendConfig = config.sendPacket;

const { listenForIbcPacketEvents } = require('./_events.js');
const { getDispatcher } = require('./_get-vibc-sc.js');
const { get } = require('http');

async function main() {
    const accounts = await hre.ethers.getSigners();

    // Get the dispatchers for both source and destination to listen for IBC packet events
    const opDispatcher = await getDispatcher("optimism");
    const baseDispatcher = await getDispatcher("base");
    listenForIbcPacketEvents("optimism", opDispatcher);
    listenForIbcPacketEvents("base", baseDispatcher);

    const networkName = hre.network.name;
    // Get the contract type from the config and get the contract
    const ibcApp = await getIbcApp(networkName, false);

    // Do logic to prepare the packet
    const channelId = sendConfig[`${networkName}`]["channelId"];
    const channelIdBytes = hre.ethers.encodeBytes32String(channelId);
    const timeoutSeconds = sendConfig[`${networkName}`]["timeout"];
    
    // Send the packet
    await ibcApp.connect(accounts[0]).sendPacket(
        channelIdBytes,
        timeoutSeconds,
        // Define and pass optionalArgs appropriately or remove if not needed    
        );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});