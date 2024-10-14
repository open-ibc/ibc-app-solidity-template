const fs = require('fs');
const axios = require('axios');
const hre = require('hardhat');

// Function to get the path to the configuration file
function getConfigPath() {
  const path = require('path');
  const configRelativePath = hre.config.vibcConfigPath ? hre.config.vibcConfigPath : 'config/config.json';
  // console.log(`📔 Using config file at ${configRelativePath}`);
  const configPath = path.join(__dirname, '../..', configRelativePath);
  return configPath;
}

// Function to convert network name to chain ID, as specified in hardhat config file
function convertNetworkToChainId(network) {
  const chainId = hre.config.networks[`${network}`].chainId;
  if (!chainId) {
    throw new Error('❌ Chain ID not found for network:', network);
  }
  return chainId;
}

// Function that gets the explorer url and api url from HH config
function getNetworkDataFromConfig(network) {
  const networks = hre.config.networks;
  return networks[`${network}`];
}

// Function that gets the explorer url and api url from HH config
function getExplorerDataFromConfig(network) {
  const customChains = hre.config.etherscan.customChains;
  const chainInfo = customChains.find((chain) => chain.network === network);
  return chainInfo.urls;
}

// Function to update config.json
async function updateConfigDeploy(network, address, isSource) {
  const polyConfig = await fetchRegistryConfig();
  const chainId = hre.config.networks[`${network}`].chainId;
  try {
    const configPath = getConfigPath();
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    // Update the config object
    if (!config.isUniversal) {
      if (isSource) {
        config['createChannel']['srcChain'] = network;
        config['createChannel']['srcAddr'] = address;
      } else {
        config['createChannel']['dstChain'] = network;
        config['createChannel']['dstAddr'] = address;
      }

      config['sendPacket'][`${network}`]['portAddr'] = address;
    } else if (config.isUniversal) {
      // When using the universal channel, we can skip channel creation and instead update the sendUniversalPacket field in the config
      //TODO: update for multi-client selection
      const client = config.proofsEnabled ? 'op-client' : 'sim-client';
      config['sendUniversalPacket'][`${network}`]['portAddr'] = address;
      config['sendUniversalPacket'][`${network}`]['channelId'] = polyConfig[`${chainId}`]['clients'][`${client}`]['universalChannelId'];
    }

    // Write the updated config back to the file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('❌ Error updating config:', error);
  }
}

// Function to update config.json
function updateConfigCreateChannel(network, channel, cpNetwork, cpChannel) {
  try {
    const configPath = getConfigPath();
    const upConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Update the config object
    upConfig['sendPacket'][`${network}`]['channelId'] = channel;
    upConfig['sendPacket'][`${cpNetwork}`]['channelId'] = cpChannel;

    // Write the updated config back to the file
    fs.writeFileSync(configPath, JSON.stringify(upConfig, null, 2));
  } catch (error) {
    console.error('❌ Error updating config:', error);
  }
}

async function fetchRegistryConfig() {
  const configPath = getConfigPath();
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const baseUrl = config['polymerRegistryTestnetRepoUrl'];
  const res = await axios.get(baseUrl);
  return res.data;
}

async function fetchABI(explorerApiUrl, contractAddress) {
  try {
    const response = await axios.get(`${explorerApiUrl}/v2/smart-contracts/${contractAddress}`);
    if (response.status === 200) {
      const abi = response.data.abi;
      return abi;
    } else {
      console.error(`❌ Failed to fetch ABI, status code: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching ABI:', error);
    return null;
  }
}

function areAddressesEqual(address1, address2) {
  // Validate input addresses
  if (!hre.ethers.isAddress(address1) || !hre.ethers.isAddress(address2)) {
    throw new Error('❌ One or both addresses are not valid Ethereum addresses');
  }
  // Normalize addresses to checksummed format

  const checksumAddress1 = hre.ethers.getAddress(address1);
  const checksumAddress2 = hre.ethers.getAddress(address2);

  // Compare addresses
  const areEqual = checksumAddress1 === checksumAddress2;
  return areEqual;
}

// Helper function to convert an address to a port ID
function addressToPortId(address, portPrefix) {
  const suffix = address.slice(2);
  return `${portPrefix}${suffix}`;
}

function networkIsAllowed(network) {
  return hre.config.networks[network] !== undefined;
}

async function getWhitelistedNetworks() {
  const config = await fetchRegistryConfig();
  return Object.keys(config);
}

// Estimate fees from polymer's fee estimation for relayer
async function estimateRelayerFees(srcChainId, destChainId, maxRecvExecGas, maxAckExecGas) {
  const configPath = getConfigPath();
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const baseUrl = config['feeEstimatorApiUrl'];
  const url = `${baseUrl}/v2/packetEstimate`;
  const data = {
    destChainId: destChainId,
    srcChainId: srcChainId,
    maxRecvExecGas: maxRecvExecGas,
    maxAckExecGas: maxAckExecGas,
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error:', error);
  }
}

module.exports = {
  getConfigPath,
  convertNetworkToChainId,
  getNetworkDataFromConfig,
  getExplorerDataFromConfig,
  updateConfigDeploy,
  updateConfigCreateChannel,
  fetchABI,
  areAddressesEqual,
  addressToPortId,
  getWhitelistedNetworks,
  networkIsAllowed,
  estimateRelayerFees,
  fetchRegistryConfig,
};
