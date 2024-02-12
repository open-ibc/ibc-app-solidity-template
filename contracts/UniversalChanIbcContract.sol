//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import '../lib/vibc-core-smart-contracts/contracts/Ibc.sol';
import '../lib/vibc-core-smart-contracts/contracts/IbcReceiver.sol';
import '../lib/vibc-core-smart-contracts/contracts/IbcDispatcher.sol';
import '../lib/vibc-core-smart-contracts/contracts/IbcMiddleware.sol';

contract UniversalChanIbcContract is IbcMwUser, IbcUniversalPacketReceiver {
    struct UcPacketWithChannel {
        bytes32 channelId;
        UniversalPacket packet;
    }

    struct UcAckWithChannel {
        bytes32 channelId;
        UniversalPacket packet;
        AckPacket ack;
    }

    // received packet as chain B
    UcPacketWithChannel[] public recvedPackets;
    // received ack packet as chain A
    UcAckWithChannel[] public ackPackets;
    // received timeout packet as chain A
    UcPacketWithChannel[] public timeoutPackets;

    constructor(address _middleware) IbcMwUser(_middleware) {}

    function updateMiddleware(address _middleware) external onlyOwner {
        mw = _middleware;
    }

    function sendGreet(address destPortAddr, bytes32 channelId, bytes calldata message, uint64 timeoutTimestamp) external {
        IbcUniversalPacketSender(mw).sendUniversalPacket(
            channelId,
            Ibc.toBytes32(destPortAddr),
            message,
            timeoutTimestamp
        );
    }

    function onRecvUniversalPacket(
        bytes32 channelId,
        UniversalPacket calldata packet
    ) external onlyIbcMw returns (AckPacket memory ackPacket) {
        recvedPackets.push(UcPacketWithChannel(channelId, packet));
        // do logic
        // below is an example, the actual ackpacket data should be implemented by the contract developer
        return AckPacket(true, abi.encodePacked(address(this), Ibc.toAddress(packet.srcPortAddr), 'ack-', packet.appData));
    }

    function onUniversalAcknowledgement(
        bytes32 channelId,
        UniversalPacket memory packet,
        AckPacket calldata ack
    ) external onlyIbcMw {
        // verify packet's destPortAddr is the ack's first encoded address. assumes the packet's destPortAddr is the address of the contract that sent the packet
        // check onRecvUniversalPacket for the encoded ackpacket data
        require(ack.data.length >= 20, 'ack data too short');
        address ackSender = address(bytes20(ack.data[0:20]));
        require(Ibc.toAddress(packet.destPortAddr) == ackSender, 'ack address mismatch');
        ackPackets.push(UcAckWithChannel(channelId, packet, ack));
        // do logic
    }

    function onTimeoutUniversalPacket(bytes32 channelId, UniversalPacket calldata packet) external onlyIbcMw {
        timeoutPackets.push(UcPacketWithChannel(channelId, packet));
        // do logic
    }
}
