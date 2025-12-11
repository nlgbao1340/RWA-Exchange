const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🌱 Bắt đầu seed data với sample transactions...\n");

  // Load deployment info
  const deploymentPath = path.join(__dirname, "../deployments", `${hre.network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found. Please deploy contracts first.");
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contracts = deployment.contracts;

  // Get signers
  const [deployer, user1, user2, user3] = await hre.ethers.getSigners();
  console.log("👥 Using accounts:");
  console.log("   Deployer:", deployer.address);
  console.log("   User1:", user1.address);
  console.log("   User2:", user2.address);
  console.log("   User3:", user3.address, "\n");

  // Connect to contracts
  const mockUSDC = await hre.ethers.getContractAt("MockUSDC", contracts.MockUSDC, deployer);
  const rwaToken = await hre.ethers.getContractAt("RWA_NFT", contracts.RWA_NFT, deployer);
  const oracle = await hre.ethers.getContractAt("RWA_Oracle", contracts.RWA_Oracle, deployer);
  const lendingPool = await hre.ethers.getContractAt("LendingPool", contracts.LendingPool, deployer);
  const vault = await hre.ethers.getContractAt("Vault", contracts.Vault, deployer);
  const liquidationManager = await hre.ethers.getContractAt("LiquidationManager", contracts.LiquidationManager, deployer);

  console.log("📝 Step 1: Mint USDC to users...");
  await mockUSDC.mint(user1.address, hre.ethers.parseUnits("100000", 6));
  await mockUSDC.mint(user2.address, hre.ethers.parseUnits("50000", 6));
  await mockUSDC.mint(user3.address, hre.ethers.parseUnits("75000", 6));
  console.log("   ✅ Minted USDC to all users\n");

  console.log("🎨 Step 2: Mint NFTs with prices...");
  // Mint NFTs to users
  await rwaToken.safeMint(user1.address, 0, "ipfs://QmExample1"); // tokenId 0
  await oracle.setAssetPrice(0, hre.ethers.parseUnits("50000", 6)); // $50,000
  console.log("   ✅ NFT #0 minted to User1 - Price: $50,000");

  await rwaToken.safeMint(user1.address, 1, "ipfs://QmExample2"); // tokenId 1
  await oracle.setAssetPrice(1, hre.ethers.parseUnits("100000", 6)); // $100,000
  console.log("   ✅ NFT #1 minted to User1 - Price: $100,000");

  await rwaToken.safeMint(user2.address, 2, "ipfs://QmExample3"); // tokenId 2
  await oracle.setAssetPrice(2, hre.ethers.parseUnits("75000", 6)); // $75,000
  console.log("   ✅ NFT #2 minted to User2 - Price: $75,000");

  await rwaToken.safeMint(user3.address, 3, "ipfs://QmExample4"); // tokenId 3
  await oracle.setAssetPrice(3, hre.ethers.parseUnits("60000", 6)); // $60,000
  console.log("   ✅ NFT #3 minted to User3 - Price: $60,000");

  await rwaToken.safeMint(user3.address, 4, "ipfs://QmExample5"); // tokenId 4
  await oracle.setAssetPrice(4, hre.ethers.parseUnits("80000", 6)); // $80,000
  console.log("   ✅ NFT #4 minted to User3 - Price: $80,000\n");

  console.log("💰 Step 3: Users supply USDC to lending pool...");
  // User1 supplies 50,000 USDC
  await mockUSDC.connect(user1).approve(contracts.LendingPool, hre.ethers.parseUnits("50000", 6));
  await lendingPool.connect(user1).deposit(hre.ethers.parseUnits("50000", 6));
  console.log("   ✅ User1 supplied $50,000 USDC");

  // User2 supplies 30,000 USDC
  await mockUSDC.connect(user2).approve(contracts.LendingPool, hre.ethers.parseUnits("30000", 6));
  await lendingPool.connect(user2).deposit(hre.ethers.parseUnits("30000", 6));
  console.log("   ✅ User2 supplied $30,000 USDC");

  // User3 supplies 20,000 USDC
  await mockUSDC.connect(user3).approve(contracts.LendingPool, hre.ethers.parseUnits("20000", 6));
  await lendingPool.connect(user3).deposit(hre.ethers.parseUnits("20000", 6));
  console.log("   ✅ User3 supplied $20,000 USDC\n");

  console.log("🔒 Step 4: Users deposit NFTs as collateral and borrow...");
  // User1 deposits NFT #0 and borrows
  await rwaToken.connect(user1).approve(contracts.Vault, 0);
  await vault.connect(user1).depositCollateral(0);
  console.log("   ✅ User1 deposited NFT #0 as collateral");
  await vault.connect(user1).borrow(0, hre.ethers.parseUnits("20000", 6));
  console.log("   ✅ User1 borrowed $20,000 USDC");

  // User2 deposits NFT #2 and borrows
  await rwaToken.connect(user2).approve(contracts.Vault, 2);
  await vault.connect(user2).depositCollateral(2);
  console.log("   ✅ User2 deposited NFT #2 as collateral");
  await vault.connect(user2).borrow(2, hre.ethers.parseUnits("30000", 6));
  console.log("   ✅ User2 borrowed $30,000 USDC");

  // User3 deposits NFT #3 and borrows
  await rwaToken.connect(user3).approve(contracts.Vault, 3);
  await vault.connect(user3).depositCollateral(3);
  console.log("   ✅ User3 deposited NFT #3 as collateral");
  await vault.connect(user3).borrow(3, hre.ethers.parseUnits("25000", 6));
  console.log("   ✅ User3 borrowed $25,000 USDC\n");

  console.log("💸 Step 5: User1 makes a partial repayment...");
  await mockUSDC.connect(user1).approve(contracts.Vault, hre.ethers.parseUnits("5000", 6));
  await vault.connect(user1).repay(0, hre.ethers.parseUnits("5000", 6));
  console.log("   ✅ User1 repaid $5,000 USDC\n");

  console.log("🔄 Step 6: User2 withdraws some USDC from lending pool...");
  await lendingPool.connect(user2).withdraw(hre.ethers.parseUnits("10000", 6));
  console.log("   ✅ User2 withdrew $10,000 USDC\n");

  console.log("🔨 Step 7: Create a liquidation scenario...");
  // Lower price of NFT #3 to trigger liquidation (price drops to $40k, debt is $25k, LTV > 60%)
  await oracle.setAssetPrice(3, hre.ethers.parseUnits("40000", 6));
  console.log("   ⚠️ NFT #3 price dropped to $40,000 (LTV now 62.5%)");
  
  // Start liquidation auction
  await liquidationManager.startAuction(3);
  console.log("   ✅ Liquidation auction started for NFT #3");

  // User1 places a bid
  await mockUSDC.connect(user1).approve(contracts.LiquidationManager, hre.ethers.parseUnits("26000", 6));
  await liquidationManager.connect(user1).bid(3, hre.ethers.parseUnits("26000", 6));
  console.log("   ✅ User1 bid $26,000 on NFT #3");

  // User2 places a higher bid
  await mockUSDC.connect(user2).approve(contracts.LiquidationManager, hre.ethers.parseUnits("28000", 6));
  await liquidationManager.connect(user2).bid(3, hre.ethers.parseUnits("28000", 6));
  console.log("   ✅ User2 bid $28,000 on NFT #3 (currently winning)\n");

  // Summary
  console.log("📊 Seed Data Summary:");
  console.log("=".repeat(60));
  console.log("\n💎 NFTs Minted: 5 total");
  console.log("   - NFT #0: $50,000 (User1 - Collateralized)");
  console.log("   - NFT #1: $100,000 (User1 - In wallet)");
  console.log("   - NFT #2: $75,000 (User2 - Collateralized)");
  console.log("   - NFT #3: $40,000 (User3 - In Liquidation)");
  console.log("   - NFT #4: $80,000 (User3 - In wallet)");

  console.log("\n💰 Lending Pool:");
  const poolBalance = await mockUSDC.balanceOf(contracts.LendingPool);
  console.log("   - Total Deposits: $" + hre.ethers.formatUnits(poolBalance, 6));
  console.log("   - User1 Deposit: $50,000");
  console.log("   - User2 Deposit: $20,000 (withdrew $10k)");
  console.log("   - User3 Deposit: $20,000");

  console.log("\n📤 Active Borrows:");
  console.log("   - User1: $15,000 (borrowed $20k, repaid $5k)");
  console.log("   - User2: $30,000");
  console.log("   - User3: $25,000 (in liquidation)");

  console.log("\n🔨 Active Auctions:");
  console.log("   - NFT #3: Current bid $28,000 by User2");

  console.log("\n📜 Total Transactions Created: ~25+");
  console.log("   - 5 NFT Mints");
  console.log("   - 5 Oracle Price Sets");
  console.log("   - 3 USDC Mints to users");
  console.log("   - 3 Supply transactions");
  console.log("   - 3 Collateral deposits");
  console.log("   - 3 Borrow transactions");
  console.log("   - 1 Repay transaction");
  console.log("   - 1 Withdraw transaction");
  console.log("   - 1 Liquidation start");
  console.log("   - 2 Auction bids");

  console.log("\n" + "=".repeat(60));
  console.log("✅ Seed data completed successfully!");
  console.log("\n💡 Tip: Check Transaction History page to see all activities!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
