const hre = require('hardhat');
const { areAddressesEqual, getConfigPath } = require('./_helpers.js');
const { getDispatcher, getUcHandlerAddress } = require('./_vibc-helpers.js');

const explorerOpUrl = 'https://optimism-sepolia.blockscout.com/';
const explorerBaseUrl = 'https://base-sepolia.blockscout.com/';

function filterChannelEvents(portAddress) {
  const config = require(getConfigPath());
  return areAddressesEqual(portAddress, config.createChannel['srcAddr']) || areAddressesEqual(portAddress, config.createChannel['dstAddr']);
}

function listenForIbcChannelEvents(network, source, dispatcher) {
  const explorerUrl = network === 'optimism' ? explorerOpUrl : explorerBaseUrl;
  console.log(`👂 Listening for IBC channel events on ${network}...`);
  dispatcher.on('ChannelOpenInit', (portAddress, version, ordering, feeEnabled, connectionHops, counterparytPortId, event) => {
    const txHash = event.log.transactionHash;
    const url = `${explorerUrl}tx/${txHash}`;

    if (filterChannelEvents(portAddress)) {
      console.log(`
          -------------------------------------------`);
      if (source) {
        console.log(`
          🙋‍♀️   CHANNEL OPEN INIT !!!   🙋‍♀️`);
      } else {
        console.log(`
          🙋‍♂️   CHANNEL OPEN TRY !!!   🙋‍♂️`);
      }

      console.log(`
          -------------------------------------------
          🔔 Event name: ${event.log.fragment.name}
          ⛓️  Network: ${network}
          🔗 Port Address: ${portAddress}
          🔗 Counterparty Port ID: ${counterparytPortId}
          🦘 Connection Hops: ${connectionHops}
          🔀 Ordering: ${ordering}
          💰 Fee Enabled: ${feeEnabled}
          #️⃣  Version: ${version}
          -------------------------------------------
          🧾 TxHash: ${txHash}
          🔍 Explorer URL: ${url}
          -------------------------------------------\n`);

      if (source) {
        console.log(` ⏱️  Waiting for channel open try...`);
      } else {
        console.log(` ⏱️  Waiting for channel open ack...`);
      }
    }
  });

  dispatcher.on('ChannelOpenAck', (portAddress, channelId, event) => {
    const txHash = event.log.transactionHash;
    const channelIdString = hre.ethers.decodeBytes32String(channelId);
    const url = `${explorerUrl}tx/${txHash}`;
    if (filterChannelEvents(portAddress)) {
      console.log(`
          -------------------------------------------`);
      if (source) {
        console.log(`
          👩‍❤️‍💋‍👨   CHANNEL OPEN ACK !!!   👩‍❤️‍💋‍👨`);
      } else {
        console.log(`
          🤵‍♂️💍👰‍♀️   CHANNEL OPEN CONFIRM !!!   👰‍♀️💍🤵‍♂️`);
      }
      console.log(`
          -------------------------------------------
          🔔 Event name: ${event.log.fragment.name}
          ⛓️  Network: ${network}
          🔗 Port Address: ${portAddress}
          🛣️  Channel ID: ${channelIdString}
          -------------------------------------------
          🧾 TxHash: ${txHash}
          🔍 Explorer URL: ${url}
          -------------------------------------------\n`);
      if (source) {
        console.log(` ⏱️  Waiting for channel open confirm...`);
      } else {
        console.log(` ⏱️  Waiting for channel creation overview...`);
      }
    }
    dispatcher.removeAllListeners();
  });

  dispatcher.on('ChannelOpenConfirm', (portAddress, channelId, event) => {
    const txHash = event.log.transactionHash;
    const channelIdString = hre.ethers.decodeBytes32String(channelId);
    const url = `${explorerUrl}tx/${txHash}`;
    if (filterChannelEvents(portAddress)) {
      console.log(`
          -------------------------------------------
          🔗 🔒   IBC CHANNEL CLOSED !!!   🔗 🔒
          -------------------------------------------
          🔔 Event name: ${event.log.fragment.name}
          ⛓️  Network: ${network}
          🔗 Port Address: ${portAddress}
          🛣️  Channel ID: ${channelIdString}
          -------------------------------------------
          🧾 TxHash: ${txHash}
          🔍 Explorer URL: ${url}
          -------------------------------------------\n`);
    }
    dispatcher.removeAllListeners();
  });
}

function filterPacketEvents(portAddress, network) {
  const config = require(getConfigPath());
  const sendPacketConfig = config.sendPacket;
  const ucHandlerAddr = getUcHandlerAddress(network);

  return areAddressesEqual(portAddress, sendPacketConfig[`${network}`].portAddr) || areAddressesEqual(portAddress, ucHandlerAddr);
}

function listenForIbcPacketEvents(network, dispatcher) {
  const explorerUrl = network === 'optimism' ? explorerOpUrl : explorerBaseUrl;
  console.log(`👂 Listening for IBC packet events on ${network}...`);

  dispatcher.on('SendPacket', (sourcePortAddress, sourceChannelId, packet, sequence, timeoutTimestamp, event) => {
    const txHash = event.log.transactionHash;
    const sourceChannelIdString = hre.ethers.decodeBytes32String(sourceChannelId);
    const url = `${explorerUrl}tx/${txHash}`;

    if (filterPacketEvents(sourcePortAddress, network)) {
      console.log(` 
          -------------------------------------------
          📦 📮   PACKET HAS BEEN SENT !!!   📦 📮
          -------------------------------------------
          🔔 Event name: ${event.log.fragment.name}
          ⛓️  Network: ${network}
          🔗 Source Port Address: ${sourcePortAddress}
          🛣️  Source Channel ID: ${sourceChannelIdString}
          📈 Sequence: ${sequence}
          ⏳ Timeout Timestamp: ${timeoutTimestamp}
          -------------------------------------------
          🧾 TxHash: ${txHash}
          🔍 Explorer URL: ${url}
          -------------------------------------------\n`);
      console.log(` ⏱️  Waiting for packet receipt...`);
    }
  });

  dispatcher.on('RecvPacket', (destPortAddress, destChannelId, sequence, event) => {
    const txHash = event.log.transactionHash;
    const destChannelIdString = hre.ethers.decodeBytes32String(destChannelId);
    const url = `${explorerUrl}tx/${txHash}`;

    if (filterPacketEvents(destPortAddress, network)) {
      console.log(`
          -------------------------------------------
          📦 📬   PACKET IS RECEIVED !!!   📦 📬
          -------------------------------------------
          🔔 Event name: ${event.log.fragment.name}
          ⛓️  Network: ${network}
          🔗 Destination Port Address: ${destPortAddress}
          🛣️  Destination Channel ID: ${destChannelIdString}
          📈 Sequence: ${sequence}
          -------------------------------------------
          🧾 TxHash: ${txHash}
          🔍 Explorer URL: ${url}
          -------------------------------------------\n`);
      console.log(` ⏱️  Waiting for write acknowledgement...`);
    }
  });

  dispatcher.on('WriteAckPacket', (writerPortAddress, writerChannelId, sequence, ackPacket, event) => {
    const txHash = event.log.transactionHash;
    const writerChannelIdString = hre.ethers.decodeBytes32String(writerChannelId);
    const url = `${explorerUrl}tx/${txHash}`;
    if (filterPacketEvents(writerPortAddress, network)) {
      console.log(` 
          -------------------------------------------
          📦 📝   ACKNOWLEDGEMENT WRITTEN !!!   📦 📝
          -------------------------------------------
          🔔 Event name: ${event.log.fragment.name}
          ⛓️  Network: ${network}
          🔗 Destination Port Address: ${writerPortAddress}
          🛣️  Channel ID: ${writerChannelIdString}
          📈 Sequence: ${sequence}
          -------------------------------------------
          🧾 TxHash: ${txHash}
          🔍 Explorer URL: ${url}
          -------------------------------------------\n`);
      console.log(` ⏱️  Waiting for acknowledgement...`);
    }
    dispatcher.removeAllListeners();
  });

  dispatcher.on('Acknowledgement', (sourcePortAddress, sourceChannelId, sequence, event) => {
    const txHash = event.log.transactionHash;
    const sourceChannelIdString = hre.ethers.decodeBytes32String(sourceChannelId);
    const url = `${explorerUrl}tx/${txHash}`;
    if (filterPacketEvents(sourcePortAddress, network)) {
      console.log(`   
          -------------------------------------------
          📦 🏁   PACKET IS ACKNOWLEDGED !!!   📦 🏁
          -------------------------------------------
          🔔 Event name: ${event.log.fragment.name}
          ⛓️  Network: ${network}
          🔗 Source Port Address: ${sourcePortAddress}
          🛣️  Source Channel ID: ${sourceChannelIdString}
          📈 Sequence: ${sequence}
          -------------------------------------------
          🧾 TxHash: ${txHash}
          🔍 Explorer URL: ${url}
          -------------------------------------------\n`);
    }
    dispatcher.removeAllListeners();
  });
}

async function setupIbcPacketEventListener() {
  console.log('🔊 Setting up IBC packet event listener...');
  // Get the dispatchers for both source and destination to listen for IBC packet events
  const opDispatcher = await getDispatcher('optimism');
  const baseDispatcher = await getDispatcher('base');
  listenForIbcPacketEvents('optimism', opDispatcher);
  listenForIbcPacketEvents('base', baseDispatcher);
}

async function setupIbcChannelEventListener() {
  console.log('🔊 Setting up IBC channel event listener...');
  const config = require(getConfigPath());
  const opIsSource = config.createChannel.srcChain === 'optimism';
  const baseIsSource = config.createChannel.srcChain === 'base';

  // Get the dispatchers for both source and destination to listen for IBC packet events
  const opDispatcher = await getDispatcher('optimism');
  const baseDispatcher = await getDispatcher('base');
  listenForIbcChannelEvents('optimism', opIsSource, opDispatcher);
  // listenForIbcChannelEvents('base', baseIsSource, baseDispatcher);
}

module.exports = {
  listenForIbcChannelEvents,
  listenForIbcPacketEvents,
  setupIbcPacketEventListener,
  setupIbcChannelEventListener,
};
