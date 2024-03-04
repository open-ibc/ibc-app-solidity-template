const hre = require("hardhat");
const path = require("path");

const explorerOpUrl = "https://optimism-sepolia.blockscout.com/";
const explorerBaseUrl = "https://base-sepolia.blockscout.com/";
const configRelativePath = process.env.CONFIG_PATH || "config.json";
const configPath = path.join(__dirname, "..", configRelativePath);
const config = require(configPath);

function listenForIbcChannelEvents(network, source, dispatcher) {
    const explorerUrl = network === "optimism" ? explorerOpUrl : explorerBaseUrl;
    const currentNetworkPortAddr = config.sendPacket[network].portAddr;
    console.log(`👂 Listening for IBC channel events on ${network}...`);

    dispatcher.on(
        "OpenIbcChannel",
        (portAddress, version, ordering, feeEnabled, connectionHops, counterparytPortId, counterpartyChannelId, event) => {
            const txHash = event.log.transactionHash;
            const counterpartyChannelIdString = hre.ethers.decodeBytes32String(counterpartyChannelId);
            const url = `${explorerUrl}tx/${txHash}`;

            if (portAddress === currentNetworkPortAddr) {
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
          🛣️  Counterparty Channel ID: ${counterpartyChannelIdString}
          🦘 Connection Hops: ${connectionHops}
          🔀 Ordering: ${ordering}
          💰 Fee Enabled: ${feeEnabled}
          #️⃣ Version: ${version}
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
        }
    );

    dispatcher.on("ConnectIbcChannel", (portAddress, channelId, event) => {
        const txHash = event.log.transactionHash;
        const channelIdString = hre.ethers.decodeBytes32String(channelId);
        const url = `${explorerUrl}tx/${txHash}`;
        if (portAddress === currentNetworkPortAddr) {
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

    dispatcher.on("CloseIbcChannel", (portAddress, channelId, event) => {
        const txHash = event.log.transactionHash;
        const channelIdString = hre.ethers.decodeBytes32String(channelId);
        const url = `${explorerUrl}tx/${txHash}`;
        if (portAddress === currentNetworkPortAddr) {
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

function listenForIbcPacketEvents(network, dispatcher) {
    const explorerUrl = network === "optimism" ? explorerOpUrl : explorerBaseUrl;
    const srcNetworkPortAddr = config.sendPacket[network].portAddr;
    const destNetworkPortAddr = config.sendPacket[network].destPortAddr;
    console.log(`👂 Listening for IBC packet events on ${network}...`);

    dispatcher.on("SendPacket", (sourcePortAddress, sourceChannelId, packet, sequence, timeoutTimestamp, event) => {
        const txHash = event.log.transactionHash;
        const sourceChannelIdString = hre.ethers.decodeBytes32String(sourceChannelId);
        const url = `${explorerUrl}tx/${txHash}`;

        if (sourcePortAddress === srcNetworkPortAddr) {
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

    dispatcher.on("RecvPacket", (destPortAddress, destChannelId, sequence, event) => {
        const txHash = event.log.transactionHash;
        const destChannelIdString = hre.ethers.decodeBytes32String(destChannelId);
        const url = `${explorerUrl}tx/${txHash}`;

        if (destPortAddress === destNetworkPortAddr) {
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

    dispatcher.on("WriteAckPacket", (writerPortAddress, writerChannelId, sequence, ackPacket, event) => {
        const txHash = event.log.transactionHash;
        const writerChannelIdString = hre.ethers.decodeBytes32String(writerChannelId);
        const url = `${explorerUrl}tx/${txHash}`;
        if (writerPortAddress === destNetworkPortAddr) {
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

    dispatcher.on("Acknowledgement", (sourcePortAddress, sourceChannelId, sequence, event) => {
        const txHash = event.log.transactionHash;
        const sourceChannelIdString = hre.ethers.decodeBytes32String(sourceChannelId);
        const url = `${explorerUrl}tx/${txHash}`;
        if (sourcePortAddress === srcNetworkPortAddr) {
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

module.exports = { listenForIbcChannelEvents, listenForIbcPacketEvents };
