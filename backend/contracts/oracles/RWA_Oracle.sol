// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RWA_Oracle
 * @dev Oracle giả lập cung cấp giá trị cho RWA NFT
 * Chỉ owner (Nhà phát hành) mới có thể cập nhật giá
 */
contract RWA_Oracle is Ownable {
    
    // Mapping từ tokenId của NFT sang giá trị (USD với 6 decimals)
    mapping(uint256 => uint256) private assetPrices;

    // Event khi giá được cập nhật
    event PriceUpdated(uint256 indexed tokenId, uint256 newPrice);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Cập nhật giá cho một RWA NFT
     * @param tokenId ID của NFT
     * @param price Giá trị mới (USD với 6 decimals, ví dụ: 100000 = $100,000)
     */
    function setAssetPrice(uint256 tokenId, uint256 price) external onlyOwner {
        require(price > 0, "Price must be greater than 0");
        assetPrices[tokenId] = price;
        emit PriceUpdated(tokenId, price);
    }

    /**
     * @dev Lấy giá của một RWA NFT
     * @param tokenId ID của NFT
     * @return Giá trị hiện tại (USD với 6 decimals)
     */
    function getAssetPrice(uint256 tokenId) external view returns (uint256) {
        uint256 price = assetPrices[tokenId];
        require(price > 0, "Price not set for this asset");
        return price;
    }

    /**
     * @dev Kiểm tra xem giá đã được set chưa
     * @param tokenId ID của NFT
     * @return true nếu giá đã được set
     */
    function isPriceSet(uint256 tokenId) external view returns (bool) {
        return assetPrices[tokenId] > 0;
    }
}
