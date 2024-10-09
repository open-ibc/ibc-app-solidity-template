// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const { getConfigPath, convertNetworkToChainId, addressToPortId } = require('./_helpers');
const { getIbcApp, getDispatcher } = require('./_vibc-helpers.js');
const polyConfig = hre.config.polymer;

async function main() {
  const config = require(getConfigPath());
  const chanConfig = config.createChannel;
  const srcChainName = hre.network.name;
  const srcChainId = convertNetworkToChainId(srcChainName);
  const dstChainName = chanConfig.dstChain;
  const dstChainId = convertNetworkToChainId(dstChainName);

  // Get the contract type from the config and get the contract
  const ibcApp = await getIbcApp(srcChainName);
  const connectedChannelsBefore = await ibcApp.getConnectedChannels();

  // Prepare the arguments to create the channel
  // TODO: Update to allow dynamic choice of client type
  const connHop1 = polyConfig[`${srcChainId}`]['clients'][`${config.proofsEnabled ? 'op-client' : 'sim-client'}`].canonConnFrom;
  const connHop2 = polyConfig[`${dstChainId}`]['clients'][`${config.proofsEnabled ? 'op-client' : 'sim-client'}`].canonConnTo;

  const input = [
    { address: chanConfig.srcAddr, network: srcChainName },
    { address: chanConfig.dstAddr, network: dstChainName },
  ];
  const [srcPortId, dstPortId] = await Promise.all(
    input.map(async (channelEnd) => {
      const dispatcher = await getDispatcher(channelEnd.network);
      const portPrefix = await dispatcher.portPrefix();
      return addressToPortId(channelEnd.address, portPrefix);
    }),
  );

  // Create the channel
  // Note: The proofHeight and proof are dummy values and will be dropped in the future
  await ibcApp.createChannel(chanConfig.version, chanConfig.ordering, chanConfig.fees, [connHop1, connHop2], dstPortId);

  // Wait for the channel handshake to complete
  const sleepTime = config.proofsEnabled ? 12000000 : 90000;
  await new Promise((r) => setTimeout(r, sleepTime));

  // Get the connected channels and print the new channel along with its counterparty
  const connectedChannelsAfter = await ibcApp.getConnectedChannels();

  if (connectedChannelsAfter !== undefined && connectedChannelsAfter.length > connectedChannelsBefore.length) {
    const newChannelBytes = connectedChannelsAfter[connectedChannelsAfter.length - 1].channelId;
    const newChannel = hre.ethers.decodeBytes32String(newChannelBytes);

    const cpChannelBytes = connectedChannelsAfter[connectedChannelsAfter.length - 1].cpChannelId;
    const cpChannel = hre.ethers.decodeBytes32String(cpChannelBytes);

    console.log(
      `✅ Channel created: ${newChannel} with portID ${srcPortId} on network ${srcChainName}, Counterparty: ${cpChannel} on network ${dstChainName}`,
    );
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
