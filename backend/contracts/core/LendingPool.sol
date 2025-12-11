// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LendingPool
 * @dev Pool chứa thanh khoản MockUSDC từ các Lenders
 * Vault sẽ vay từ pool này để cho Borrowers vay
 */
contract LendingPool is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public usdcToken;
    
    // Mapping từ địa chỉ lender sang số tiền đã deposit
    mapping(address => uint256) public deposits;
    
    // Tổng số tiền đã deposit
    uint256 public totalDeposits;

    // Chỉ Vault được phép vay từ pool
    address public vault;
    bool public vaultSet;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event VaultSet(address indexed vault);

    constructor(address _usdcToken) Ownable(msg.sender) {
        require(_usdcToken != address(0), "Invalid USDC address");
        usdcToken = IERC20(_usdcToken);
    }

    /**
     * @dev Set địa chỉ Vault (chỉ gọi một lần sau khi deploy)
     */
    function setVault(address _vault) external onlyOwner {
        require(!vaultSet, "Vault already set");
        require(_vault != address(0), "Invalid vault address");
        vault = _vault;
        vaultSet = true;
        emit VaultSet(_vault);
    }

    /**
     * @dev Lender deposit USDC vào pool
     * @param amount Số lượng USDC cần deposit (với 6 decimals)
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
        
        deposits[msg.sender] += amount;
        totalDeposits += amount;
        
        emit Deposited(msg.sender, amount);
    }

    /**
     * @dev Lender rút USDC khỏi pool
     * @param amount Số lượng USDC cần rút
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(deposits[msg.sender] >= amount, "Insufficient balance");
        require(getLiquidity() >= amount, "Insufficient liquidity in pool");
        
        deposits[msg.sender] -= amount;
        totalDeposits -= amount;
        
        usdcToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Lấy thanh khoản khả dụng trong pool
     * @return Số USDC còn lại trong pool
     */
    function getLiquidity() public view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }

    /**
     * @dev Vault vay USDC từ pool để cho borrower
     * Chỉ Vault được gọi hàm này
     */
    function lend(address borrower, uint256 amount) external {
        require(msg.sender == vault, "Only vault can lend");
        require(amount > 0, "Amount must be greater than 0");
        require(getLiquidity() >= amount, "Insufficient liquidity");
        
        usdcToken.safeTransfer(borrower, amount);
    }

    /**
     * @dev Nhận USDC trả nợ từ Vault
     * Ai cũng có thể gửi USDC vào pool (thường là Vault)
     */
    function repayLoan(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);
    }
}
