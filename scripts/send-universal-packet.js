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
const sendConfig = config.sendUniversalPacket;
const { listenForIbcPacketEvents } = require('./_events.js');
const getDispatcher = require('./_getDispatcher.js');

async function main() {
    const accounts = await hre.ethers.getSigners();

    // Get the dispatchers for both source and destination to listen for IBC packet events
    const opDispatcher = await getDispatcher("optimism");
    const baseDispatcher = await getDispatcher("base");
    listenForIbcPacketEvents("optimism", opDispatcher);
    listenForIbcPacketEvents("base", baseDispatcher);

    const networkName = hre.network.name;
    // Get the contract type from the config and get the contract
    const contractType = config["deploy"][`${networkName}`];

    const srcPortAddr = sendConfig[`${networkName}`]["portAddr"];

    const ibcAppSrc = await hre.ethers.getContractAt(
        `${contractType}`,
        srcPortAddr
    );

    // Do logic to prepare the packet

    // If the network we are sending on is optimism, we need to use the base port address and vice versa
    const destPortAddr = networkName === "optimism" ? config["sendUniversalPacket"]["base"]["portAddr"] : config["sendUniversalPacket"]["optimism"]["portAddr"];
    const channelId = sendConfig[`${networkName}`]["channelId"];
    const channelIdBytes = hre.ethers.encodeBytes32String(channelId);
    const timeoutSeconds = sendConfig[`${networkName}`]["timeout"];
    
    // Send the packet
    await ibcAppSrc.connect(accounts[0]).sendUniversalPacket(
        destPortAddr,
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