// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RWA_NFT
 * @dev ERC-721 NFT đại diện cho Real World Assets (Tài sản Thực)
 * Chỉ owner (Nhà phát hành) mới có thể mint NFT
 */
contract RWA_NFT is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    
    constructor() ERC721("Real World Asset NFT", "RWA") Ownable(msg.sender) {}

    /**
     * @dev Mint một NFT mới với metadata URI
     * @param to Địa chỉ người nhận NFT
     * @param tokenId ID của token cần mint
     * @param uri URI trỏ đến metadata (IPFS)
     */
    function safeMint(address to, uint256 tokenId, string memory uri) public onlyOwner {
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // Override functions yêu cầu bởi Solidity
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
}
