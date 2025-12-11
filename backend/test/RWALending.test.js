const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWA Lending Platform Tests", function () {
  let mockUSDC, rwaToken, oracle, lendingPool, vault, liquidationManager;
  let owner, lender, borrower, bidder;
  
  const TOKEN_ID = 1;
  const ASSET_PRICE = 100_000_000000; // $100,000 (6 decimals)
  const DEPOSIT_AMOUNT = 50_000_000000; // $50,000
  const BORROW_AMOUNT = 40_000_000000; // $40,000

  beforeEach(async function () {
    // Lấy signers
    [owner, lender, borrower, bidder] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy RWA_NFT
    const RWA_NFT = await ethers.getContractFactory("RWA_NFT");
    rwaToken = await RWA_NFT.deploy();
    await rwaToken.waitForDeployment();

    // Deploy RWA_Oracle
    const RWA_Oracle = await ethers.getContractFactory("RWA_Oracle");
    oracle = await RWA_Oracle.deploy();
    await oracle.waitForDeployment();

    // Deploy LendingPool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    lendingPool = await LendingPool.deploy(await mockUSDC.getAddress());
    await lendingPool.waitForDeployment();

    // Deploy Vault
    const Vault = await ethers.getContractFactory("Vault");
    vault = await Vault.deploy(
      await rwaToken.getAddress(),
      await mockUSDC.getAddress(),
      await oracle.getAddress(),
      await lendingPool.getAddress()
    );
    await vault.waitForDeployment();

    // Deploy LiquidationManager
    const LiquidationManager = await ethers.getContractFactory("LiquidationManager");
    liquidationManager = await LiquidationManager.deploy(
      await vault.getAddress(),
      await oracle.getAddress(),
      await mockUSDC.getAddress(),
      await lendingPool.getAddress()
    );
    await liquidationManager.waitForDeployment();

    // Liên kết contracts
    await lendingPool.setVault(await vault.getAddress());
    await vault.setLiquidationManager(await liquidationManager.getAddress());

    // Mint NFT cho borrower và set giá
    await rwaToken.safeMint(borrower.address, TOKEN_ID, "ipfs://test-metadata");
    await oracle.setAssetPrice(TOKEN_ID, ASSET_PRICE);

    // Mint USDC cho lender
    await mockUSDC.mint(lender.address, DEPOSIT_AMOUNT);
  });

  describe("1. Token Tests", function () {
    it("Should mint NFT correctly", async function () {
      expect(await rwaToken.ownerOf(TOKEN_ID)).to.equal(borrower.address);
    });

    it("Should mint USDC correctly", async function () {
      expect(await mockUSDC.balanceOf(lender.address)).to.equal(DEPOSIT_AMOUNT);
    });
  });

  describe("2. Oracle Tests", function () {
    it("Should set and get asset price", async function () {
      const price = await oracle.getAssetPrice(TOKEN_ID);
      expect(price).to.equal(ASSET_PRICE);
    });

    it("Should reject non-owner setting price", async function () {
      await expect(
        oracle.connect(borrower).setAssetPrice(2, 50000)
      ).to.be.reverted;
    });
  });

  describe("3. LendingPool Tests", function () {
    it("Should allow lender to deposit", async function () {
      await mockUSDC.connect(lender).approve(await lendingPool.getAddress(), DEPOSIT_AMOUNT);
      await lendingPool.connect(lender).deposit(DEPOSIT_AMOUNT);
      
      expect(await lendingPool.getLiquidity()).to.equal(DEPOSIT_AMOUNT);
      expect(await lendingPool.deposits(lender.address)).to.equal(DEPOSIT_AMOUNT);
    });

    it("Should allow lender to withdraw", async function () {
      // Deposit trước
      await mockUSDC.connect(lender).approve(await lendingPool.getAddress(), DEPOSIT_AMOUNT);
      await lendingPool.connect(lender).deposit(DEPOSIT_AMOUNT);
      
      // Withdraw
      await lendingPool.connect(lender).withdraw(DEPOSIT_AMOUNT);
      expect(await mockUSDC.balanceOf(lender.address)).to.equal(DEPOSIT_AMOUNT);
    });
  });

  describe("4. Vault Tests - Borrow Flow", function () {
    beforeEach(async function () {
      // Lender deposit vào pool
      await mockUSDC.connect(lender).approve(await lendingPool.getAddress(), DEPOSIT_AMOUNT);
      await lendingPool.connect(lender).deposit(DEPOSIT_AMOUNT);
    });

    it("Should allow borrower to deposit collateral", async function () {
      await rwaToken.connect(borrower).approve(await vault.getAddress(), TOKEN_ID);
      await vault.connect(borrower).depositCollateral(TOKEN_ID);
      
      const position = await vault.getPosition(TOKEN_ID);
      expect(position.owner).to.equal(borrower.address);
      expect(position.active).to.be.true;
    });

    it("Should allow borrower to borrow", async function () {
      // Deposit collateral
      await rwaToken.connect(borrower).approve(await vault.getAddress(), TOKEN_ID);
      await vault.connect(borrower).depositCollateral(TOKEN_ID);
      
      // Borrow
      const borrowerBalanceBefore = await mockUSDC.balanceOf(borrower.address);
      await vault.connect(borrower).borrow(TOKEN_ID, BORROW_AMOUNT);
      
      const borrowerBalanceAfter = await mockUSDC.balanceOf(borrower.address);
      expect(borrowerBalanceAfter - borrowerBalanceBefore).to.equal(BORROW_AMOUNT);
      
      const position = await vault.getPosition(TOKEN_ID);
      expect(position.debt).to.equal(BORROW_AMOUNT);
    });

    it("Should not allow borrowing more than LTV", async function () {
      await rwaToken.connect(borrower).approve(await vault.getAddress(), TOKEN_ID);
      await vault.connect(borrower).depositCollateral(TOKEN_ID);
      
      // Cố gắng vay nhiều hơn 60% của $100,000 = $60,000
      const tooMuch = 70_000_000000;
      await expect(
        vault.connect(borrower).borrow(TOKEN_ID, tooMuch)
      ).to.be.revertedWith("Exceeds borrowing limit");
    });

    it("Should allow borrower to repay", async function () {
      // Deposit và borrow
      await rwaToken.connect(borrower).approve(await vault.getAddress(), TOKEN_ID);
      await vault.connect(borrower).depositCollateral(TOKEN_ID);
      await vault.connect(borrower).borrow(TOKEN_ID, BORROW_AMOUNT);
      
      // Repay
      await mockUSDC.connect(borrower).approve(await vault.getAddress(), BORROW_AMOUNT);
      await vault.connect(borrower).repay(TOKEN_ID, BORROW_AMOUNT);
      
      const position = await vault.getPosition(TOKEN_ID);
      expect(position.debt).to.equal(0);
    });

    it("Should allow borrower to withdraw collateral after repaying", async function () {
      // Full flow
      await rwaToken.connect(borrower).approve(await vault.getAddress(), TOKEN_ID);
      await vault.connect(borrower).depositCollateral(TOKEN_ID);
      await vault.connect(borrower).borrow(TOKEN_ID, BORROW_AMOUNT);
      await mockUSDC.connect(borrower).approve(await vault.getAddress(), BORROW_AMOUNT);
      await vault.connect(borrower).repay(TOKEN_ID, BORROW_AMOUNT);
      
      // Withdraw
      await vault.connect(borrower).withdrawCollateral(TOKEN_ID);
      expect(await rwaToken.ownerOf(TOKEN_ID)).to.equal(borrower.address);
    });
  });

  describe("5. LiquidationManager Tests", function () {
    beforeEach(async function () {
      // Setup: Lender deposit, Borrower vay tới mức giới hạn
      await mockUSDC.connect(lender).approve(await lendingPool.getAddress(), DEPOSIT_AMOUNT);
      await lendingPool.connect(lender).deposit(DEPOSIT_AMOUNT);
      
      await rwaToken.connect(borrower).approve(await vault.getAddress(), TOKEN_ID);
      await vault.connect(borrower).depositCollateral(TOKEN_ID);
      await vault.connect(borrower).borrow(TOKEN_ID, BORROW_AMOUNT); // $40k vay
    });

    it("Should check health correctly - healthy position", async function () {
      const isHealthy = await liquidationManager.checkHealth(TOKEN_ID);
      expect(isHealthy).to.be.true;
    });

    it("Should check health correctly - unhealthy position", async function () {
      // Giảm giá tài sản xuống $50,000 -> LTV limit = $30,000 nhưng nợ $40,000
      await oracle.setAssetPrice(TOKEN_ID, 50_000_000000);
      
      const isHealthy = await liquidationManager.checkHealth(TOKEN_ID);
      expect(isHealthy).to.be.false;
    });

    it("Should start auction for unhealthy position", async function () {
      // Làm cho position không an toàn
      await oracle.setAssetPrice(TOKEN_ID, 50_000_000000);
      
      await liquidationManager.startAuction(TOKEN_ID);
      
      const auction = await liquidationManager.getAuction(TOKEN_ID);
      expect(auction.active).to.be.true;
      expect(auction.originalDebt).to.equal(BORROW_AMOUNT);
    });

    it("Should not start auction for healthy position", async function () {
      await expect(
        liquidationManager.startAuction(TOKEN_ID)
      ).to.be.revertedWith("Position is healthy");
    });
  });

  describe("6. Full Liquidation Flow", function () {
    it("Should complete full auction and liquidation", async function () {
      // Setup
      await mockUSDC.connect(lender).approve(await lendingPool.getAddress(), DEPOSIT_AMOUNT);
      await lendingPool.connect(lender).deposit(DEPOSIT_AMOUNT);
      
      await rwaToken.connect(borrower).approve(await vault.getAddress(), TOKEN_ID);
      await vault.connect(borrower).depositCollateral(TOKEN_ID);
      await vault.connect(borrower).borrow(TOKEN_ID, BORROW_AMOUNT);
      
      // Làm position không an toàn
      await oracle.setAssetPrice(TOKEN_ID, 50_000_000000);
      
      // Start auction
      await liquidationManager.startAuction(TOKEN_ID);
      
      // Bidder đặt giá
      const bidAmount = 45_000_000000; // $45,000
      await mockUSDC.mint(bidder.address, bidAmount);
      await mockUSDC.connect(bidder).approve(await liquidationManager.getAddress(), bidAmount);
      await liquidationManager.connect(bidder).bid(TOKEN_ID, bidAmount);
      
      // Tăng thời gian để kết thúc đấu giá
      await ethers.provider.send("evm_increaseTime", [3 * 24 * 60 * 60 + 1]); // 3 ngày + 1 giây
      await ethers.provider.send("evm_mine");
      
      // End auction
      const borrowerBalanceBefore = await mockUSDC.balanceOf(borrower.address);
      await liquidationManager.endAuction(TOKEN_ID);
      const borrowerBalanceAfter = await mockUSDC.balanceOf(borrower.address);
      
      // Kiểm tra: Borrower nhận được phần dư ($45k - $40k = $5k)
      expect(borrowerBalanceAfter - borrowerBalanceBefore).to.equal(5_000_000000);
      
      // Kiểm tra: Bidder nhận được NFT
      expect(await rwaToken.ownerOf(TOKEN_ID)).to.equal(bidder.address);
      
      // Kiểm tra: Nợ đã được xóa
      const position = await vault.getPosition(TOKEN_ID);
      expect(position.debt).to.equal(0);
    });
  });
});
