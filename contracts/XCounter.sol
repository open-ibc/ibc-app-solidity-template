//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "./base/CustomChanIbcApp.sol";

contract XCounter is CustomChanIbcApp {
    // app specific state
    uint64 public counter;
    mapping(uint64 => address) public counterMap;

    constructor(IbcDispatcher _dispatcher) CustomChanIbcApp(_dispatcher) {}

    // app specific logic
    function resetCounter() internal {
        counter = 0;
    }

    function increment() internal {
        counter++;
    }

    // IBC logic

    /**
     * @dev Sends a packet with the caller address over a specified channel.
     * @param channelId The ID of the channel (locally) to send the packet to.
     * @param timeoutSeconds The timeout in seconds (relative).
     */
    function sendPacket(bytes32 channelId, uint64 timeoutSeconds) external {
        // incrementing counter on source chain
        increment();

        // encoding the caller address to update counterMap on destination chain
        bytes memory payload = abi.encode(msg.sender);

        // setting the timeout timestamp at 10h from now
        uint64 timeoutTimestamp = uint64((block.timestamp + timeoutSeconds) * 1000000000);

        // calling the Dispatcher to send the packet
        dispatcher.sendPacket(channelId, payload, timeoutTimestamp);
    }

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and returns and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     * @param packet the IBC packet encoded by the source and relayed by the relayer.
     */
    function onRecvPacket(IbcPacket memory packet)
        external
        override
        onlyIbcDispatcher
        returns (AckPacket memory ackPacket, bool skipAck)
    {
        recvedPackets.push(packet);
        // decoding the caller address from the packet data
        address _caller = abi.decode(packet.data, (address));
        // updating the counterMap with the caller address and incrementing the counter
        counterMap[packet.sequence] = _caller;
        increment();

        return (AckPacket(true, abi.encode(counter)), false);
    }

    /**
     * @dev Packet lifecycle callback that implements packet acknowledgment logic.
     *      MUST be overriden by the inheriting contract.
     * @param ack the acknowledgment packet encoded by the destination and relayed by the relayer.
     */
    function onAcknowledgementPacket(IbcPacket calldata, AckPacket calldata ack) external override onlyIbcDispatcher {
        ackPackets.push(ack);
        // decoding the counter from the acknowledgment packet
        (uint64 _counter) = abi.decode(ack.data, (uint64));
        // resetting the counter if the counter in the acknowledgment packet is different from the local counter
        if (_counter != counter) {
            resetCounter();
        }
    }

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and return and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     *      NOT SUPPORTED YET
     * @param packet the IBC packet encoded by the counterparty and relayed by the relayer
     */
    function onTimeoutPacket(IbcPacket calldata packet) external override onlyIbcDispatcher {
        timeoutPackets.push(packet);
        // do logic
    }
}
