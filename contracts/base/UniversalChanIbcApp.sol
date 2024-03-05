//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import '@open-ibc/vibc-core-smart-contracts/contracts/libs/Ibc.sol';
import '@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcReceiver.sol';
import '@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcDispatcher.sol';
import '@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcMiddleware.sol';

// UniversalChanIbcApp is a contract that can be used as a base contract 
// for IBC-enabled contracts that send packets over the universal channel.
contract UniversalChanIbcApp is IbcMwUser, IbcUniversalPacketReceiver {
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

    /** 
     * @dev Implement a function to send a packet that calls the IbcUniversalPacketSender(mw).sendUniversalPacket function
     *      It has the following function handle:
     *          function sendUniversalPacket(
                    bytes32 channelId,
                    bytes32 destPortAddr,
                    bytes calldata appData,
                    uint64 timeoutTimestamp
                ) external;
     */

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and returns and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     * 
     * @param channelId the ID of the channel (locally) the packet was received on.
     * @param packet the Universal packet encoded by the source and relayed by the relayer.
     */
    function onRecvUniversalPacket(
        bytes32 channelId,
        UniversalPacket calldata packet
    ) external virtual onlyIbcMw returns (AckPacket memory ackPacket) {
        recvedPackets.push(UcPacketWithChannel(channelId, packet));
        // do logic
        // below is an example, the actual ackpacket data should be implemented by the contract developer
        return AckPacket(true, abi.encodePacked(address(this), IbcUtils.toAddress(packet.srcPortAddr), 'ack-', packet.appData));
    }

    /**
     * @dev Packet lifecycle callback that implements packet acknowledgment logic.
     *      MUST be overriden by the inheriting contract.
     * 
     * @param channelId the ID of the channel (locally) the ack was received on.
     * @param packet the Universal packet encoded by the source and relayed by the relayer.
     * @param ack the acknowledgment packet encoded by the destination and relayed by the relayer.
     */
    function onUniversalAcknowledgement(
        bytes32 channelId,
        UniversalPacket memory packet,
        AckPacket calldata ack
    ) external virtual onlyIbcMw {
        // verify packet's destPortAddr is the ack's first encoded address. assumes the packet's destPortAddr is the address of the contract that sent the packet
        // check onRecvUniversalPacket for the encoded ackpacket data
        require(ack.data.length >= 20, 'ack data too short');
        address ackSender = address(bytes20(ack.data[0:20]));
        require(IbcUtils.toAddress(packet.destPortAddr) == ackSender, 'ack address mismatch');
        ackPackets.push(UcAckWithChannel(channelId, packet, ack));
        // do logic
    }

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and return and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     *      NOT SUPPORTED YET
     * 
     * @param channelId the ID of the channel (locally) the timeout was submitted on.
     * @param packet the Universal packet encoded by the counterparty and relayed by the relayer
     */
    function onTimeoutUniversalPacket(bytes32 channelId, UniversalPacket calldata packet) external virtual onlyIbcMw {
        timeoutPackets.push(UcPacketWithChannel(channelId, packet));
        // do logic
    }
}
