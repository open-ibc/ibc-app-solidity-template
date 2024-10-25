//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IbcUtils} from "@open-ibc/vibc-core-smart-contracts/contracts/libs/IbcUtils.sol";
import "./base/CustomChanIbcApp.sol";

/**
 * @title PermissionedChannels
 * @dev PermissionedChannels builds on top of CustomChanIbcApp to limit channels that can be opened, and also provides modifiers that only permissioned contracts can be called.
 */
abstract contract PermissionedChannels is CustomChanIbcApp {
    mapping(string => bool) approvedAddresses;
    bytes32 channel;

    modifier onlyApprovedCounterParty(string calldata counterParty) {
        require(approvedAddresses[counterParty], "PermissionedChannels: Sender not approved");
        _;
    }

    modifier onlyValidChannel(bytes32 callingChannelId) {
        require(callingChannelId == channel, "PermissionedChannels: Invalid channel");
        _;
    }

    // We have to check the counterparty here since this is the first step that has been triggered on this chain
    function onChanOpenTry(
        ChannelOrder ordering,
        string[] memory connectionHops,
        bytes32 channelId,
        string calldata counterPartyPortId,
        bytes32 counterpartyChannelId,
        string calldata counterpartyVersion
    )
        external
        override
        onlyIbcDispatcher
        onlyApprovedCounterParty(counterPartyPortId)
        returns (string memory selectedVersion)
    {
        return _connectChannel(channelId, counterpartyChannelId, counterpartyVersion);
    }

    // We don't have to check for counterPartyPortId here since dispatcher would only call this method if we initiated the channel handshake from a previous transaction
    function onChanOpenAck(bytes32 channelId, bytes32 counterpartyChannelId, string calldata counterpartyVersion)
        external
        override
        onlyIbcDispatcher
    {
        _setChannel(channelId);
        _connectChannel(channelId, counterpartyChannelId, counterpartyVersion);
    }

    // We don't have to check for counterPartyPortId here since dispatcher would only call this method since it was already validated in channeOpenTry
    function onChanOpenConfirm(bytes32 channelId) external override onlyIbcDispatcher {
        _setChannel(channelId);
    }

    /**
     * @dev Approves a counterparty address to interact with the contract. This should be called after both XTransfer Contracts are deployed on each chain to approve the counterparty contract from both chains.
     * @param counterPartyPortPrefix The port prefix of the counterparty chain you are communicating with
     * @param counterParty The address of the counterparty contract to approve.
     * @notice Only approved counterparties can open a channel with this dapp.
     */
    function approveCounterParty(string memory counterPartyPortPrefix, address counterParty) external onlyOwner {
        approvedAddresses[IbcUtils.addressToPortId(counterPartyPortPrefix, counterParty)] = true;
    }

    function _setChannel(bytes32 channelId) internal {
        channel = channelId;
    }
}

contract XTransfer is PermissionedChannels, ERC20 {
    uint64 constant TIMEOUT = 1000;

    constructor(IbcDispatcher _dispatcher, string memory name, string memory symbol)
        CustomChanIbcApp(_dispatcher)
        ERC20(name, symbol)
    {}

    /**
     * @dev Deposits the caller's balance to the contract, which burns tokens so that they can be minted on a counterparty chain
     * @param balance The amount of tokens to move to the counterparty chain
     * @param gasLimits An array containing two gas limit values:
     *                  - gasLimits[0] for `recvPacket` fees
     *                  - gasLimits[1] for `ackPacket` fees.
     * @param gasPrices An array containing two gas price values:
     *                  - gasPrices[0] for `recvPacket` fees, for the dest chain
     *                  - gasPrices[1] for `ackPacket` fees, for the src chain
     */
    function deposit(uint256 balance, uint256[2] memory gasLimits, uint256[2] memory gasPrices) external payable {
        _burn(msg.sender, balance);
        bytes memory payload = abi.encode(msg.sender, balance);
        uint64 timeoutTimestamp = uint64((block.timestamp + TIMEOUT) * 1000000000);
        uint64 sequence = dispatcher.sendPacket(channel, payload, timeoutTimestamp);
        _depositSendPacketFee(dispatcher, channel, sequence, gasLimits, gasPrices);
    }

    /*
     * @notice mint tokens on the destination chain
     */
    function onRecvPacket(IbcPacket memory packet)
        external
        override
        onlyIbcDispatcher
        onlyValidChannel(packet.dest.channelId)
        returns (AckPacket memory ackPacket, bool skipAck)
    {
        // Mint the tokens on the destination chain, since this could only be triggered if tokens were burned on src chain.
        (address receiver, uint256 amountBurned) = abi.decode(packet.data, (address, uint256));
        _mint(receiver, amountBurned);

        // Return true in ack packet, since we don't really need an ack and are done with our flow now.
        return (AckPacket(true, abi.encode(receiver, amountBurned)), true);
    }

    /**
     * Once a packet has been acked, we remove the timeout to
     */
    function onAcknowledgementPacket(IbcPacket calldata, AckPacket calldata ack) external override onlyIbcDispatcher {}

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and return and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     *      NOT SUPPORTED YET
     * @param packet the IBC packet encoded by the counterparty and relayed by the relayer
     */
    function onTimeoutPacket(IbcPacket calldata packet) external override onlyIbcDispatcher {}
}
