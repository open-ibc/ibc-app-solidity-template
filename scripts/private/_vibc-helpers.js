const { ethers } = require('hardhat');
const { getConfigPath, fetchABI, convertNetworkToChainId, getExplorerDataFromConfig, getNetworkDataFromConfig } = require('./_helpers.js');

const hhConfig = require('../../hardhat.config.js');
const polyConfig = hhConfig.polymer;

async function getIbcApp(network) {
  try {
    const config = require(getConfigPath());
    const ibcAppAddr = config.isUniversal ? config['sendUniversalPacket'][`${network}`]['portAddr'] : config['sendPacket'][`${network}`]['portAddr'];
    console.log(`🗄️  Fetching IBC app on ${network} at address: ${ibcAppAddr}`);
    const contractType = config['deploy'][`${network}`];
    const ibcApp = await ethers.getContractAt(`${contractType}`, ibcAppAddr);
    return ibcApp;
  } catch (error) {
    console.log(`❌ Error getting IBC app: ${error}`);
    return;
  }
}

function getDispatcherAddress(network) {
  const config = require(getConfigPath());
  const chainId = convertNetworkToChainId(network);

  const dispatcherAddr = config.proofsEnabled
    ? polyConfig[`${chainId}`]['clients']['op-client'].dispatcherAddr
    : polyConfig[`${chainId}`]['clients']['sim-client'].dispatcherAddr;
  return dispatcherAddr;
}

async function getDispatcher(network) {
  const explorerApiUrl = getExplorerDataFromConfig(network).apiURL;
  const rpc = getNetworkDataFromConfig(network).alchemyRPC;
  const provider = new ethers.JsonRpcProvider(rpc);
  try {
    const dispatcherAddress = getDispatcherAddress(network);
    const dispatcherAbi = await fetchABI(explorerApiUrl, dispatcherAddress);
    const dispatcher = new ethers.Contract(dispatcherAddress, dispatcherAbi, provider);
    return dispatcher;
  } catch (error) {
    console.log(`❌ Error getting dispatcher: ${error}`);
    return;
  }
}

function getUcHandlerAddress(network) {
  const config = require(getConfigPath());
  const chainId = convertNetworkToChainId(network);
  const ucHandlerAddr = config.proofsEnabled
    ? polyConfig[`${chainId}`]['clients']['op-client'].universalChannelAddr
    : polyConfig[`${chainId}`]['clients']['sim-client'].universalChannelAddr;
  return ucHandlerAddr;
}

async function getUcHandler(network) {
  const explorerApiUrl = getExplorerDataFromConfig(network).apiURL;
  const rpc = getNetworkDataFromConfig(network).alchemyRPC;
  const provider = new ethers.JsonRpcProvider(rpc);
  try {
    const ucHandlerAddress = getUcHandlerAddress(network);
    const ucHandlerAbi = await fetchABI(explorerApiUrl, ucHandlerAddress);
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
