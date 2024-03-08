// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const { getConfigPath, addressToPortId } = require('./_helpers');
const { getIbcApp } = require('./_vibc-helpers.js');
const ibcConfig = require('../ibc.json');

function createDummyProof() {
  return  {
      proof: [
          {
              path: [
                  {
                      prefix: hre.ethers.toUtf8Bytes("prefixExample1"),
                      suffix: hre.ethers.toUtf8Bytes("suffixExample1"),
                  },
                  // Add more OpIcs23ProofPath objects as needed
              ],
              key: hre.ethers.toUtf8Bytes("keyExample"),
              value: hre.ethers.toUtf8Bytes("valueExample"),
              prefix: hre.ethers.toUtf8Bytes("prefixExample")
          },
          // Add more OpIcs23Proof objects as needed
      ],
      height: 123456, // example block height
  };
}

async function main() {
  const configPath = getConfigPath();
  const config = require(configPath);
  const chanConfig = config.createChannel;
  const networkName = hre.network.name;
  
  // Get the contract type from the config and get the contract
  const ibcApp = await getIbcApp(networkName, false);
  const connectedChannelsBefore = await ibcApp.getConnectedChannels();

  // Prepare the arguments to create the channel
  const connHop1 = ibcConfig[chanConfig.srcChain][`${config.proofsEnabled ? 'op-client' : 'sim-client'}`].canonConnFrom;
  const connHop2 = ibcConfig[chanConfig.dstChain][`${config.proofsEnabled ? 'op-client' : 'sim-client'}`].canonConnTo;
  const srcPortId = addressToPortId(`polyibc.${chanConfig.srcChain}`, chanConfig.srcAddr);
  const dstPortId = addressToPortId(`polyibc.${chanConfig.dstChain}`, chanConfig.dstAddr);

  const local = {
    portId: srcPortId,
    channelId: hre.ethers.encodeBytes32String(''),
    version: chanConfig.version,
  };

  const cp = {
    portId: dstPortId,
    channelId: hre.ethers.encodeBytes32String(''),
    version: '',
  };

  // Create the channel
  // Note: The proofHeight and proof are dummy values and will be dropped in the future
  const tx = await ibcApp.createChannel(
    local,
    chanConfig.ordering,
    chanConfig.fees,
    [ connHop1, connHop2 ],
    cp,
    createDummyProof()
  );

  // Wait for the channel handshake to complete
  await new Promise((r) => setTimeout(r, 60000));

  // Get the connected channels and print the new channel along with its counterparty
  const connectedChannelsAfter = await ibcApp.getConnectedChannels();

  if (connectedChannelsAfter!== undefined && connectedChannelsAfter.length > connectedChannelsBefore.length) {

    const newChannelBytes = connectedChannelsAfter[connectedChannelsAfter.length - 1].channelId;
    const newChannel = hre.ethers.decodeBytes32String(newChannelBytes);

    const cpChannelBytes = connectedChannelsAfter[connectedChannelsAfter.length - 1].cpChannelId;
    const cpChannel = hre.ethers.decodeBytes32String(cpChannelBytes);
  
    console.log(`Channel created: ${newChannel} with portID ${srcPortId} on network ${networkName}, Counterparty: ${cpChannel} on network ${chanConfig.dstChain}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});