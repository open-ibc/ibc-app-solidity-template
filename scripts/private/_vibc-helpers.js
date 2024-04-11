const { ethers } = require('hardhat');
const { getConfigPath, fetchABI, convertNetworkToChainId } = require('./_helpers.js');

const polyConfig = require('../../lib/polymer-registry-poc/dist/output.json');

const rpcOptimism = `https://opt-sepolia.g.alchemy.com/v2/${process.env.OP_ALCHEMY_API_KEY}`;
const rpcBase = `https://base-sepolia.g.alchemy.com/v2/${process.env.BASE_ALCHEMY_API_KEY}`;

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
  const providerOptimism = new ethers.JsonRpcProvider(rpcOptimism);
  const providerBase = new ethers.JsonRpcProvider(rpcBase);

  const chainId = convertNetworkToChainId(network);
  const explorerUrl = `${polyConfig[`${chainId}`]['explorers'][0]['url']}/`;

  let dispatcher;
  let dispatcherAddress;
  try {
    dispatcherAddress = getDispatcherAddress(network);
    //console.log(`🗄️  Fetching dispatcher on ${network} at address: ${dispatcherAddress}`)
    //console.log(`🔍  Fetching dispatcher ABI from: ${explorerUrl}`)
    const dispatcherAbi = await fetchABI(explorerUrl, dispatcherAddress);

    // TODO: Update for multiple clients
    const provider = network === 'optimism' ? providerOptimism : providerBase;

    dispatcher = new ethers.Contract(dispatcherAddress, dispatcherAbi, provider);
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
  const providerOptimism = new ethers.JsonRpcProvider(rpcOptimism);
  const providerBase = new ethers.JsonRpcProvider(rpcBase);

  const chainId = convertNetworkToChainId(network);
  const explorerUrl = `${polyConfig[`${chainId}`]['explorers'][0]['url']}/`;

  const ucHandlerAddress = getUcHandlerAddress(network);
  try {
    const ucHandlerAbi = await fetchABI(explorerUrl, ucHandlerAddress);
    const provider = network === 'optimism' ? providerOptimism : providerBase;

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
