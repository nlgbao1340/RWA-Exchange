// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../oracles/RWA_Oracle.sol";
import "./Vault.sol";
import "./LendingPool.sol";

/**
 * @title LiquidationManager
 * @dev Quản lý thanh lý các khoản vay không an toàn thông qua đấu giá kiểu Anh
 */
contract LiquidationManager {
    using SafeERC20 for IERC20;

    // Struct cho đấu giá
    struct Auction {
        uint256 tokenId;           // ID của NFT
        address highestBidder;     // Người trả giá cao nhất
        uint256 highestBid;        // Giá cao nhất
        uint256 endTime;           // Thời gian kết thúc đấu giá
        bool active;               // Đấu giá có đang hoạt động không
        address originalOwner;     // Chủ sở hữu ban đầu
        uint256 originalDebt;      // Nợ ban đầu
    }

    Vault public vault;
    RWA_Oracle public oracle;
    IERC20 public usdcToken;
    LendingPool public lendingPool;

    // Thời gian đấu giá (3 ngày = 259200 giây)
    uint256 public constant AUCTION_DURATION = 3 days;
    
    // Bước giá tối thiểu (5%)
    uint256 public constant MIN_BID_INCREMENT = 5;
    uint256 public constant BID_PRECISION = 100;

    // Mapping từ tokenId sang Auction
    mapping(uint256 => Auction) public auctions;

    event AuctionStarted(uint256 indexed tokenId, uint256 endTime, uint256 debt);
    event NewBid(uint256 indexed tokenId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 finalBid);

    constructor(
        address _vault,
        address _oracle,
        address _usdcToken,
        address _lendingPool
    ) {
        require(_vault != address(0), "Invalid vault address");
        require(_oracle != address(0), "Invalid oracle address");
        require(_usdcToken != address(0), "Invalid USDC address");
        require(_lendingPool != address(0), "Invalid pool address");

        vault = Vault(_vault);
        oracle = RWA_Oracle(_oracle);
        usdcToken = IERC20(_usdcToken);
        lendingPool = LendingPool(_lendingPool);
    }

    /**
     * @dev Kiểm tra sức khỏe của khoản vay
     * @param tokenId ID của NFT
     * @return true nếu an toàn, false nếu cần thanh lý
     */
    function checkHealth(uint256 tokenId) public view returns (bool) {
        Vault.Position memory position = vault.getPosition(tokenId);
        
        if (!position.active || position.debt == 0) {
            return true; // Không có nợ thì an toàn
        }

        uint256 assetPrice = oracle.getAssetPrice(tokenId);
        uint256 maxSafeDebt = (assetPrice * vault.LTV()) / 100;

        // Nếu nợ > maxSafeDebt thì không an toàn
        return position.debt <= maxSafeDebt;
    }

    /**
     * @dev Bắt đầu đấu giá thanh lý
     * @param tokenId ID của NFT cần thanh lý
     */
    function startAuction(uint256 tokenId) external {
        require(!auctions[tokenId].active, "Auction already active");
        require(!checkHealth(tokenId), "Position is healthy");

        Vault.Position memory position = vault.getPosition(tokenId);
        require(position.active, "Position does not exist");

        // Tạo đấu giá mới
        auctions[tokenId] = Auction({
            tokenId: tokenId,
            highestBidder: address(0),
            highestBid: 0,
            endTime: block.timestamp + AUCTION_DURATION,
            active: true,
            originalOwner: position.owner,
            originalDebt: position.debt
        });

        emit AuctionStarted(tokenId, block.timestamp + AUCTION_DURATION, position.debt);
    }

    /**
     * @dev Đặt giá trong đấu giá
     * @param tokenId ID của NFT
     * @param bidAmount Số tiền đặt giá (USDC với 6 decimals)
     */
    function bid(uint256 tokenId, uint256 bidAmount) external {
        Auction storage auction = auctions[tokenId];
        
        require(auction.active, "Auction not active");
        require(block.timestamp < auction.endTime, "Auction ended");
        require(bidAmount > 0, "Bid must be greater than 0");

        // Kiểm tra bid mới phải cao hơn bid cũ ít nhất 5%
        if (auction.highestBid > 0) {
            uint256 minBid = auction.highestBid + (auction.highestBid * MIN_BID_INCREMENT / BID_PRECISION);
            require(bidAmount >= minBid, "Bid too low");
        } else {
            // Bid đầu tiên phải >= nợ
            require(bidAmount >= auction.originalDebt, "Bid must cover debt");
        }

        // Hoàn trả USDC cho người đặt giá cao nhất trước đó
        if (auction.highestBidder != address(0)) {
            usdcToken.safeTransfer(auction.highestBidder, auction.highestBid);
        }

        // Nhận USDC từ người đặt giá mới
        usdcToken.safeTransferFrom(msg.sender, address(this), bidAmount);

        // Cập nhật thông tin đấu giá
        auction.highestBidder = msg.sender;
        auction.highestBid = bidAmount;

        emit NewBid(tokenId, msg.sender, bidAmount);
    }

    /**
     * @dev Kết thúc đấu giá và thanh lý
     * @param tokenId ID của NFT
     */
    function endAuction(uint256 tokenId) external {
        Auction storage auction = auctions[tokenId];
        
        require(auction.active, "Auction not active");
        require(block.timestamp >= auction.endTime, "Auction not ended yet");
        require(auction.highestBidder != address(0), "No bids received");

        uint256 finalBid = auction.highestBid;
        uint256 debt = auction.originalDebt;
        address winner = auction.highestBidder;
        address originalOwner = auction.originalOwner;

        // Đóng đấu giá
        auction.active = false;

        // Bước 1: Trả nợ cho LendingPool
        // Transfer trực tiếp USDC từ contract này vào LendingPool
        usdcToken.safeTransfer(address(lendingPool), debt);

        // Bước 2: Trả phần dư cho chủ sở hữu ban đầu (nếu có)
        if (finalBid > debt) {
            uint256 surplus = finalBid - debt;
            usdcToken.safeTransfer(originalOwner, surplus);
        }

        // Bước 3: Xóa nợ và chuyển NFT cho người thắng
        vault.clearDebt(tokenId);
        vault.transferCollateralToWinner(tokenId, winner);

        emit AuctionEnded(tokenId, winner, finalBid);
    }

    /**
     * @dev Lấy thông tin đấu giá
     * @param tokenId ID của NFT
     * @return Auction struct
     */
    function getAuction(uint256 tokenId) external view returns (Auction memory) {
        return auctions[tokenId];
    }

    /**
     * @dev Lấy thời gian còn lại của đấu giá
     * @param tokenId ID của NFT
     * @return Số giây còn lại (0 nếu đã hết hạn)
     */
    function getTimeLeft(uint256 tokenId) external view returns (uint256) {
        Auction memory auction = auctions[tokenId];
        if (!auction.active || block.timestamp >= auction.endTime) {
            return 0;
        }
        return auction.endTime - block.timestamp;
    }
}
