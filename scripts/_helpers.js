const axios = require('axios');
const hre = require('hardhat');

function getConfigPath() {
  const path = require('path');
  const configRelativePath = process.env.CONFIG_PATH ? process.env.CONFIG_PATH : 'config.json';
  console.log(`Using config file at ${configRelativePath}`);
  const configPath = path.join(__dirname, '..' , configRelativePath);
  return configPath;
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


module.exports = { getConfigPath, fetchABI, areAddressesEqual };
