const { exec } = require("child_process");

function runSanityCheck(network) {
    // Example: 
    // $ node scripts/sanity-check.js false
    const isUniversalChannel = process.argv[2].toLowerCase();

    const scriptSuffix = isUniversalChannel === 'true' ? 'universal' : 'custom';
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