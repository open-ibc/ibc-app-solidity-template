const { exec } = require("child_process");
const {getConfigPath, getWhitelistedNetworks} = require('./_helpers.js');
const { setupIbcPacketEventListener } = require('./_events.js');

const source = process.argv[2];
if (!source) {
  console.error('Usage: node send-packet-config.js <source_network>');
  process.exit(1);
}

function runSendPacket(config) {
  const allowedNetworks = getWhitelistedNetworks();
  if (!allowedNetworks.includes(source)) {
    console.error("Please provide a valid source chain");
    process.exit(1);
  }

  // Run the send-packet or send-universal-packet script based on the config
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