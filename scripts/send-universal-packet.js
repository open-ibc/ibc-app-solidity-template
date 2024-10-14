// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const { getConfigPath, fetchRegistryConfig, convertNetworkToChainId, estimateRelayerFees } = require('./private/_helpers');
const { getIbcApp } = require('./private/_vibc-helpers.js');

async function main() {
  const accounts = await hre.ethers.getSigners();
  const config = require(getConfigPath());
  const sendConfig = config.sendUniversalPacket;

  const client = config.proofsEnabled ? 'subfinality' : 'sim-client';

  const networkName = hre.network.name;
  // If the network we are sending on is optimism, we need to use the base port address and vice versa
  const destChain = Object.keys(sendConfig.networks).find((chain) => chain !== networkName);

  const [srcChainId, destChainId] = [networkName, destChain].map((networkName) => convertNetworkToChainId(networkName));
  // Get the contract type from the config and get the contract
  const ibcApp = await getIbcApp(networkName);
  const polymerConfig = await fetchRegistryConfig();

  // Do logic to prepare the packet

  const destPortAddr = sendConfig.networks[`${destChain}`]['portAddr'];
  const channelId = polymerConfig[srcChainId]['clients'][client].universalChannelId;

  const channelIdBytes = hre.ethers.encodeBytes32String(channelId);
  const timeoutSeconds = sendConfig.networks[`${networkName}`]['timeout'];

  const recvPacketGasLimit = hre.ethers.toBigInt(config.sendUniversalPacket['recvPacketGasLimit']);
  const ackPacketGasLimit = hre.ethers.toBigInt(config.sendUniversalPacket['ackPacketGasLimit']);

  const feeData = await estimateRelayerFees(srcChainId, destChainId, recvPacketGasLimit.toString(), ackPacketGasLimit.toString());

  // Send the packet
  await ibcApp.connect(accounts[0]).sendUniversalPacketWithFee(
    destPortAddr,
    channelIdBytes,
    timeoutSeconds,
    [feeData.recvFeeEstGas, feeData.ackFeeEstGas],
    [feeData.destFeeBigInt, feeData.srcFeeBigInt],
    // Define and pass optionalArgs appropriately or remove if not needed
    { value: feeData.totalValue },
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
