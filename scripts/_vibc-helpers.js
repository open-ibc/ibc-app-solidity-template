const {ethers} = require("hardhat");
const {fetchABI} = require("./_helpers.js");
const { getConfigPath } = require('./_helpers');

const explorerOpUrl = "https://optimism-sepolia.blockscout.com/";
const explorerBaseUrl = "https://base-sepolia.blockscout.com/";

const rpcOptimism = `https://opt-sepolia.g.alchemy.com/v2/${process.env.OP_ALCHEMY_API_KEY}`;
const rpcBase = `https://base-sepolia.g.alchemy.com/v2/${process.env.BASE_ALCHEMY_API_KEY}`;

async function getIbcApp (network, isUniversal) {
    const ibcAppAddr = isUniversal ? config["sendUniversalPacket"][`${network}`]["portAddr"] : config["sendPacket"][`${network}`]["portAddr"];
    console.log(`Fetching IBC app on ${network} at address: ${ibcAppAddr}`)
    const contractType = config["deploy"][`${network}`];
  
    const ibcApp = await hre.ethers.getContractAt(
        `${contractType}`,
        ibcAppAddr
    );
    return ibcApp;
  }

function getDispatcherAddress(network) {
    let dispatcherAddr;
    if (network === "optimism") {
        dispatcherAddr = config.proofsEnabled ? process.env.OP_DISPATCHER : process.env.OP_DISPATCHER_SIM;
    } else if (network === "base") {
        dispatcherAddr = config.proofsEnabled ? process.env.BASE_DISPATCHER : process.env.BASE_DISPATCHER_SIM;
    } else {
        throw new Error("Invalid network");
    }
    return dispatcherAddr;
}

async function getDispatcher (network) {
    const configPath = getConfigPath();
    const config = require(configPath);
    const providerOptimism = new ethers.JsonRpcProvider(rpcOptimism);
    const providerBase = new ethers.JsonRpcProvider(rpcBase);

    let explorerUrl;
    let dispatcher;
    let dispatcherAddress;

    if (network === "optimism") {
        explorerUrl = explorerOpUrl;
        dispatcherAddress = config.proofsEnabled ? dispatcherAddress = process.env.OP_DISPATCHER : dispatcherAddress = process.env.OP_DISPATCHER_SIM;

        const opDispatcherAbi = await fetchABI(explorerUrl, dispatcherAddress);
        dispatcher = new ethers.Contract(dispatcherAddress, opDispatcherAbi, providerOptimism);
    } else if (network === "base") {
        explorerUrl = explorerBaseUrl;
        dispatcherAddress = config.proofsEnabled ? dispatcherAddress = process.env.BASE_DISPATCHER : dispatcherAddress = process.env.BASE_DISPATCHER_SIM;

        const baseDispatcherAbi = await fetchABI(explorerUrl, dispatcherAddress);
        dispatcher = new ethers.Contract(dispatcherAddress, baseDispatcherAbi, providerBase);
    } else {
        throw new error(`Invalid network: ${network}`);
    }

    return dispatcher;
}

function getUcHandlerAddress(network) {
    let ucHandlerAddr;
    if (network === "optimism") {
        ucHandlerAddr = config.proofsEnabled ? process.env.OP_UC_MW : process.env.OP_UC_MW_SIM;
    } else if (network === "base") {
        ucHandlerAddr = config.proofsEnabled ? process.env.BASE_UC_MW : process.env.BASE_UC_MW_SIM;
    } else {
        throw new Error("Invalid network");
    }
    return ucHandlerAddr;
}

async function getUcHandler (network) {
    const configPath = getConfigPath();
    const config = require(configPath);
    const providerOptimism = new ethers.JsonRpcProvider(rpcOptimism);
    const providerBase = new ethers.JsonRpcProvider(rpcBase);

    let explorerUrl;
    let ucHandler;
    let ucHandlerAddress;

    if (network === "optimism") {
        explorerUrl = explorerOpUrl;
        ucHandlerAddress = config.proofsEnabled ? process.env.OP_UC_MW : process.env.OP_UC_MW_SIM;

        const opUcHandlerAbi = await fetchABI(explorerUrl, ucHandlerAddress);
        ucHandler = new ethers.Contract(ucHandlerAddress, opUcHandlerAbi, providerOptimism);
    } else if (network === "base") {
        explorerUrl = explorerBaseUrl;
        ucHandlerAddress = config.proofsEnabled ? process.env.BASE_UC_MW : process.env.BASE_UC_MW_SIM;

        const baseUcHandlerAbi = await fetchABI(explorerUrl, ucHandlerAddress);
        ucHandler = new ethers.Contract(ucHandlerAddress, baseUcHandlerAbi, providerBase);
    } else {
        throw new error(`Invalid network: ${network}`);
    }

    return ucHandler;
}

module.exports = { getIbcApp, getDispatcherAddress, getDispatcher, getUcHandlerAddress, getUcHandler };