// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/libs/Ibc.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/core/Dispatcher.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/ProofVerifier.sol";
import {UniversalChannelHandler} from "@open-ibc/vibc-core-smart-contracts/contracts/core/UniversalChannelHandler.sol";
import {Mars} from "@open-ibc/vibc-core-smart-contracts/contracts/examples/Mars.sol";
import {Earth} from "@open-ibc/vibc-core-smart-contracts/contracts/examples/Earth.sol";
import {IbcMiddleware} from "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcMiddleware.sol";
import {GeneralMiddleware} from "@open-ibc/vibc-core-smart-contracts/contracts/base/GeneralMiddleware.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/utils/DummyConsensusStateManager.sol";

struct ChannelSetting {
    ChannelOrder ordering;
    string version;
    string portId;
    bytes32 channelId;
    bool feeEnabled;
    Ics23Proof proof;
}

struct VirtualChainData {
    Dispatcher dispatcher;
    UniversalChannelHandler ucHandler;
    Mars mars;
    Earth earth;
    GeneralMiddleware mw1;
    GeneralMiddleware mw2;
    string[] connectionHops;
}

// A test contract that keeps two types of dApps, 1. regular IBC-enabled dApp, 2. universal channel dApp
contract VirtualChain is Test, IbcEventsEmitter {
    Dispatcher public dispatcher;
    UniversalChannelHandler public ucHandler;
    GeneralMiddleware public mw1;
    GeneralMiddleware public mw2;

    Mars public mars;
    Earth public earth;
    mapping(address => mapping(address => bytes32)) public channelIds;
    mapping(address => mapping(bytes32 => Channel)) public channels;
    mapping(address => string) public portIds;

    string[] public connectionHops;
    uint256 _seed;

    // seed is used to generate unique channelIds and connectionIds;
    // it should be unique for each VirtualChain instance
    // Ports are initialized with a prefix, e.g. "polyibc.eth1.", which are only used for counterparty chains
    // ChannelIds are not initialized until channel handshake is started
    constructor(uint256 seed, string memory portPrefix) {
        _seed = seed;
        dispatcher = new Dispatcher(portPrefix, new DummyConsensusStateManager());
        ucHandler = new UniversalChannelHandler(dispatcher);

        mars = new Mars(dispatcher);
        earth = new Earth(address(ucHandler));
        // initialize portIds for counterparty chains
        address[3] memory portContracts = [address(ucHandler), address(mars), address(earth)];
        for (uint256 i = 0; i < portContracts.length; i++) {
            portIds[portContracts[i]] = string(abi.encodePacked(portPrefix, toHexStr(portContracts[i])));
        }
        connectionHops = new string[](2);
        connectionHops[0] = newConnectionId();
        connectionHops[1] = newConnectionId();

        mw1 = new GeneralMiddleware(1 << 1, address(ucHandler));
        mw2 = new GeneralMiddleware(1 << 2, address(ucHandler));
    }

    // return virtualChainData
    function getVirtualChainData() external view returns (VirtualChainData memory) {
        return VirtualChainData(dispatcher, ucHandler, mars, earth, mw1, mw2, connectionHops);
    }

    // expectedChannel returns a Channel struct with expected values
    // this is used to verify on its counterpart chain
    function expectedChannel(
        address localAddr,
        bytes32 localChanId,
        string[] memory counterpartyConnectionHops,
        ChannelSetting memory setting
    ) public view returns (Channel memory) {
        return Channel(
            setting.version,
            setting.ordering,
            setting.feeEnabled,
            counterpartyConnectionHops,
            portIds[localAddr],
            localChanId
        );
    }

    function getConnectionHops() external view returns (string[] memory) {
        return connectionHops;
    }

    // Assign new channelIds to both ends of the channel
    function assignChannelIds(IbcChannelReceiver localEnd, IbcChannelReceiver remoteEnd, VirtualChain remoteChain)
        external
    {
        bytes32 localChannelId = this.newChannelId();
        bytes32 remoteChannelId = remoteChain.newChannelId();
        // save channelIds on each virtual chain
        this.setChannelId(localEnd, remoteEnd, localChannelId);
        remoteChain.setChannelId(remoteEnd, localEnd, remoteChannelId);
    }

    // finishHandshake is a helper function to finish the 4-step handshake
    // @arg localEnd: the local end of the channel on this virtual chain
    // @arg remoteChain: the remote virtual chain
    // @arg remoteEnd: the remote end of the channel on the other virtual chain
    // @arg setting: the channel handshake setting
    // @dev: Successfully created channelIds and channels will be set on both virtual chains's channelIds and channels
    function finishHandshake(
        IbcChannelReceiver localEnd,
        VirtualChain remoteChain,
        IbcChannelReceiver remoteEnd,
        ChannelSetting memory setting
    ) external {
        this.assignChannelIds(localEnd, remoteEnd, remoteChain);

        // localEnd initiates the first step in 4-step handshake
        vm.prank(address(this));
        this.channelOpenInit(localEnd, remoteChain, remoteEnd, setting, true); // step-1

        vm.prank(address(remoteChain));
        remoteChain.channelOpenTry(remoteEnd, this, localEnd, setting, true); // step-2

        vm.prank(address(this));
        this.channelOpenAckOrConfirm(localEnd, remoteChain, remoteEnd, setting, false, true); // step-3

        vm.prank(address(remoteChain));
        remoteChain.channelOpenAckOrConfirm(remoteEnd, this, localEnd, setting, true, true); // step-4
    }

    function channelOpenInit(
        IbcChannelReceiver localEnd,
        VirtualChain remoteChain,
        IbcChannelReceiver remoteEnd,
        ChannelSetting memory setting,
        bool expPass
    ) external {
        string memory cpPortId = remoteChain.portIds(address(remoteEnd));
        require(bytes(cpPortId).length > 0, "channelOpenTry: portId does not exist");

        // set dispatcher's msg.sender to this function's msg.sender
        vm.prank(msg.sender);

        if (expPass) {
            vm.expectEmit(true, true, true, true);
            emit OpenIbcChannel(
                address(localEnd),
                setting.version,
                setting.ordering,
                setting.feeEnabled,
                connectionHops,
                remoteChain.portIds(address(remoteEnd)),
                bytes32(0)
            );
        }
        dispatcher.openIbcChannel(
            localEnd,
            CounterParty(setting.portId, setting.channelId, setting.version),
            setting.ordering,
            setting.feeEnabled,
            connectionHops,
            // counterparty channelId and version are not known at this point
            CounterParty(cpPortId, bytes32(0), ""),
            setting.proof
        );
    }

    function channelOpenTry(
        IbcChannelReceiver localEnd,
        VirtualChain remoteChain,
        IbcChannelReceiver remoteEnd,
        ChannelSetting memory setting,
        bool expPass
    ) external {
        bytes32 cpChanId = remoteChain.channelIds(address(remoteEnd), address(localEnd));
        require(cpChanId != bytes32(0), "channelOpenTry: channel does not exist");

        string memory cpPortId = remoteChain.portIds(address(remoteEnd));
        require(bytes(cpPortId).length > 0, "channelOpenTry: portId does not exist");

        // set dispatcher's msg.sender to this function's msg.sender
        vm.prank(msg.sender);

        if (expPass) {
            vm.expectEmit(true, true, true, true);
            emit OpenIbcChannel(
                address(localEnd),
                setting.version,
                setting.ordering,
                setting.feeEnabled,
                connectionHops,
                cpPortId,
                cpChanId
            );
        }
        dispatcher.openIbcChannel(
            localEnd,
            CounterParty(setting.portId, setting.channelId, setting.version),
            setting.ordering,
            setting.feeEnabled,
            connectionHops,
            CounterParty(cpPortId, cpChanId, setting.version),
            setting.proof
        );
    }

    function channelOpenAckOrConfirm(
        IbcChannelReceiver localEnd,
        VirtualChain remoteChain,
        IbcChannelReceiver remoteEnd,
        ChannelSetting memory setting,
        bool isChanConfirm,
        bool expPass
    ) external {
        // local channel Id must be known
        bytes32 chanId = channelIds[address(localEnd)][address(remoteEnd)];
        require(chanId != bytes32(0), "channelOpenAckOrConfirm: channel does not exist");

        bytes32 cpChanId = remoteChain.channelIds(address(remoteEnd), address(localEnd));
        require(cpChanId != bytes32(0), "channelOpenAckOrConfirm: channel does not exist");

        string memory cpPortId = remoteChain.portIds(address(remoteEnd));
        require(bytes(cpPortId).length > 0, "channelOpenAckOrConfirm: counterparty portId does not exist");

        // set dispatcher's msg.sender to this function's msg.sender
        vm.prank(msg.sender);

        if (expPass) {
            vm.expectEmit(true, true, true, true);
            emit ConnectIbcChannel(address(localEnd), chanId);
        }
        dispatcher.connectIbcChannel(
            localEnd,
            CounterParty(setting.portId, chanId, setting.version),
            connectionHops,
            setting.ordering,
            setting.feeEnabled,
            isChanConfirm,
            CounterParty(cpPortId, cpChanId, setting.version),
            setting.proof
        );
    }

    // Converts a local dApp address on this virtual chain to a Counterparty struct for a remote chain
    function localEndToCounterparty(address localEnd) external view returns (CounterParty memory) {
        return CounterParty(portIds[localEnd], channelIds[localEnd][address(this)], "");
    }

    function setChannelId(IbcChannelReceiver localEnd, IbcChannelReceiver remoteEnd, bytes32 channelId) external {
        channelIds[address(localEnd)][address(remoteEnd)] = channelId;
    }

    function newChannelId() external returns (bytes32) {
        bytes memory channelId = abi.encodePacked("channel-", Strings.toString(_seed));
        _seed += 1;
        return bytes32(channelId);
    }

    function newConnectionId() internal returns (string memory) {
        string memory connectionId = string(abi.encodePacked("connection-", Strings.toString(_seed)));
        _seed += 1;
        return connectionId;
    }

    // convert an address to its hex string, but without 0x prefix
    function toHexStr(address addr) internal pure returns (bytes memory) {
        bytes memory addrWithPrefix = abi.encodePacked(Strings.toHexString(addr));
        bytes memory addrWithoutPrefix = new bytes(addrWithPrefix.length - 2);
        for (uint256 i = 0; i < addrWithoutPrefix.length; i++) {
            addrWithoutPrefix[i] = addrWithPrefix[i + 2];
        }
        return addrWithoutPrefix;
    }
}
