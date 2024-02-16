//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import './base/CustomChanIbcApp.sol';

contract Xcounter is CustomChanIbcApp {

    uint64 public counter;
    mapping (uint64 => address) public counterMap;


    constructor(IbcDispatcher _dispatcher) CustomChanIbcApp(_dispatcher) {}

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

        dispatcher.sendPacket(channelId, payload, timeoutTimestamp);
    }

    function onRecvPacket(IbcPacket memory packet) external override onlyIbcDispatcher returns (AckPacket memory ackPacket) {
        recvedPackets.push(packet);
        address _caller = abi.decode(packet.data, (address));
        counterMap[packet.sequence] = _caller;

        increment();

        return AckPacket(true, abi.encode(counter));
    }

    function onAcknowledgementPacket(IbcPacket calldata, AckPacket calldata ack) external override onlyIbcDispatcher {
        ackPackets.push(ack);
        
        (uint64 _counter) = abi.decode(ack.data, (uint64));
        
       if (_counter != counter) {
        resetCounter();
       }
    }

    function onTimeoutPacket(IbcPacket calldata packet) external override onlyIbcDispatcher {
        timeoutPackets.push(packet);
        // do logic
    }
}
