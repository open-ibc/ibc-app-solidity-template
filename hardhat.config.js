require("@nomicfoundation/hardhat-toolbox");

require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200 // Optimize for a typical number of runs
      }
    }    
  },
  networks: {
    // for Base testnet
    'base-sepolia': {
      url: 'https://sepolia.base.org',
      accounts: [
        process.env.BASE_WALLET_KEY_1,
        process.env.BASE_WALLET_KEY_2,
        process.env.BASE_WALLET_KEY_3,
      ],
    },
    // for OP testnet
    'op-sepolia': {
      url: 'https://sepolia.optimism.io',
      accounts: [
        process.env.OP_WALLET_KEY_1, 
        process.env.OP_WALLET_KEY_2, 
        process.env.OP_WALLET_KEY_3,
      ],
    },    
  },
  defaultNetwork: 'op-sepolia',
};
