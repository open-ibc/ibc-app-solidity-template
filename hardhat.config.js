require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-foundry");

require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.23',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200 // Optimize for a typical number of runs
      }
    }    
  },
  networks: {
    // for Base testnet
    'base': {
      url: 'https://sepolia.base.org',
      accounts: [
        process.env.PRIVATE_KEY_1
      ],
    },
    // for OP testnet
    'optimism': {
      url: 'https://sepolia.optimism.io',
      accounts: [
        process.env.PRIVATE_KEY_1
      ],
    },    
  },
  defaultNetwork: 'optimism',
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
    libraries: './lib',
  },
  etherscan: {
    apiKey: {
      optimism: process.env.OP_BLOCKSCOUT_API_KEY,
      base: process.env.BASE_BLOCKSCOUT_API_KEY,
    },
    customChains: [
      {
        network: "base",
        chainId: 84532,
        urls: {
          apiURL: "https://base-sepolia.blockscout.com/api",
          browserURL: "https://base-sepolia.blockscout.com",
        }
      },
      {
        network: "optimism",
        chainId: 11155420,
        urls: {
          apiURL: "https://optimism-sepolia.blockscout.com/api",
          browserURL: "https://optimism-sepolia.blockscout.com",
        }
      }
    ]
  },
};

