//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import '../vibc-core/contracts/Ibc.sol';
import '../vibc-core/contracts/IbcReceiver.sol';
import '../vibc-core/contracts/IbcDispatcher.sol';

contract CustomChanIbcContract is IbcReceiverBase, IbcReceiver {
    // received packet as chain B
    IbcPacket[] public recvedPackets;
    // received ack packet as chain A
    AckPacket[] public ackPackets;
    // received timeout packet as chain A
    IbcPacket[] public timeoutPackets;
    
    // bytes array with the channel IDs of the connected channels
    bytes32[] public connectedChannels;

    // add supported versions (format to be negotiated between apps)
    string[] supportedVersions = ['1.0'];

    constructor(IbcDispatcher _dispatcher) IbcReceiverBase(_dispatcher) {}

    function updateDispatcher(IbcDispatcher _dispatcher) external onlyOwner {
        dispatcher = _dispatcher;
    }

    function onRecvPacket(IbcPacket memory packet) external onlyIbcDispatcher returns (AckPacket memory ackPacket) {
        recvedPackets.push(packet);
        // do logic
        return AckPacket(true, abi.encodePacked('{ "account": "account", "reply": "got the message" }'));
    }

    function onAcknowledgementPacket(IbcPacket calldata packet, AckPacket calldata ack) external onlyIbcDispatcher {
        ackPackets.push(ack);
        // do logic
    }

    function onTimeoutPacket(IbcPacket calldata packet) external onlyIbcDispatcher {
        timeoutPackets.push(packet);
        // do logic
    }

    function onOpenIbcChannel(
        string calldata version,
        ChannelOrder ordering,
        bool feeEnabled,
        string[] calldata connectionHops,
        string calldata counterpartyPortId,
        bytes32 counterpartyChannelId,
        string calldata counterpartyVersion
    ) external onlyIbcDispatcher returns (string memory selectedVersion) {
        if (bytes(counterpartyPortId).length <= 8) {
            revert invalidCounterPartyPortId();
        }
        /**
         * Version selection is determined by if the callback is invoked on behalf of ChanOpenInit or ChanOpenTry.
         * ChanOpenInit: self version should be provided whereas the counterparty version is empty.
         * ChanOpenTry: counterparty version should be provided whereas the self version is empty.
         * In both cases, the selected version should be in the supported versions list.
         */
        bool foundVersion = false;
        selectedVersion = keccak256(abi.encodePacked(version)) == keccak256(abi.encodePacked(''))
            ? counterpartyVersion
            : version;
        for (uint256 i = 0; i < supportedVersions.length; i++) {
            if (keccak256(abi.encodePacked(selectedVersion)) == keccak256(abi.encodePacked(supportedVersions[i]))) {
                foundVersion = true;
                break;
            }
        }
        require(foundVersion, 'Unsupported version');
        // if counterpartyVersion is not empty, then it must be the same foundVersion
        if (keccak256(abi.encodePacked(counterpartyVersion)) != keccak256(abi.encodePacked(''))) {
            require(
                keccak256(abi.encodePacked(counterpartyVersion)) == keccak256(abi.encodePacked(selectedVersion)),
                'Version mismatch'
            );
        }

        // do logic

        return selectedVersion;
    }

    function onConnectIbcChannel(
        bytes32 channelId,
        bytes32 counterpartyChannelId,
        string calldata counterpartyVersion
    ) external onlyIbcDispatcher {
        // ensure negotiated version is supported
        bool foundVersion = false;
        for (uint256 i = 0; i < supportedVersions.length; i++) {
            if (keccak256(abi.encodePacked(counterpartyVersion)) == keccak256(abi.encodePacked(supportedVersions[i]))) {
                foundVersion = true;
                break;
            }
        }
        require(foundVersion, 'Unsupported version');

        // do logic

        connectedChannels.push(channelId);
    }

    function onCloseIbcChannel(
        bytes32 channelId,
        string calldata counterpartyPortId,
        bytes32 counterpartyChannelId
    ) external onlyIbcDispatcher {
        // logic to determin if the channel should be closed
        bool channelFound = false;
        for (uint256 i = 0; i < connectedChannels.length; i++) {
            if (connectedChannels[i] == channelId) {
                delete connectedChannels[i];
                channelFound = true;
                break;
            }
        }
        require(channelFound, 'Channel not found');

        // do logic
    }

    /**
     * This func triggers channel closure from the dApp.
     * Func args can be arbitary, as long as dispatcher.closeIbcChannel is invoked propperly.
     */
    function triggerChannelClose(bytes32 channelId) external onlyOwner {
        dispatcher.closeIbcChannel(channelId);
    }

    /**
     * @dev Sends a packet with a greeting message over a specified channel.
     * @param message The greeting message to be sent.
     * @param channelId The ID of the channel to send the packet to.
     * @param timeoutTimestamp The timestamp at which the packet will expire if not received.
     */

    function sendGreet(string calldata message, bytes32 channelId, uint64 timeoutTimestamp) external {
        dispatcher.sendPacket(channelId, bytes(message), timeoutTimestamp);
    }
}
