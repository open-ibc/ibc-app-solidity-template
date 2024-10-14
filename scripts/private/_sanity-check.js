// Example:
// $ node scripts/sanity-check.js
const { exec } = require('child_process');
const { getConfigPath } = require('./_helpers.js');

function runSanityCheck(config, network) {
  const scriptSuffix = config.isUniversal ? 'universal' : 'custom';

  exec(`npx hardhat run scripts/private/_sanity-check-${scriptSuffix}.js --network ${network}`, (error, stdout) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(stdout);
  });
}

function main() {
  const config = require(getConfigPath());
  const configChains = config.isUniversal ? Object.keys(config.sendUniversalPacket.networks) : Object.keys(config.sendPacket.networks);

  configChains.forEach((network) => {
    runSanityCheck(config, network);
  });
}

main();
