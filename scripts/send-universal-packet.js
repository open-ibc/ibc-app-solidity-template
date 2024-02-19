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

async function main() {
    const accounts = await hre.ethers.getSigners();

    const networkName = hre.network.name;
    // Get the contract type from the config and get the contract
    const contractType = config["deploy"][`${networkName}`];

    const ibcAppSrc = await hre.ethers.getContractAt(
        `${contractType}`,
        sendConfig[`${networkName}`]["portAddr"]
    );

    // Do logic to prepare the packet
    const channelId = sendConfig[`${networkName}`]["channelId"];
    const channelIdBytes = hre.ethers.encodeBytes32String(channelId);
    const timeoutSeconds = sendConfig[`${networkName}`]["timeout"];
    
    // Send the packet
    await ibcAppSrc.connect(accounts[1]).sendUniversalPacket(
        channelIdBytes,
        timeoutSeconds,
        // Define and pass optionalArgs appropriately or remove if not needed
    )
    console.log("Sending packet");

    // Active waiting for the packet to be received and acknowledged
    // @dev You'll need to implement this based on the contract's logic
    let acked = false;
    let counter = 0;
    do {
        // Define an acked by interacting with the contract. This will depend on the contract's logic
        if (!acked) {
            console.log("ack not received. waiting...");
            await new Promise((r) => setTimeout(r, 2000));
            counter++;
        } 
    } while (!acked && counter<100);
    
    console.log("Packet lifecycle was concluded successfully: " + acked);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});