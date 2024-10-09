require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-foundry');

require('dotenv').config();

const polyConfig = require('./lib/polymer-registry/dist/output.json');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: '0.8.23',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200, // Optimize for a typical number of runs
          },
        },
      },
      {
        version: '0.8.15',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200, // Optimize for a typical number of runs
          },
        },
      },
    ],
  },
  networks: {
    // for Base testnet
    base: {
      url: 'https://sepolia.base.org',
      alchemyRPC: `https://base-sepolia.g.alchemy.com/v2/${process.env.BASE_ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY_1],
      chainId: 84532,
    },
    // for OP testnet
    optimism: {
      url: 'https://sepolia.optimism.io',
      alchemyRPC: `https://opt-sepolia.g.alchemy.com/v2/${process.env.OP_ALCHEMY_API_KEY}`,
      accounts: [process.env.PRIVATE_KEY_1],
      chainId: 11155420,
    },
    molten: {
      url: 'https://sepolia.molten.io',
      accounts: [process.env.PRIVATE_KEY_1],
      chainId: 49483,
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
    customChains: [
      {
        network: 'base',
        chainId: 84532,
        urls: {
          apiURL: 'https://base-sepolia.blockscout.com/api',
          apiKey: process.env.BASE_BLOCKSCOUT_API_KEY,
          browserURL: 'https://base-sepolia.blockscout.com',
        },
      },
      {
        network: 'optimism',
        chainId: 11155420,
        urls: {
          apiURL: 'https://optimism-sepolia.blockscout.com/api',
          apiKey: process.env.OP_BLOCKSCOUT_API_KEY,
          browserURL: 'https://optimism-sepolia.blockscout.com',
        },
      },
    ],
  },
  polymer: polyConfig,
  vibcConfigPath: 'config/config.json', // path to configuration file the scripts will use for Polymer's vibc, defaulting to config/config.json when not set
};
