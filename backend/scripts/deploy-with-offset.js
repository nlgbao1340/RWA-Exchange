const hre = require("hardhat");

async function main() {
  console.log("🚀 Bắt đầu deploy RWA Lending Platform (với nonce offset)...\n");

  // Lấy deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying với account:", deployer.address);
  console.log("💰 Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  
  // THÊM DUMMY TRANSACTION ĐỂ THAY ĐỔI NONCE - Tránh địa chỉ contract trùng với malicious address
  console.log("\n🔄 Sending dummy transactions to change nonce...");
  for (let i = 0; i < 3; i++) {
    const tx = await deployer.sendTransaction({
      to: deployer.address,
      value: hre.ethers.parseEther("0")
    });
    await tx.wait();
    console.log(`   Dummy tx ${i+1}/3: ${tx.hash}`);
  }
  console.log("✅ Nonce changed successfully\n");

  // 1. Deploy MockUSDC
  console.log("1️⃣ Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("✅ MockUSDC deployed to:", usdcAddress, "\n");

  // 2. Deploy RWA_NFT
  console.log("2️⃣ Deploying RWA_NFT...");
  const RWA_NFT = await hre.ethers.getContractFactory("RWA_NFT");
  const rwaToken = await RWA_NFT.deploy();
  await rwaToken.waitForDeployment();
  const nftAddress = await rwaToken.getAddress();
  console.log("✅ RWA_NFT deployed to:", nftAddress, "\n");

  // 3. Deploy RWA_Oracle
  console.log("3️⃣ Deploying RWA_Oracle...");
  const RWA_Oracle = await hre.ethers.getContractFactory("RWA_Oracle");
  const oracle = await RWA_Oracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("✅ RWA_Oracle deployed to:", oracleAddress, "\n");

  // 4. Deploy LendingPool
  console.log("4️⃣ Deploying LendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(usdcAddress);
  await lendingPool.waitForDeployment();
  const poolAddress = await lendingPool.getAddress();
  console.log("✅ LendingPool deployed to:", poolAddress, "\n");

  // 5. Deploy Vault
  console.log("5️⃣ Deploying Vault...");
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(nftAddress, usdcAddress, oracleAddress, poolAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("✅ Vault deployed to:", vaultAddress, "\n");

  // 6. Deploy LiquidationManager
  console.log("6️⃣ Deploying LiquidationManager...");
  const LiquidationManager = await hre.ethers.getContractFactory("LiquidationManager");
  const liquidationManager = await LiquidationManager.deploy(nftAddress, usdcAddress, oracleAddress, vaultAddress);
  await liquidationManager.waitForDeployment();
  const liquidationAddress = await liquidationManager.getAddress();
  console.log("✅ LiquidationManager deployed to:", liquidationAddress, "\n");

  // Setup permissions
  console.log("⚙️ Setting up permissions...");
  
  // Set Vault role in LendingPool
  await lendingPool.setVault(vaultAddress);
  console.log("✅ Vault role set in LendingPool");

  // Set Vault and LiquidationManager roles in RWA_NFT
  const VAULT_ROLE = await rwaToken.VAULT_ROLE();
  await rwaToken.grantRole(VAULT_ROLE, vaultAddress);
  await rwaToken.grantRole(VAULT_ROLE, liquidationAddress);
  console.log("✅ Vault roles granted in RWA_NFT");

  // Set LiquidationManager role in Vault
  await vault.setLiquidationManager(liquidationAddress);
  console.log("✅ LiquidationManager role set in Vault\n");

  // Mint initial test tokens
  console.log("💰 Minting test tokens...");
  await mockUSDC.mint(deployer.address, hre.ethers.parseUnits("1000000", 6));
  console.log("✅ Minted 1,000,000 USDC to deployer\n");

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      MockUSDC: usdcAddress,
      RWA_NFT: nftAddress,
      RWA_Oracle: oracleAddress,
      LendingPool: poolAddress,
      Vault: vaultAddress,
      LiquidationManager: liquidationAddress
    },
    timestamp: new Date().toISOString()
  };

  console.log("📋 Deployment Summary:");
  console.log("=".repeat(60));
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("=".repeat(60));

  // Save to file
  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "../deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n✅ Deployment info saved to deployments/" + hre.network.name + ".json");
  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
