//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import {
    IbcPacket,
    AckPacket,
    ChannelOrder,
    IBCErrors
} from "@open-ibc/vibc-core-smart-contracts/contracts/libs/Ibc.sol";
import {
    IbcReceiverBase,
    IbcReceiver,
    IbcChannelReceiver
} from "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcReceiver.sol";
import {IbcDispatcher} from "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcDispatcher.sol";
import {Ics23Proof} from "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/ProofVerifier.sol";

// CustomChanIbcApp is a contract that can be used as a base contract
// for IBC-enabled contracts that send packets over a custom IBC channel.
contract CustomChanIbcApp is IbcReceiverBase, IbcReceiver {
    struct ChannelMapping {
        bytes32 channelId;
        bytes32 cpChannelId;
    }

    // received packet as chain B
    IbcPacket[] public recvedPackets;
    // received ack packet as chain A
    AckPacket[] public ackPackets;
    // received timeout packet as chain A
    IbcPacket[] public timeoutPackets;

    // ChannelMapping array with the channel IDs of the connected channels
    ChannelMapping[] public connectedChannels;

    // add supported versions (format to be negotiated between apps)
    string[] public supportedVersions = ["1.0"];

    constructor(IbcDispatcher _dispatcher) IbcReceiverBase(_dispatcher) {}

    function updateDispatcher(IbcDispatcher _dispatcher) external onlyOwner {
        dispatcher = _dispatcher;
    }

    function updateSupportedVersions(string[] memory _supportedVersions) external onlyOwner {
        supportedVersions = _supportedVersions;
    }

    function getConnectedChannels() external view returns (ChannelMapping[] memory) {
        return connectedChannels;
    }

    /**
     * @dev Implement a function to send a packet that calls the dispatcher.sendPacket function
     *      It has the following function handle:
     *          function sendPacket(bytes32 channelId, bytes calldata payload, uint64 timeoutTimestamp) external;
     */

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and returns and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     * @param packet the IBC packet encoded by the source and relayed by the relayer.
     */
    function onRecvPacket(IbcPacket memory packet)
        external
        virtual
        onlyIbcDispatcher
        returns (AckPacket memory ackPacket)
    {
        recvedPackets.push(packet);
        // do logic

        // solhint-disable-next-line quotes
        return AckPacket(true, abi.encodePacked("{ 'account': 'account', 'reply': 'got the message' }"));
    }

    /**
     * @dev Packet lifecycle callback that implements packet acknowledgment logic.
     *      MUST be overriden by the inheriting contract.
     *
     * @param packet the IBC packet encoded by the source and relayed by the relayer.
     * @param ack the acknowledgment packet encoded by the destination and relayed by the relayer.
     */
    function onAcknowledgementPacket(IbcPacket calldata packet, AckPacket calldata ack)
        external
        virtual
        onlyIbcDispatcher
    {
        ackPackets.push(ack);
        // do logic
    }

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and return and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     *      NOT SUPPORTED YET
     * @param packet the IBC packet encoded by the counterparty and relayed by the relayer
     */
    function onTimeoutPacket(IbcPacket calldata packet) external virtual onlyIbcDispatcher {
        timeoutPackets.push(packet);
        // do logic
    }

    /**
     * @dev Create a custom channel between two IbcReceiver contracts
     * @param version a version string to negotiate between the two chains
     * @param ordering the channel ordering (NONE, UNORDERED, ORDERED) equivalent to (0, 1, 2)
     * @param feeEnabled in production, you'll want to enable this to avoid spamming create channel calls (costly for relayers)
     * @param connectionHops 2 connection hops to connect to the destination via Polymer
     * @param counterpartyPortId the portID of the destination chain contract you want to connect to
     */
    function createChannel(
        string calldata version,
        uint8 ordering,
        bool feeEnabled,
        string[] calldata connectionHops,
        string calldata counterpartyPortId
    ) external onlyOwner {
        dispatcher.channelOpenInit(version, ChannelOrder(ordering), feeEnabled, connectionHops, counterpartyPortId);
    }

    function onChanOpenInit(ChannelOrder, string[] calldata, string calldata, string calldata version)
        external
        view
        virtual
        onlyIbcDispatcher
        returns (string memory selectedVersion)
    {
        return _openChannel(version);
    }

    // solhint-disable-next-line ordering
    function onChanOpenTry(
        ChannelOrder,
        string[] memory,
        bytes32 channelId,
        string memory,
        bytes32 counterpartyChannelId,
        string calldata counterpartyVersion
    ) external virtual onlyIbcDispatcher returns (string memory selectedVersion) {
        return _connectChannel(channelId, counterpartyChannelId, counterpartyVersion);
    }

    function onChanOpenAck(bytes32 channelId, bytes32 counterpartyChannelId, string calldata counterpartyVersion)
        external
        virtual
        onlyIbcDispatcher
    {
        _connectChannel(channelId, counterpartyChannelId, counterpartyVersion);
    }

    function onChanOpenConfirm(bytes32 channelId) external virtual onlyIbcDispatcher {
        // do logic
    }

    function onCloseIbcChannel(bytes32 channelId, string calldata, bytes32) external virtual onlyIbcDispatcher {
        // logic to determin if the channel should be closed
        bool channelFound = false;
        for (uint256 i = 0; i < connectedChannels.length; i++) {
            if (connectedChannels[i].channelId == channelId) {
                delete connectedChannels[i];
                channelFound = true;
                break;
            }
        }
        if (!channelFound) revert ChannelNotFound();
    }

    function _connectChannel(bytes32 channelId, bytes32 counterpartyChannelId, string calldata counterpartyVersion)
        private
        returns (string memory version)
    {
        // ensure negotiated version is supported
        for (uint256 i = 0; i < supportedVersions.length; i++) {
            if (keccak256(abi.encodePacked(counterpartyVersion)) == keccak256(abi.encodePacked(supportedVersions[i]))) {
                ChannelMapping memory channelMapping =
                    ChannelMapping({channelId: channelId, cpChannelId: counterpartyChannelId});
                connectedChannels.push(channelMapping);

                return counterpartyVersion;
            }
        }
        revert UnsupportedVersion();
    }

    function _openChannel(string calldata version) private view returns (string memory selectedVersion) {
        for (uint256 i = 0; i < supportedVersions.length; i++) {
            if (keccak256(abi.encodePacked(version)) == keccak256(abi.encodePacked(supportedVersions[i]))) {
                return version;
            }
        }
        revert UnsupportedVersion();
    }

    /**
     * This func triggers channel closure from the dApp.
     * Func args can be arbitary, as long as dispatcher.closeIbcChannel is invoked propperly.
     */
    function triggerChannelClose(bytes32 channelId) external virtual onlyOwner {
        dispatcher.closeIbcChannel(channelId);
    }
}
