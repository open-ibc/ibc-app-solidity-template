const {ethers} = require("hardhat");
const fetchABI = require("./_fetchABI.js");

const explorerOpUrl = "https://optimism-sepolia.blockscout.com/";
const explorerBaseUrl = "https://base-sepolia.blockscout.com/";

const rpcOptimism = `https://opt-sepolia.g.alchemy.com/v2/${process.env.OP_ALCHEMY_API_KEY}`;
const rpcBase = `https://base-sepolia.g.alchemy.com/v2/${process.env.BASE_ALCHEMY_API_KEY}`;

async function getDispatcher (network) {
    const providerOptimism = new ethers.JsonRpcProvider(rpcOptimism);
    const providerBase = new ethers.JsonRpcProvider(rpcBase);

    let explorerUrl;
    let dispatcher;

    if (network === "optimism") {
        explorerUrl = explorerOpUrl;

        const opDispatcherAbi = await fetchABI(explorerUrl, process.env.OP_DISPATCHER);
        dispatcher = new ethers.Contract(process.env.OP_DISPATCHER, opDispatcherAbi, providerOptimism);
    } else if (network === "base") {
        explorerUrl = explorerBaseUrl;

        const baseDispatcherAbi = await fetchABI(explorerUrl, process.env.BASE_DISPATCHER);
        dispatcher = new ethers.Contract(process.env.BASE_DISPATCHER, baseDispatcherAbi, providerBase);
    } else {
        throw new error(`Invalid network: ${network}`);
    }

    return dispatcher;
}

module.exports = getDispatcher;