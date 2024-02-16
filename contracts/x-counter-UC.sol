//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import './base/UniversalChanIbcContract.sol';

contract XcounterUC is UniversalChanIbcApp {
    uint64 public counter;
    mapping (uint64 => address) public counterMap;


    constructor(address _middleware) UniversalChanIbcApp(_middleware) {}

    function resetCounter() internal {
        counter = 0;
    }

    function increment() internal {
        counter++;
    }

    /**
     * @dev Sends a packet with a greeting message over a specified channel.
     * @param channelId The ID of the channel to send the packet to.
     * @param timeoutSeconds The timeout in seconds (relative).
     */

    function sendCounterUpdate( bytes32 channelId, uint64 timeoutSeconds) external {
        increment();
        bytes memory payload = abi.encode(msg.sender);

        uint64 timeoutTimestamp = uint64((block.timestamp + timeoutSeconds) * 1000000000);

        IbcUniversalPacketSender(mw).sendUniversalPacket(
            channelId,
            IbcUtils.toBytes32(address(this)),
            payload,
            timeoutTimestamp
        );
    }

    function onRecvUniversalPacket(
        bytes32 channelId,
        UniversalPacket calldata packet
    ) external override onlyIbcMw returns (AckPacket memory ackPacket) {
        recvedPackets.push(UcPacketWithChannel(channelId, packet));
        IbcPacket memory ibcPacket = abi.decode(packet.appData, (IbcPacket));
        address _caller = abi.decode(ibcPacket.data, (address));
        counterMap[ibcPacket.sequence] = _caller;

        increment();

        return AckPacket(true, abi.encode(counter));
    }

    function onUniversalAcknowledgement(
            bytes32 channelId,
            UniversalPacket memory packet,
            AckPacket calldata ack
    ) external override onlyIbcMw {
        // verify packet's destPortAddr is the ack's first encoded address. assumes the packet's destPortAddr is the address of the contract that sent the packet
        // check onRecvUniversalPacket for the encoded ackpacket data
        require(ack.data.length >= 20, 'ack data too short');
        address ackSender = address(bytes20(ack.data[0:20]));
        require(IbcUtils.toAddress(packet.destPortAddr) == ackSender, 'ack address mismatch');
        ackPackets.push(UcAckWithChannel(channelId, packet, ack));

        bytes memory usefulAckData = ack.data[20:];
        
        (uint64 _counter) = abi.decode(usefulAckData, (uint64));
        
       if (_counter != counter) {
        resetCounter();
       }
    }

    function onTimeoutUniversalPacket(
        bytes32 channelId, 
        UniversalPacket calldata packet
    ) external override onlyIbcMw {
        timeoutPackets.push(UcPacketWithChannel(channelId, packet));
        // do logic
    }
}
