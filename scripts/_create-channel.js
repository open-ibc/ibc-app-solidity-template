// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const config = require('../config.json');
const chanConfig = config.createChannel;
const ibcConfig = require('../ibc.json');

// Helper function to convert an address to a port ID
function addressToPortId(portPrefix, address) {
  const suffix = address.slice(2);
  return `${portPrefix}.${suffix}`;
}

async function main() {
  const networkName = hre.network.name;
  
  // Get the contract type from the config and get the contract
  const contractType = config["deploy"][`${networkName}`];

  const ibcAppSrc = await hre.ethers.getContractAt(
      `${contractType}`,
      chanConfig.srcAddr
  );

  // Prepare the arguments to create the channel
  const connHop1 = ibcConfig[chanConfig.srcChain].canonConnFrom;
  const connHop2 = ibcConfig[chanConfig.dstChain].canonConnTo;
  const srcPortId = addressToPortId(`polyibc.${chanConfig.srcChain}`, chanConfig.srcAddr);
  const dstPortId = addressToPortId(`polyibc.${chanConfig.dstChain}`, chanConfig.dstAddr);
  
  const local = {
    portId: srcPortId,
    channelId: hre.ethers.encodeBytes32String(''),
    version: '',
  };

  const cp = {
    portId: dstPortId,
    channelId: hre.ethers.encodeBytes32String(''),
    version: '',
  };

  // Create the channel
  // Note: The proofHeight and proof are dummy values and will be dropped in the future
  const tx = await ibcAppSrc.createChannel(
    local,
    chanConfig.ordering,
    chanConfig.fees,
    [ connHop1, connHop2 ],
    cp,
    {
        proofHeight: { revision_height: 0, revision_number: 0 },
        proof: hre.ethers.encodeBytes32String('abc')
    }

  );

  // Wait for the channel handshake to complete
  await new Promise((r) => setTimeout(r, 60000));

  // Get the connected channels and print the new channel along with its counterparty
  const connectedChannels = await ibcAppSrc.getConnectedChannels();

  const newChannelBytes = connectedChannels[connectedChannels.length - 1].channelId;
  const newChannel = hre.ethers.decodeBytes32String(newChannelBytes);

  const cpChannelBytes = connectedChannels[connectedChannels.length - 1].cpChannelId;
  const cpChannel = hre.ethers.decodeBytes32String(cpChannelBytes);
  
  console.log(`Channel created: ${newChannel} with portID ${srcPortId} on network ${networkName}, Counterparty: ${cpChannel} on network ${chanConfig.dstChain}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});