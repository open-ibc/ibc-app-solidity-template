const {getConfigPath} = require('./_helpers');
const configPath = getConfigPath();
const config = require(configPath);
const { exec } = require("child_process");

const source = process.argv[2];
console.log("source", source);
if (!(source !=="optimism" || source !=="base")) {
  console.error("Please provide a source chain");
  process.exit(1);
}

if (config.isUniversal) {
    exec(`npx hardhat run scripts/send-universal-packet.js --network ${source}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        } else {
          console.log(stdout);
        }
    });
} else {
    exec(`npx hardhat run scripts/send-packet.js --network ${source}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        } else {
          console.log(stdout);
        }
    });
}