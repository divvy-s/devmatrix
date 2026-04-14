// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TempleSprintBadge is ERC721, Ownable {
    uint256 private _nextTokenId;

    // Mapping to track if an address has already claimed a badge for a specific week
    // User Address => Week String => HasClaimed (boolean)
    mapping(address => mapping(string => bool)) public hasClaimedWeek;

    constructor() ERC721("Temple Sprint Badge", "TSB") Ownable(msg.sender) {}

    /**
     * @dev Claim a gasless badge for the given week. 
     * In MVP, user pays gas on Sepolia to claim.
     * @param week The week identifier (e.g., "2025-W15")
     */
    function claimBadge(string memory week) external {
        require(!hasClaimedWeek[msg.sender][week], "Already claimed badge for this week");

        uint256 tokenId = _nextTokenId++;
        hasClaimedWeek[msg.sender][week] = true;
        _safeMint(msg.sender, tokenId);
    }

    /**
     * @dev Optional: Base URI for metadata if you want to add images on IPFS later 
     */
    function _baseURI() internal pure override returns (string memory) {
        return "https://temple-sprint.vercel.app/api/metadata/";
    }
}
