// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract TempleSprintTierRewards is ERC1155, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // claimId => claimed status
    mapping(bytes32 => bool) public hasClaimed;

    // Backend signer that validates off-chain score eligibility
    address public rewardSigner;

    event RewardClaimed(address indexed player, uint8 indexed tier, string week, bytes32 claimId);
    event RewardSignerUpdated(address indexed newSigner);

    constructor(address signer_, string memory baseUri_) ERC1155(baseUri_) Ownable(msg.sender) {
        require(signer_ != address(0), "Invalid signer");
        rewardSigner = signer_;
    }

    function setRewardSigner(address signer_) external onlyOwner {
        require(signer_ != address(0), "Invalid signer");
        rewardSigner = signer_;
        emit RewardSignerUpdated(signer_);
    }

    function setURI(string calldata newUri) external onlyOwner {
        _setURI(newUri);
    }

    function claimReward(
        uint8 tier,
        string calldata week,
        bytes32 claimId,
        bytes calldata signature
    ) external {
        require(tier >= 1 && tier <= 3, "Invalid tier");
        require(!hasClaimed[claimId], "Reward already claimed");

        bytes32 payloadHash = keccak256(
            abi.encodePacked(address(this), block.chainid, msg.sender, tier, week, claimId)
        );

        address recovered = payloadHash.toEthSignedMessageHash().recover(signature);
        require(recovered == rewardSigner, "Invalid reward signature");

        hasClaimed[claimId] = true;
        _mint(msg.sender, tier, 1, "");

        emit RewardClaimed(msg.sender, tier, week, claimId);
    }
}
