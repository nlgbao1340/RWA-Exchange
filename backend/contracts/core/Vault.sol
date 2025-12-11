// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "../oracles/RWA_Oracle.sol";
import "./LendingPool.sol";

/**
 * @title Vault
 * @dev Contract lõi - Borrower thế chấp NFT và vay USDC
 */
contract Vault is IERC721Receiver {
    using SafeERC20 for IERC20;

    // Struct theo dõi vị thế vay của người dùng
    struct Position {
        address owner;       // Chủ sở hữu vị thế
        uint256 debt;        // Số nợ hiện tại (USDC với 6 decimals)
        uint256 tokenId;     // ID của NFT đã thế chấp
        bool active;         // Vị thế có đang hoạt động không
    }

    IERC721 public rwaToken;        // RWA NFT contract
    IERC20 public usdcToken;         // USDC token contract
    RWA_Oracle public oracle;        // Oracle cung cấp giá
    LendingPool public lendingPool;  // Pool thanh khoản

    // LTV (Loan-to-Value) ratio: 60%
    uint256 public constant LTV = 60;
    uint256 public constant LTV_PRECISION = 100;

    // Mapping từ tokenId sang Position
    mapping(uint256 => Position) public positions;

    // Address của LiquidationManager (set sau khi deploy)
    address public liquidationManager;
    bool public liquidationManagerSet;

    event CollateralDeposited(address indexed user, uint256 indexed tokenId);
    event Borrowed(address indexed user, uint256 indexed tokenId, uint256 amount);
    event Repaid(address indexed user, uint256 indexed tokenId, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 indexed tokenId);
    event LiquidationManagerSet(address indexed manager);

    constructor(
        address _rwaToken,
        address _usdcToken,
        address _oracle,
        address _lendingPool
    ) {
        require(_rwaToken != address(0), "Invalid RWA token address");
        require(_usdcToken != address(0), "Invalid USDC token address");
        require(_oracle != address(0), "Invalid oracle address");
        require(_lendingPool != address(0), "Invalid lending pool address");

        rwaToken = IERC721(_rwaToken);
        usdcToken = IERC20(_usdcToken);
        oracle = RWA_Oracle(_oracle);
        lendingPool = LendingPool(_lendingPool);
    }

    /**
     * @dev Set địa chỉ LiquidationManager (chỉ gọi một lần)
     */
    function setLiquidationManager(address _manager) external {
        require(!liquidationManagerSet, "LiquidationManager already set");
        require(_manager != address(0), "Invalid manager address");
        liquidationManager = _manager;
        liquidationManagerSet = true;
        emit LiquidationManagerSet(_manager);
    }

    /**
     * @dev Deposit NFT làm tài sản thế chấp
     * @param tokenId ID của NFT cần thế chấp
     */
    function depositCollateral(uint256 tokenId) external {
        require(oracle.isPriceSet(tokenId), "Price not set for this asset");
        require(!positions[tokenId].active, "Position already exists");

        // Transfer NFT từ user sang Vault
        rwaToken.safeTransferFrom(msg.sender, address(this), tokenId);

        // Tạo Position mới
        positions[tokenId] = Position({
            owner: msg.sender,
            debt: 0,
            tokenId: tokenId,
            active: true
        });

        emit CollateralDeposited(msg.sender, tokenId);
    }

    /**
     * @dev Vay USDC dựa trên NFT đã thế chấp
     * @param tokenId ID của NFT đã thế chấp
     * @param amount Số lượng USDC muốn vay (với 6 decimals)
     */
    function borrow(uint256 tokenId, uint256 amount) external {
        Position storage position = positions[tokenId];
        
        require(position.active, "Position does not exist");
        require(position.owner == msg.sender, "Not the owner of this position");
        require(amount > 0, "Amount must be greater than 0");

        // Lấy giá trị tài sản từ Oracle
        uint256 assetPrice = oracle.getAssetPrice(tokenId);
        
        // Tính hạn mức vay tối đa (assetPrice * LTV / 100)
        uint256 maxBorrow = (assetPrice * LTV) / LTV_PRECISION;
        
        // Kiểm tra tổng nợ sau khi vay
        uint256 newDebt = position.debt + amount;
        require(newDebt <= maxBorrow, "Exceeds borrowing limit");

        // Kiểm tra thanh khoản trong pool
        require(lendingPool.getLiquidity() >= amount, "Insufficient liquidity in pool");

        // Cập nhật nợ
        position.debt = newDebt;

        // Cho user vay từ LendingPool
        lendingPool.lend(msg.sender, amount);

        emit Borrowed(msg.sender, tokenId, amount);
    }

    /**
     * @dev Trả nợ
     * @param tokenId ID của NFT đã thế chấp
     * @param amount Số lượng USDC muốn trả (với 6 decimals)
     */
    function repay(uint256 tokenId, uint256 amount) external {
        Position storage position = positions[tokenId];
        
        require(position.active, "Position does not exist");
        require(position.owner == msg.sender, "Not the owner of this position");
        require(amount > 0, "Amount must be greater than 0");
        require(position.debt >= amount, "Amount exceeds debt");

        // Giảm nợ
        position.debt -= amount;

        // Transfer USDC từ user trực tiếp vào LendingPool
        usdcToken.safeTransferFrom(msg.sender, address(lendingPool), amount);

        emit Repaid(msg.sender, tokenId, amount);
    }

    /**
     * @dev Rút NFT về (chỉ khi đã trả hết nợ)
     * @param tokenId ID của NFT muốn rút
     */
    function withdrawCollateral(uint256 tokenId) external {
        Position storage position = positions[tokenId];
        
        require(position.active, "Position does not exist");
        require(position.owner == msg.sender, "Not the owner of this position");
        require(position.debt == 0, "Must repay all debt first");

        // Xóa position
        delete positions[tokenId];

        // Transfer NFT về cho user
        rwaToken.safeTransferFrom(address(this), msg.sender, tokenId);

        emit CollateralWithdrawn(msg.sender, tokenId);
    }

    /**
     * @dev Lấy thông tin position
     * @param tokenId ID của NFT
     * @return Position struct
     */
    function getPosition(uint256 tokenId) external view returns (Position memory) {
        return positions[tokenId];
    }

    /**
     * @dev Transfer NFT cho người thắng đấu giá (chỉ LiquidationManager)
     */
    function transferCollateralToWinner(uint256 tokenId, address winner) external {
        require(msg.sender == liquidationManager, "Only liquidation manager");
        require(positions[tokenId].active, "Position does not exist");

        delete positions[tokenId];
        rwaToken.safeTransferFrom(address(this), winner, tokenId);
    }

    /**
     * @dev Xóa nợ của position (chỉ LiquidationManager sau khi thanh lý)
     */
    function clearDebt(uint256 tokenId) external {
        require(msg.sender == liquidationManager, "Only liquidation manager");
        require(positions[tokenId].active, "Position does not exist");
        
        positions[tokenId].debt = 0;
    }

    /**
     * @dev Implement IERC721Receiver để nhận NFT
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
