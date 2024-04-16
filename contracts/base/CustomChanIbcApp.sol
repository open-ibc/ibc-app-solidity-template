//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "@open-ibc/vibc-core-smart-contracts/contracts/libs/Ibc.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcReceiver.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcDispatcher.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/ProofVerifier.sol";

// CustomChanIbcApp is a contract that can be used as a base contract
// for IBC-enabled contracts that send packets over a custom IBC channel.
contract CustomChanIbcApp is IbcReceiverBase, IbcReceiver {
    // received packet as chain B
    IbcPacket[] public recvedPackets;
    // received ack packet as chain A
    AckPacket[] public ackPackets;
    // received timeout packet as chain A
    IbcPacket[] public timeoutPackets;
    string public constant VERSION = "1.0";

    struct ChannelMapping {
        bytes32 channelId;
        bytes32 cpChannelId;
    }

    // ChannelMapping array with the channel IDs of the connected channels
    bytes32[] public connectedChannels;

    // add supported versions (format to be negotiated between apps)
    string[] supportedVersions = ["1.0"];

    constructor(IbcDispatcher _dispatcher) IbcReceiverBase(_dispatcher) {}

    function updateDispatcher(IbcDispatcher _dispatcher) external onlyOwner {
        dispatcher = _dispatcher;
    }

    function getConnectedChannels() external view returns (bytes32[] memory) {
        return connectedChannels;
    }

    function updateSupportedVersions(string[] memory _supportedVersions) external onlyOwner {
        supportedVersions = _supportedVersions;
    }

    /**
     * @dev Implement a function to send a packet that calls the dispatcher.sendPacket function
     *      It has the following function handle:
     *          function sendPacket(bytes32 channelId, bytes calldata payload, uint64 timeoutTimestamp) external;
     */

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and returns and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     *
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
        return AckPacket(true, abi.encodePacked('{ "account": "account", "reply": "got the message" }'));
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
     *
     * @param packet the IBC packet encoded by the counterparty and relayed by the relayer
     */
    function onTimeoutPacket(IbcPacket calldata packet) external virtual onlyIbcDispatcher {
        timeoutPackets.push(packet);
        // do logic
    }

    /**
     * @dev Create a custom channel between two IbcReceiver contracts
     * @param version a ChannelEnd struct with the local chain's portId and version (channelId can be empty)
     * @param ordering the channel ordering (NONE, UNORDERED, ORDERED) equivalent to (0, 1, 2)
     * @param feeEnabled in production, you'll want to enable this to avoid spamming create channel calls (costly for relayers)
     * @param connectionHops 2 connection hops to connect to the destination via Polymer
     * @param counterparty the address of the destination chain contract you want to connect to
     */
    function createChannel(
        string calldata version,
        uint8 ordering,
        bool feeEnabled,
        string[] calldata connectionHops,
        string calldata counterparty
    ) external virtual onlyOwner {
        dispatcher.channelOpenInit(version, ChannelOrder(ordering), feeEnabled, connectionHops, counterparty);
    }

    /**
     * This func triggers channel closure from the dApp.
     * Func args can be arbitary, as long as dispatcher.closeIbcChannel is invoked propperly.
     */
    function triggerChannelClose(bytes32 channelId) external virtual onlyOwner {
        dispatcher.closeIbcChannel(channelId);
    }

    /*
    IbcChannelReceiver Interface Functions
    */

    // function onChanOpenInit(string calldata version) external returns (string memory selectedVersion) {
    //     return _openChannel(version);
    // }

    function onChanOpenInit(
        ChannelOrder order,
        string[] calldata connectionHops,
        string calldata counterpartyPortIdentifier,
        string calldata version
    ) external returns (string memory selectedVersion) {
        return _openChannel(version);
    }

    function onChanOpenTry(
        ChannelOrder order,
        string[] memory connectionHops,
        bytes32 channelId,
        string memory counterpartyPortIdentifier,
        bytes32 counterpartychannelId,
        string calldata counterpartyVersion
    ) external returns (string memory selectedVersion) {
        _connectChannel(channelId, counterpartyVersion);
        return _openChannel(counterpartyVersion);
    }

    function onChanOpenAck(bytes32 channelId, bytes32, string calldata counterpartyVersion)
        external
        virtual
        onlyIbcDispatcher
    {
        _connectChannel(channelId);
    }

    function onChanOpenConfirm(bytes32 channelId) external {
        _connectChannel(channelId);
    }

    function onCloseIbcChannel(
        bytes32 channelId,
        string calldata counterpartyPortIdentifier,
        bytes32 counterpartyChannelId
    ) external override {
        _closeChannel(channelId);
    }

    function _connectChannel(bytes32 channelId, string calldata counterpartyVersion) private {
        if (keccak256(abi.encodePacked(counterpartyVersion)) != keccak256(abi.encodePacked(VERSION))) {
            revert UnsupportedVersion();
        }
        connectedChannels.push(channelId);
    }

    function _connectChannel(bytes32 channelId) private {
        connectedChannels.push(channelId);
    }

    function _openChannel(string calldata version) private view returns (string memory selectedVersion) {
        if (keccak256(abi.encodePacked(version)) != keccak256(abi.encodePacked(VERSION))) {
            revert UnsupportedVersion();
        }
        return VERSION;
    }

    function _closeChannel(bytes32 channelId) private {
        bool channelFound = false;
        for (uint256 i = 0; i < connectedChannels.length; i++) {
            if (connectedChannels[i] == channelId) {
                for (uint256 j = i; j < connectedChannels.length - 1; j++) {
                    connectedChannels[j] = connectedChannels[j + 1];
                }
                connectedChannels.pop();
                channelFound = true;
                break;
            }
        }
        require(channelFound, "Channel not found");
    }
}
