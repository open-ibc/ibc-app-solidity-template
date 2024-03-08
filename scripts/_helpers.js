const axios = require('axios');
const hre = require('hardhat');
const fs = require('fs');
const ibcConfig = require("../ibc.json");

function getConfigPath() {
  const path = require('path');
  const configRelativePath = process.env.CONFIG_PATH ? process.env.CONFIG_PATH : 'config.json';
  // console.log(`Using config file at ${configRelativePath}`);
  const configPath = path.join(__dirname, '..' , configRelativePath);
  return configPath;
}

// Function to update config.json
function updateConfigDeploy(network, address, isSource) {
  const configPath = getConfigPath();
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  // Update the config object
  if (!config.isUniversal) {
    if (isSource) {
      config["createChannel"]["srcChain"] = network;
      config["createChannel"]["srcAddr"] = address;
    } else {
      config["createChannel"]["dstChain"] = network;
      config["createChannel"]["dstAddr"] = address;
    }

    config["sendPacket"][`${network}`]["portAddr"] = address;    
  } else if (config.isUniversal){
    // When using the universal channel, we can skip channel creation and instead update the sendUniversalPacket field in the config
    config["sendUniversalPacket"][`${network}`]["portAddr"] = address;
    config["sendUniversalPacket"][`${network}`]["channelId"] = ibcConfig[`${network}`]["sim-client"]["universalChannel"];
  }

  // Write the updated config back to the file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Function to update config.json
function updateConfigCreateChannel(network, channel, cpNetwork, cpChannel) {
  const configPath = getConfigPath();
  const upConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Update the config object
  upConfig["sendPacket"][`${network}`]["channelId"] = channel;
  upConfig["sendPacket"][`${cpNetwork}`]["channelId"] = cpChannel;

  // Write the updated config back to the file
  fs.writeFileSync(configPath, JSON.stringify(upConfig, null, 2));
}

async function fetchABI(explorerUrl, contractAddress) {
  try {
    const response = await axios.get(`${explorerUrl}api/v2/smart-contracts/${contractAddress}`);
    if (response.status === 200) {
      const abi = response.data.abi;
      return abi;
    } else {
      console.error(`Failed to fetch ABI, status code: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching ABI:', error);
    return null;
  }
}

function areAddressesEqual(address1, address2) {
  // Validate input addresses
  if (!hre.ethers.isAddress(address1) || !hre.ethers.isAddress(address2)) {
    throw new Error('One or both addresses are not valid Ethereum addresses');
  }
  // Normalize addresses to checksummed format

  const checksumAddress1 = hre.ethers.getAddress(address1);
  const checksumAddress2 = hre.ethers.getAddress(address2);

  // Compare addresses
  const areEqual = checksumAddress1 === checksumAddress2;
  return areEqual;
}

// Helper function to convert an address to a port ID
function addressToPortId(portPrefix, address) {
  const configPath = getConfigPath();
  const config = require(configPath);
  const simAddOn = config.proofsEnabled ? '-proofs-1' :'-sim';
  const suffix = address.slice(2);
  return `${portPrefix}${simAddOn}.${suffix}`;
}

module.exports = { getConfigPath, updateConfigDeploy, updateConfigCreateChannel, fetchABI, areAddressesEqual, addressToPortId };
