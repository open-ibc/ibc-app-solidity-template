//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "@open-ibc/vibc-core-smart-contracts/contracts/libs/Ibc.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcReceiver.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcDispatcher.sol";
import "@open-ibc/vibc-core-smart-contracts/contracts/interfaces/IbcMiddleware.sol";

contract GeneralMiddleware is IbcMwUser, IbcMiddleware, IbcMwEventsEmitter {
    /**
     * @dev MW_ID is the ID of MW contract on all supported virtual chains.
     * MW_ID must:
     * - be globally unique, ie. no two MWs should have the same MW_ID registered on Polymer chain.
     * - be identical on all supported virtual chains.
     * - be identical on one virtual chain across multiple deployed MW instances. Each MW instance belong exclusively to one MW stack.
     * - be 1 << N, where N is a non-negative integer, and not in conflict with other MWs.
     */
    uint256 public MW_ID;

    /**
     * @param _middleware The middleware contract address this contract sends packets to and receives packets from.
     */
    constructor(uint256 mwId, address _middleware) IbcMwUser(_middleware) {
        MW_ID = mwId;
    }

    function sendUniversalPacket(
        bytes32 channelId,
        bytes32 destPortAddr,
        bytes calldata appData,
        uint64 timeoutTimestamp
    ) external override {
        _sendPacket(channelId, IbcUtils.toBytes32(msg.sender), destPortAddr, 0, appData, timeoutTimestamp);
    }

    function sendMWPacket(
        bytes32 channelId,
        bytes32 srcPortAddr,
        bytes32 destPortAddr,
        uint256 srcMwIds,
        bytes calldata appData,
        uint64 timeoutTimestamp
    ) external override {
        _sendPacket(channelId, srcPortAddr, destPortAddr, srcMwIds, appData, timeoutTimestamp);
    }

    function onRecvMWPacket(
        bytes32 channelId,
        UniversalPacket calldata ucPacket,
        // address srcPortAddr,
        // address destPortAddr,
        // 0-based receiver middleware index in the MW stack.
        //  0 for the first MW directly called by UniversalChannel MW.
        // `mwIndex-1` is the last MW that delivers the packet to the non-MW dApp.
        // Each mw in the stack must increment mwIndex by 1 before calling the next MW.
        uint256 mwIndex,
        // bytes calldata appData,
        address[] calldata mwAddrs
    ) external onlyIbcMw returns (AckPacket memory ackPacket) {
        // extra MW custom logic here to process packet, eg. emit MW events, mutate state, etc.
        // implementer can emit custom data fields suitable for their use cases.
        // Here we use MW_ID as the custom MW data field.
        emit RecvMWPacket(
            channelId, ucPacket.srcPortAddr, ucPacket.destPortAddr, MW_ID, ucPacket.appData, abi.encodePacked(MW_ID)
        );

        if (mwIndex == mwAddrs.length - 1) {
            // last MW in the stack, deliver packet to dApp
            return IbcUniversalPacketReceiver(IbcUtils.toAddress(ucPacket.destPortAddr)).onRecvUniversalPacket(
                channelId, ucPacket
            );
        } else {
            // send packet to next MW
            return IbcMwPacketReceiver(mwAddrs[mwIndex + 1]).onRecvMWPacket(channelId, ucPacket, mwIndex + 1, mwAddrs);
        }
    }

    function onRecvMWAck(
        bytes32 channelId,
        UniversalPacket calldata ucPacket,
        // 0-based receiver middleware index in the MW stack.
        //  0 for the first MW directly called by UniversalChannel MW.
        // `mwIndex-1` is the last MW that delivers the packet to the non-MW dApp.
        // Each mw in the stack must increment mwIndex by 1 before calling the next MW.
        uint256 mwIndex,
        address[] calldata mwAddrs,
        AckPacket calldata ack
    ) external override onlyIbcMw {
        // extra MW custom logic here to process packet, eg. emit MW events, mutate state, etc.
        // implementer can emit custom data fields suitable for their use cases.
        // Here we use MW_ID as the custom MW data field.
        emit RecvMWAck(
            channelId,
            ucPacket.srcPortAddr,
            ucPacket.destPortAddr,
            MW_ID,
            ucPacket.appData,
            abi.encodePacked(MW_ID),
            ack
        );

        if (mwIndex == mwAddrs.length - 1) {
            // last MW in the stack, deliver ack to dApp
            IbcUniversalPacketReceiver(IbcUtils.toAddress(ucPacket.srcPortAddr)).onUniversalAcknowledgement(
                channelId, ucPacket, ack
            );
        } else {
            // send ack to next MW
            IbcMwPacketReceiver(mwAddrs[mwIndex + 1]).onRecvMWAck(channelId, ucPacket, mwIndex + 1, mwAddrs, ack);
        }
    }

    function onRecvMWTimeout(
        bytes32 channelId,
        UniversalPacket calldata ucPacket,
        uint256 mwIndex,
        address[] calldata mwAddrs
    ) external override onlyIbcMw {
        // extra MW custom logic here to process packet, eg. emit MW events, mutate state, etc.
        // implementer can emit custom data fields suitable for their use cases.
        // Here we use MW_ID as the custom MW data field.
        emit RecvMWTimeout(
            channelId, ucPacket.srcPortAddr, ucPacket.destPortAddr, MW_ID, ucPacket.appData, abi.encodePacked(MW_ID)
        );

        if (mwIndex == mwAddrs.length - 1) {
            // last MW in the stack, deliver timeout to dApp
            IbcUniversalPacketReceiver(IbcUtils.toAddress(ucPacket.srcPortAddr)).onTimeoutUniversalPacket(
                channelId, ucPacket
            );
        } else {
            // send timeout to next MW
            IbcMwPacketReceiver(mwAddrs[mwIndex + 1]).onRecvMWTimeout(channelId, ucPacket, mwIndex + 1, mwAddrs);
        }
    }

    function onRecvUniversalPacket(bytes32 channelId, UniversalPacket calldata ucPacket)
        external
        override
        onlyIbcMw
        returns (AckPacket memory ackPacket)
    {}

    function onUniversalAcknowledgement(bytes32 channelId, UniversalPacket memory packet, AckPacket calldata ack)
        external
        override
        onlyIbcMw
    {}

    function onTimeoutUniversalPacket(bytes32 channelId, UniversalPacket calldata packet) external override onlyIbcMw {}

    // internal function to send packet to next MW with MW Ids bit flipped
    // param srcMwIds: MW ID bitmap excluding this MW's ID
    function _sendPacket(
        bytes32 channelId,
        bytes32 srcPortAddr,
        bytes32 destPortAddr,
        uint256 srcMwIds,
        bytes calldata appData,
        uint64 timeoutTimestamp
    ) internal virtual {
        // extra MW custom logic here to process packet, eg. emit MW events, mutate state, etc.
        // implementer can emit custom data fields suitable for their use cases.
        // Here we use MW_ID as the custom MW data field.
        emit SendMWPacket(
            channelId, srcPortAddr, destPortAddr, MW_ID, appData, timeoutTimestamp, abi.encodePacked(MW_ID)
        );

        // send packet to next MW
        IbcMwPacketSender(mw).sendMWPacket(
            channelId, srcPortAddr, destPortAddr, srcMwIds | MW_ID, appData, timeoutTimestamp
        );
    }
}
