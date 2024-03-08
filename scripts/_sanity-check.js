const { exec } = require("child_process");
const { getConfigPath } = require('./_helpers.js');

function runSanityCheck(network) {
    // Example: 
    // $ node scripts/sanity-check.js
    const configPath = getConfigPath();
    const config = require(configPath);

    const scriptSuffix = config.isUniversal ? 'universal' : 'custom';
    exec(`npx hardhat run scripts/_sanity-check-${scriptSuffix}.js --network ${network}`, (error, stdout, stderr) => {
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