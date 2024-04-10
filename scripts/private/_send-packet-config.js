const { exec } = require('child_process');
const { getConfigPath, getWhitelistedNetworks, convertNetworkToChainId } = require('./_helpers.js');
const { setupIbcPacketEventListener } = require('./_events.js');

const source = process.argv[2];
if (!source) {
  console.error('Usage: node send-packet-config.js <source_network>');
  process.exit(1);
}

function runSendPacketCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
      } else {
        console.log(stdout);
        resolve(true);
      }
    });
  });
}

async function runSendPacket(config) {
  // Check if the source chain from user input is whitelisted
  const allowedNetworks = getWhitelistedNetworks();
  const srcChainId = convertNetworkToChainId(source);
  if (!allowedNetworks.includes(`${srcChainId}`)) {
    console.error('❌ Please provide a valid source chain');
    process.exit(1);
  }

  const destination = config.isUniversal
    ? Object.keys(config.sendUniversalPacket).filter((chain) => chain !== source)
    : Object.keys(config.sendPacket).filter((chain) => chain !== source);

  const script = config.isUniversal ? 'send-universal-packet.js' : 'send-packet.js';
  const command = `npx hardhat run scripts/${script} --network ${source}`;

  try {
    await setupIbcPacketEventListener(source, destination);
    await runSendPacketCommand(command);
  } catch (error) {
    console.error('❌ Error sending packet: ', error);
    process.exit(1);
  }
}

async function main() {
  const configPath = getConfigPath();
  const config = require(configPath);

  await runSendPacket(config);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
