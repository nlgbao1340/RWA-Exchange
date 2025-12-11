// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @dev ERC-20 token giả lập USDC cho mục đích testing
 * Bất kỳ ai cũng có thể mint token này (faucet)
 */
contract MockUSDC is ERC20 {
    
    constructor() ERC20("Mock USDC", "USDC") {
        // Mint 1 triệu USDC cho deployer để testing
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }

    /**
     * @dev Cho phép bất kỳ ai mint token để testing
     * @param to Địa chỉ người nhận
     * @param amount Số lượng token (với 18 decimals)
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @dev Override decimals để dùng 6 decimals như USDC thật
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
