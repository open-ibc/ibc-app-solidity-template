const { ethers } = require('hardhat');
const { getConfigPath, convertNetworkToChainId, getNetworkDataFromConfig, fetchRegistryConfig } = require('./_helpers.js');

async function getIbcApp(network) {
  try {
    const config = require(getConfigPath());
    const ibcAppAddr = config.isUniversal
      ? config['sendUniversalPacket'].networks[`${network}`]['portAddr']
      : config['sendPacket'].networks[`${network}`]['portAddr'];
    console.log(`🗄️  Fetching IBC app on ${network} at address: ${ibcAppAddr}`);
    const contractType = config['deploy'][`${network}`];
    const ibcApp = await ethers.getContractAt(`${contractType}`, ibcAppAddr);
    return ibcApp;
  } catch (error) {
    console.log(`❌ Error getting IBC app: ${error}`);
    return;
  }
}

async function getDispatcherAddress(network) {
  const polyConfig = await fetchRegistryConfig();
  const chainId = convertNetworkToChainId(network);
  return polyConfig[`${chainId}`].dispatcherAddr;
}

async function getDispatcher(network) {
  const dispatcherAbi = require('../../vibcArtifacts/Dispatcher.sol/Dispatcher.json').abi;
  const rpc = getNetworkDataFromConfig(network).alchemyRPC;
  const provider = new ethers.JsonRpcProvider(rpc);
  try {
    const dispatcherAddress = await getDispatcherAddress(network);
    const dispatcher = new ethers.Contract(dispatcherAddress, dispatcherAbi, provider);
    return dispatcher;
  } catch (error) {
    console.log(`❌ Error getting dispatcher: ${error}`);
    return;
  }
}

async function getUcHandlerAddress(network) {
  const polyConfig = await fetchRegistryConfig();
  const config = require(getConfigPath());
  const chainId = convertNetworkToChainId(network);
  const ucHandlerAddr = config.proofsEnabled
    ? polyConfig[`${chainId}`]['clients']['subfinality'].universalChannelAddr
    : polyConfig[`${chainId}`]['clients']['sim-client'].universalChannelAddr;
  return ucHandlerAddr;
}

async function getUcHandler(network) {
  const ucHandlerAbi = require('../../vibcArtifacts/UniversalChannelHandler.sol/UniversalChannelHandler.json').abi;
  const rpc = getNetworkDataFromConfig(network).alchemyRPC;
  const provider = new ethers.JsonRpcProvider(rpc);
  try {
    const ucHandlerAddress = await getUcHandlerAddress(network);
    const ucHandler = new ethers.Contract(ucHandlerAddress, ucHandlerAbi, provider);
    return ucHandler;
  } catch (error) {
    console.log(`❌ Error getting ucHandler: ${error}`);
    return;
  }
}

module.exports = {
  getIbcApp,
  getDispatcherAddress,
  getDispatcher,
  getUcHandlerAddress,
  getUcHandler,
};
