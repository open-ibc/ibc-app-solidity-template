// Example: 
// $ node scripts/sanity-check.js
const { exec } = require("child_process");
const { getConfigPath } = require('./_helpers.js');

function runSanityCheck(network) {
    const config = require(getConfigPath());
    const scriptSuffix = config.isUniversal ? 'universal' : 'custom';
    
    exec(`npx hardhat run scripts/private/_sanity-check-${scriptSuffix}.js --network ${network}`, (error, stdout, stderr) => {
        if (error) {
        console.error(`exec error: ${error}`);
        return;
        }
        console.log(stdout);
     });
}

// TODO: EXTEND THIS TO SUPPORT MULTIPLE NETWORKS
runSanityCheck('optimism');
runSanityCheck('base');