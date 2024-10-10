// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const { getConfigPath, estimateRelayerFees, convertNetworkToChainId } = require('./private/_helpers');
const { getIbcApp } = require('./private/_vibc-helpers.js');

async function main() {
  const accounts = await hre.ethers.getSigners();
  const config = require(getConfigPath());
  const sendConfig = config.sendPacket;

  const networkName = hre.network.name;
  // Get the contract type from the config and get the contract
  const ibcApp = await getIbcApp(networkName);

  // Do logic to prepare the packet
  const channelId = sendConfig[`${networkName}`]['channelId'];
  const channelIdBytes = hre.ethers.encodeBytes32String(channelId);
  const timeoutSeconds = sendConfig[`${networkName}`]['timeout'];
  const recvPacketGasLimit = hre.ethers.toBigInt(config.sendPacket['recvPacketGasLimit']);
  const ackPacketGasLimit = hre.ethers.toBigInt(config.sendPacket['ackPacketGasLimit']);

  // We get the src chain id from the network name, but need to find dest through the chain not being used.
  // Once polymer has multi-chain expansion, this should really be converted into a hardhat task and the user should specify the source and dest chain through cli args.
  const source = networkName; // Source is always the chain we run this command on, dest is found by process of elimination
  const destination = config.isUniversal
    ? Object.keys(config.sendUniversalPacket).find((chain) => chain !== source)
    : Object.keys(config.sendPacket).find((chain) => chain !== source);

  const [srcChainId, destChainId] = [source, destination].map((networkName) => convertNetworkToChainId(networkName));
  const feeEstimatorData = await estimateRelayerFees(srcChainId, destChainId, recvPacketGasLimit.toString(), ackPacketGasLimit.toString());

  // Even though we have our initial gas limits from our config, we should use the gas limits returned by the api, which pads for vibc-contracts gas overhead
  const destFeeBigInt = hre.ethers.toBigInt(feeEstimatorData.destMaxFeePerGas);
  const srcFeeBigInt = hre.ethers.toBigInt(feeEstimatorData.srcMaxFeePerGas);
  const recvFeeEstGas = hre.ethers.toBigInt(feeEstimatorData.maxRecvGas);
  const ackFeeEstGas = hre.ethers.toBigInt(feeEstimatorData.maxAckGas);

  // Send the packet using the fee estimator api. 
  // NOTE: We also send a value of ether equal to the maxTotalFee returned by the API. The tx will revert if you don't send *exactly* this amount
  await ibcApp.connect(accounts[0]).sendPacketWithFee(
    channelIdBytes,
    timeoutSeconds,
    [recvFeeEstGas, ackFeeEstGas],
    [destFeeBigInt, srcFeeBigInt],
    // Define and pass optionalArgs appropriately or remove if not needed
    { value: feeEstimatorData.maxTotalFee },
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
