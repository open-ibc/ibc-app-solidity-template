const hre = require('hardhat');
const explorerOpUrl = "https://optimism-sepolia.blockscout.com/";
const explorerBaseUrl = "https://base-sepolia.blockscout.com/";

function listenForIbcChannelEvents (network, source, dispatcher) {
    const explorerUrl = network === "optimism" ? explorerOpUrl : explorerBaseUrl;
    console.log(`👂 Listening for IBC channel events on ${network}...`);

    dispatcher.on('OpenIbcChannel',
      (portAddress, version, ordering, feeEnabled, connectionHops, counterparytPortId, counterpartyChannelId, event) => {
        const txHash = event.log.transactionHash;
        const counterpartyChannelIdString = hre.ethers.decodeBytes32String(counterpartyChannelId);
        const url = `${explorerUrl}tx/${txHash}`;

        console.log(`-------------------------------------------`);
        if (source) {
            console.log(`🙋‍♀️   CHANNEL OPEN INIT !!!   🙋‍♀️`);
        } else {
            console.log(`🙋‍♂️   CHANNEL OPEN TRY !!!   🙋‍♂️`);
        }
        console.log(`-------------------------------------------`);
        console.log(`🔔 Event name: ${event.log.fragment.name}`)
        console.log(`⛓️  Network: ${network}`)
        console.log(`🔗 Port Address: ${portAddress}`);
        console.log(`🔗 Counterparty Port ID: ${counterparytPortId}`);
        console.log(`🛣️  Counterparty Channel ID: ${counterpartyChannelIdString}`);
        console.log(`🦘 Connection Hops: ${connectionHops}`);
        console.log(`🔀 Ordering: ${ordering}`);
        console.log(`💰 Fee Enabled: ${feeEnabled}`);
        console.log(`#️⃣ Version: ${version}`);
        console.log(`-------------------------------------------`);
        console.log(`🧾 TxHash: ${txHash}`);
        console.log(`🔍 Explorer URL: ${url}`);
        console.log(`-------------------------------------------\n`);
    });

    dispatcher.on('ConnectIbcChannel',
      (portAddress, channelId, event) => {
        const txHash = event.log.transactionHash;
        const channelIdString = hre.ethers.decodeBytes32String(channelId);
        const url = `${explorerUrl}tx/${txHash}`;

        console.log(`-------------------------------------------`);
        if (source) {
            console.log(`🫶   CHANNEL OPEN ACK !!!   🫶`);
        } else {
            console.log(`🤝   CHANNEL OPEN CONFIRM !!!   🤝`);
        }
        console.log(`🔔 Event name: ${event.log.fragment.name}`)
        console.log(`⛓️  Network: ${network}`)
        console.log(`🔗 Port Address: ${portAddress}`);
        console.log(`🛣️  Channel ID: ${channelIdString}`);
        console.log(`-------------------------------------------`);
        console.log(`🧾 TxHash: ${txHash}`);
        console.log(`🔍 Explorer URL: ${url}`);
        console.log(`-------------------------------------------\n`);

        dispatcher.removeAllListeners();
    });

    dispatcher.on('CloseIbcChannel',
      (portAddress, channelId, event) => {
        const txHash = event.log.transactionHash;
        const channelIdString = hre.ethers.decodeBytes32String(channelId);
        const url = `${explorerUrl}tx/${txHash}`;

        console.log(`-------------------------------------------`);
        console.log(`🔗 🔒   IBC CHANNEL CLOSED !!!   🔗 🔒`);
        console.log(`-------------------------------------------`);
        console.log(`🔔 Event name: ${event.log.fragment.name}`)
        console.log(`⛓️  Network: ${network}`)
        console.log(`🔗 Port Address: ${portAddress}`);
        console.log(`🛣️  Channel ID: ${channelIdString}`);
        console.log(`-------------------------------------------`);
        console.log(`🧾 TxHash: ${txHash}`);
        console.log(`🔍 Explorer URL: ${url}`);
        console.log(`-------------------------------------------\n`);

        dispatcher.removeAllListeners();
    });
}

function listenForIbcPacketEvents (network, dispatcher) {
    const explorerUrl = network === "optimism" ? explorerOpUrl : explorerBaseUrl;
    console.log(`👂 Listening for IBC packet events on ${network}...`);

    dispatcher.on('SendPacket',
      (sourcePortAddress, sourceChannelId, packet, sequence, timeoutTimestamp, event) => {
        const txHash = event.log.transactionHash;
        const sourceChannelIdString = hre.ethers.decodeBytes32String(sourceChannelId);
        const url = `${explorerUrl}tx/${txHash}`;

        console.log(`-------------------------------------------`);
        console.log(`📦 📮   PACKET SENT !!!   📦 📮`);
        console.log(`-------------------------------------------`);
        console.log(`🔔 Event name: ${event.log.fragment.name}`)
        console.log(`⛓️  Network: ${network}`)
        console.log(`🔗 Source Port Address: ${sourcePortAddress}`);
        console.log(`🛣️  Source Channel ID: ${sourceChannelIdString}`);
        console.log(`📈 Sequence: ${sequence}`);
        console.log(`⏳ Timeout Timestamp: ${timeoutTimestamp}`);
        console.log(`-------------------------------------------`);
        console.log(`🧾 TxHash: ${txHash}`);
        console.log(`🔍 Explorer URL: ${url}`);
        console.log(`-------------------------------------------\n`);
    });

    dispatcher.on('RecvPacket',
      (destPortAddress, destChannelId, sequence, event) => {
        const txHash = event.log.transactionHash;
        const destChannelIdString = hre.ethers.decodeBytes32String(destChannelId);
        const url = `${explorerUrl}tx/${txHash}`;

        console.log(`-------------------------------------------`);
        console.log(`📦 📬   PACKET RECEIVED !!!   📦 📬`);
        console.log(`-------------------------------------------`);
        console.log(`🔔 Event name: ${event.log.fragment.name}`)
        console.log(`⛓️  Network: ${network}`)
        console.log(`🔗 Destination Port Address: ${destPortAddress}`);
        console.log(`🛣️  Destination Channel ID: ${destChannelIdString}`);
        console.log(`📈 Sequence: ${sequence}`);
        console.log(`-------------------------------------------`);
        console.log(`🧾 TxHash: ${txHash}`);
        console.log(`🔍 Explorer URL: ${url}`);
        console.log(`-------------------------------------------\n`);

    });

    dispatcher.on('WriteAckPacket',
      (writerPortAddress, writerChannelId, sequence, ackPacket, event) => {
        const txHash = event.log.transactionHash;
        const writerChannelIdString = hre.ethers.decodeBytes32String(writerChannelId);
        const url = `${explorerUrl}tx/${txHash}`;

        console.log(`-------------------------------------------`);
        console.log(`📦 📝   ACKNOWLEDGEMENT WRITTEN !!!   📦 📝`);
        console.log(`-------------------------------------------`);
        console.log(`🔔 Event name: ${event.log.fragment.name}`)
        console.log(`⛓️  Network: ${network}`)
        console.log(`🔗 Destination Port Address: ${writerPortAddress}`);
        console.log(`🛣️  Channel ID: ${writerChannelIdString}`);
        console.log(`📈 Sequence: ${sequence}`);
        console.log(`-------------------------------------------`);
        console.log(`🧾 TxHash: ${txHash}`);
        console.log(`🔍 Explorer URL: ${url}`);
        console.log(`-------------------------------------------\n`);

        dispatcher.removeAllListeners();
    });

    dispatcher.on('Acknowledgement',
      (sourcePortAddress, sourceChannelId, sequence, event) => {
        const txHash = event.log.transactionHash;
        const sourceChannelIdString = hre.ethers.decodeBytes32String(sourceChannelId);
        const url = `${explorerUrl}tx/${txHash}`;

        console.log(`-----------------------------------`);
        console.log(`📦 🏁   PACKET ACKNOWLEDGED !!!   📦 🏁`);
        console.log(`-----------------------------------`);
        console.log(`🔔 Event name: ${event.log.fragment.name}`)
        console.log(`⛓️  Network: ${network}`)
        console.log(`🔗 Source Port Address: ${sourcePortAddress}`);
        console.log(`🛣️  Source Channel ID: ${sourceChannelIdString}`);
        console.log(`📈 Sequence: ${sequence}`);
        console.log(`-----------------------------------`);
        console.log(`🧾 TxHash: ${txHash}`);
        console.log(`🔍 Explorer URL: ${url}`);
        console.log(`-----------------------------------\n`);

        dispatcher.removeAllListeners();
    });
}

module.exports = { listenForIbcChannelEvents, listenForIbcPacketEvents};