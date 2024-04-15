//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import { UniversalPacket, AckPacket, IbcUtils } from "@open-ibc/vibc-core-smart-contracts/contracts/libs/Ibc.sol";
import { IbcMwUser, IbcUniversalPacketReceiver, IbcUniversalPacketSender } from "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcMiddleware.sol";

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
        // 1. decode the packet.data
        // 2. do logic
        // 3. encode the ack packet (encoding format should be agreed between the two applications)
        // below is an example, the actual ackpacket data should be implemented by the contract developer
        return AckPacket(true, abi.encodePacked(address(this), IbcUtils.toAddress(packet.srcPortAddr), "ack-", packet.appData));
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
        ackPackets.push(UcAckWithChannel(channelId, packet, ack));
        // 1. decode the ack.data
        // 2. do logic
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
