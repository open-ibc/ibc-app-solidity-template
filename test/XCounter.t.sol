// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "forge-std/Test.sol";
import "../contracts/XCounter.sol";
import "../contracts/base/CustomChanIbcApp.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcDispatcher.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/core/Dispatcher.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/libs/Ibc.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcReceiver.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/utils/DummyConsensusStateManager.sol";
import "@open-ibc/vibc-core-smart-contracts/test/VirtualChain.sol";
import "@open-ibc/vibc-core-smart-contracts/test/Dispatcher.base.t.sol";

contract XCounterTest is Test {
    XCounter xCounter;
    IbcDispatcher dispatcher;
    IbcEndpoint srcEndpoint;
    IbcEndpoint dstEndpoint;
    IbcChannelReceiver receiver;
    // bytes32 channelId;
    string versionCall;
    string versionExpected;
    string portId = "eth1.7E5F4552091A69125d5DfCb7b8C2659029395Bdf";
    LocalEnd _local;
    CounterParty local;
    CounterParty remote;
    DummyConsensusStateManager dummyConsStateManager;
    // Dispatcher dispatcher;
    string[] connectionHops = ["connection-1", "connection-2"];

    function setUp() public {
        dispatcher = Dispatcher(address(0x6C9427E8d770Ad9e5a493D201280Cc178125CEc0));
        xCounter = new XCounter(dispatcher);
        srcEndpoint = IbcEndpoint(
            "polyibc.optimism-sim.7B141148DEA09237f4F9cB496B90b3FaC6eB6807", IbcUtils.toBytes32("channel-69")
        );
        dstEndpoint =
            IbcEndpoint("polyibc.base-sim.71C99A57e10d6ca7604548b04962477f97b34F95", IbcUtils.toBytes32("channel-70"));
    }

    function testInitialCounter() public {
        // Test that the initial counter is 0
        assertEq(xCounter.counter(), 0, "Initial counter value should be 0");
        assertEq(xCounter.counterMap(0), address(0), "Initial counterMap value should be 0");
    }

    function testCreateChannels() public {
        // Set up the CounterParty and Ics23Proof structs
        local = CounterParty({
            portId: "polyibc.optimism-sim.7B141148DEA09237f4F9cB496B90b3FaC6eB6807",
            channelId: "channel-1", // ChannelId can be empty
            version: "1.0"
        });

        remote = CounterParty({
            portId: "polyibc.base-sim.71C99A57e10d6ca7604548b04962477f97b34F95",
            channelId: "channel-2", // ChannelId can be empty
            version: "1.0"
        });

        OpIcs23Proof[] memory proofs = new OpIcs23Proof[](1);

        Ics23Proof memory proof = Ics23Proof(proofs, 0);

        // Assume yourContract has an onlyOwner modifier, ensure msg.sender is the owner
        // If using Foundry, you can use `vm.startPrank(ownerAddress)` and `vm.stopPrank()`

        // Call the createChannel function
        xCounter.createChannel(local, 1, true, connectionHops, remote, proof);

        // Add your assertions here
        // For example, you could emit an event in the mockDispatcher and use `expectEmit` to verify it was called
    }

    function testCreateChannel() public {
        bytes32 channelId = keccak256("channel-69");
        uint64 timeoutSeconds = 3600;

        OpIcs23Proof[] memory proofs = new OpIcs23Proof[](1);
        // xCounter.createChannel(local, ordering, feeEnabled, connectionHops, counterparty, proof);
        xCounter.createChannel(local, 0, false, connectionHops, remote, Ics23Proof(proofs, 0));
    }

    function testSendPacketIncrementsCounter() public {
        bytes32 channelId = keccak256("channel-69");
        uint64 timeoutSeconds = 3600;

        // xCounter.createChannel(local, ordering, feeEnabled, connectionHops, counterparty, proof);
        xCounter.sendPacket(channelId, timeoutSeconds);

        // Verify counter is incremented
        assertEq(xCounter.counter(), 1, "Counter should be incremented after sending a packet");
    }

    function testOnRecvPacketIncrementsCounter() public {
        // Prepare packet data
        bytes memory packetData = abi.encode(address(0x1));
        IbcPacket memory packet = IbcPacket(srcEndpoint, dstEndpoint, 1, packetData, Height(1, 1), 1000000);

        // Simulate receiving a packet
        AckPacket memory ack = xCounter.onRecvPacket(packet);

        // Verify counter is incremented
        assertEq(xCounter.counter(), 1, "Counter should be incremented after receiving a packet");

        // Verify ack packet is successful and contains the updated counter
        assertTrue(ack.success, "Acknowledgement should be successful");
        (uint64 updatedCounter) = abi.decode(ack.data, (uint64));
        assertEq(updatedCounter, 1, "Acknowledgement data should contain the updated counter");
    }

    function testOnAcknowledgementPacketResetsCounterOnError() public {
        // Increment the counter to simulate activity
        bytes32 channelId = keccak256("testChannel");
        uint64 timeoutSeconds = 3600;
        xCounter.sendPacket(channelId, timeoutSeconds);
        xCounter.sendPacket(channelId, timeoutSeconds);

        // Simulate receiving an ack with different counter value
        AckPacket memory ack = AckPacket(true, abi.encode(uint64(5)));
        IbcPacket memory packet;
        xCounter.onAcknowledgementPacket(packet, ack);

        // Verify counter is reset
        assertEq(xCounter.counter(), 0, "Counter should be reset if ack counter does not match");
    }

    // Additional tests for `onTimeoutPacket`, `resetCounter`, etc.
    // can be implemented similarly, focusing on specific scenarios and behaviors.

    // Ensure to test edge cases like multiple packets being sent, timeout handling,
    // and invalid inputs where applicable.
}
