const { exec } = require("child_process");
const {getConfigPath} = require('./_helpers.js');
const { setupIbcPacketEventListener } = require('./_events.js');

const source = process.argv[2];
if (!(source === "optimism" || source === "base")) {
  console.error("Please provide a valid source chain");
  process.exit(1);
}

function runSendPacket(config) {
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
        }else {
          console.log(stdout);
        }
    });
  }
}

async function main() {
  const configPath = getConfigPath();
  const config = require(configPath);

  await setupIbcPacketEventListener();

  runSendPacket(config);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});