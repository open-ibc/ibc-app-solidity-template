//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "../base/CustomChanIbcApp.sol";

contract XGif is CustomChanIbcApp {
    constructor(IbcDispatcher _dispatcher) CustomChanIbcApp(_dispatcher) {}

    enum IbcPacketStatus {
        UNSENT,
        SENT,
        ACKED,
        TIMEOUT
    }
    struct Gift {
        address sender;
        address receiver;
        uint amount;
        bool isClaimed;
        bool isCancelled;
        IbcPacketStatus ibcStatus;
    }
    struct IbcPacketBalance {
        uint amount;
        address sender;
        IbcPacketStatus ibcStatus;
    }
    mapping(bytes32 => IbcPacketBalance) public depositPackets;

    mapping(address => uint) public balancesOf;
    mapping(string => Gift) public gifts;
    mapping(address => string[]) public giftLinksOf; // Mapping to save list of gift links for each receiver

    /**
     * @dev Allows users to deposit ETH into the contract.
     */
    function deposit(
        bytes32 channelId,
        uint64 timeoutSeconds
    ) external payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        IbcPacketBalance memory payload = IbcPacketBalance({
            amount: msg.value,
            sender: msg.sender,
            ibcStatus: IbcPacketStatus.UNSENT
        });
        // Save ibc packet
        bytes32 packetId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp)
        );
        depositPackets[packetId] = payload;
        // Send packet
        sendPacket(
            channelId,
            timeoutSeconds,
            abi.encode(msg.sender, packetId, payload)
        );
    }

    /**
     * @dev Allows users to withdraw ETH from the contract.
     * @param _amount The amount of ETH to withdraw.
     */
    function withdraw(uint _amount) external {
        require(_amount > 0, "Withdraw amount must be greater than zero");
        require(balancesOf[msg.sender] >= _amount, "Insufficient balance");

        balancesOf[msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);
    }

    function createGift(
        address _receiver,
        uint _amount
    ) external returns (bytes32) {
        require(_receiver != address(0), "Invalid receiver address");
        require(_amount > 0, "Invalid gift amount");
        require(balancesOf[msg.sender] >= _amount, "Insufficient balance");
        require(
            _receiver != msg.sender,
            "Sender and receiver cannot be the same"
        );

        Gift memory newGift = Gift({
            sender: msg.sender,
            receiver: _receiver,
            amount: _amount,
            ibcStatus: IbcPacketStatus.UNSENT,
            isClaimed: false,
            isCancelled: false
        });

        // Generate a unique gift ID
        bytes32 giftId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp)
        );

        gifts[bytes32ToString(giftId)] = newGift;
        giftLinksOf[_receiver].push(bytes32ToString(giftId));

        balancesOf[msg.sender] -= _amount;
        return giftId;
    }

    /**
     * @dev Converts a bytes32 value to a string.
     * @param _bytes32Value The bytes32 value to convert.
     * @return The string representation of the bytes32 value.
     */
    function bytes32ToString(
        bytes32 _bytes32Value
    ) internal pure returns (string memory) {
        bytes memory bytesArray = new bytes(32);
        for (uint256 i; i < 32; i++) {
            bytesArray[i] = _bytes32Value[i];
        }
        return string(bytesArray);
    }

    /**
     * @dev Allows users to create multiple gifts for a list of addresses with the same amount.
     * @param _receivers The list of receiver addresses.
     * @param _amount The amount of each gift.
     */
    function createMultipleGifts(
        address[] memory _receivers,
        uint _amount
    ) external returns (bytes32[] memory) {
        require(_receivers.length > 0, "Receiver list is empty");
        require(_amount > 0, "Invalid gift amount");

        require(
            balancesOf[msg.sender] >= _receivers.length * _amount,
            "Insufficient balance in balancesOf"
        );

        bytes32[] memory giftIds = new bytes32[](_receivers.length);

        for (uint i = 0; i < _receivers.length; i++) {
            require(_receivers[i] != address(0), "Invalid receiver address");
            require(
                _receivers[i] != msg.sender,
                "Sender and receiver cannot be the same"
            );

            Gift memory newGift = Gift({
                sender: msg.sender,
                receiver: _receivers[i],
                amount: _amount,
                ibcStatus: IbcPacketStatus.UNSENT,
                isClaimed: false,
                isCancelled: false
            });

            // Generate a unique gift ID
            bytes32 giftId = keccak256(
                abi.encodePacked(msg.sender, block.timestamp, i)
            );

            gifts[bytes32ToString(giftId)] = newGift;
            giftLinksOf[_receivers[i]].push(bytes32ToString(giftId));
            giftIds[i] = giftId;
        }

        balancesOf[msg.sender] -= _receivers.length * _amount;

        return giftIds;
    }

    /**
     * @dev Allows users to claim a gift by providing the gift ID.
     * @param _giftId The ID of the gift to claim.
     */
    function claimGift(string memory _giftId) external {
        require(
            gifts[_giftId].receiver == msg.sender,
            "You are not the intended receiver of this gift"
        );
        require(
            gifts[_giftId].ibcStatus == IbcPacketStatus.SENT,
            "Gift is not available for claiming"
        );
        require(!gifts[_giftId].isClaimed, "Gift has already been claimed");
        require(!gifts[_giftId].isCancelled, "Gift has been cancelled");

        uint amount = gifts[_giftId].amount;
        gifts[_giftId].ibcStatus = IbcPacketStatus.ACKED;
        gifts[_giftId].isClaimed = true;
        balancesOf[msg.sender] += amount;
        payable(msg.sender).transfer(amount);
    }

    /**
     * @dev Retrieves the list of gift IDs available for a user.
     * @param user The address of the user.
     * @return An array of gift IDs.
     */
    function getGiftsByUser(
        address user
    ) external view returns (string[] memory) {
        string[] memory userGifts = giftLinksOf[user];
        uint count = 0;

        for (uint i = 0; i < userGifts.length; i++) {
            if (gifts[userGifts[i]].ibcStatus == IbcPacketStatus.SENT) {
                count++;
            }
        }

        // Resize the array to remove any empty elements
        string[] memory result = new string[](count);
        uint index = 0;
        for (uint i = 0; i < userGifts.length; i++) {
            if (gifts[userGifts[i]].ibcStatus == IbcPacketStatus.SENT) {
                result[index] = userGifts[i];
                index++;
            }
        }

        return result;
    }

    // ----------------------- IBC logic  -----------------------

    /**
     * @dev Sends a packet with the caller address over a specified channel.
     * @param channelId The ID of the channel (locally) to send the packet to.
     * @param timeoutSeconds The timeout in seconds (relative).
     */

    function sendPacket(
        bytes32 channelId,
        uint64 timeoutSeconds,
        bytes memory payload
    ) internal {
        // setting the timeout timestamp at 10h from now
        uint64 timeoutTimestamp = uint64(
            (block.timestamp + timeoutSeconds) * 1000000000
        );

        // calling the Dispatcher to send the packet
        dispatcher.sendPacket(channelId, payload, timeoutTimestamp);
    }

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and returns and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     *
     * @param packet the IBC packet encoded by the source and relayed by the relayer.
     */
    function onRecvPacket(
        IbcPacket memory packet
    ) external override onlyIbcDispatcher returns (AckPacket memory ackPacket) {
        recvedPackets.push(packet);
        // Handle packet deposit balance
        (address _caller, bytes32 _id, IbcPacketBalance memory _balance) = abi
            .decode(packet.data, (address, bytes32, IbcPacketBalance));
        depositPackets[_id].ibcStatus = IbcPacketStatus.SENT;
        return AckPacket(true, abi.encode(_caller, _id, _balance));
    }

    /**
     * @dev Packet lifecycle callback that implements packet acknowledgment logic.
     *      MUST be overriden by the inheriting contract.
     *
     * @param ack the acknowledgment packet encoded by the destination and relayed by the relayer.
     */
    function onAcknowledgementPacket(
        IbcPacket calldata,
        AckPacket calldata ack
    ) external override onlyIbcDispatcher {
        ackPackets.push(ack);
        (address _caller, bytes32 _id, IbcPacketBalance memory _balance) = abi
            .decode(ack.data, (address, bytes32, IbcPacketBalance));
        depositPackets[_id].ibcStatus = IbcPacketStatus.ACKED;
        balancesOf[_caller] += _balance.amount;
    }

    /**
     * @dev Packet lifecycle callback that implements packet receipt logic and return and acknowledgement packet.
     *      MUST be overriden by the inheriting contract.
     *      NOT SUPPORTED YET
     *
     * @param packet the IBC packet encoded by the counterparty and relayed by the relayer
     */
    function onTimeoutPacket(
        IbcPacket calldata packet
    ) external override onlyIbcDispatcher {
        timeoutPackets.push(packet);
        // do logic
    }
}
