const hre = require("hardhat");

async function main() {
  console.log("🚀 Bắt đầu deploy RWA Lending Platform...\n");

  // Lấy deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying với account:", deployer.address);
  console.log("💰 Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

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
  const liquidationManager = await LiquidationManager.deploy(
    vaultAddress,
    oracleAddress,
    usdcAddress,
    poolAddress
  );
  await liquidationManager.waitForDeployment();
  const liquidationAddress = await liquidationManager.getAddress();
  console.log("✅ LiquidationManager deployed to:", liquidationAddress, "\n");

  // 7. Liên kết các contracts
  console.log("7️⃣ Liên kết các contracts...");
  
  // Set Vault trong LendingPool
  const setVaultTx = await lendingPool.setVault(vaultAddress);
  await setVaultTx.wait();
  console.log("✅ LendingPool.setVault() completed");

  // Set LiquidationManager trong Vault
  const setLiquidationTx = await vault.setLiquidationManager(liquidationAddress);
  await setLiquidationTx.wait();
  console.log("✅ Vault.setLiquidationManager() completed\n");

  // 8. In ra tất cả địa chỉ
  console.log("=" . repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETED!");
  console.log("=" . repeat(60));
  console.log("\n📋 Contract Addresses:\n");
  console.log("MockUSDC:           ", usdcAddress);
  console.log("RWA_NFT:            ", nftAddress);
  console.log("RWA_Oracle:         ", oracleAddress);
  console.log("LendingPool:        ", poolAddress);
  console.log("Vault:              ", vaultAddress);
  console.log("LiquidationManager: ", liquidationAddress);
  console.log("\n" + "=" . repeat(60));

  // 9. Tạo file config.json cho frontend
  const fs = require('fs');
  const config = {
    contracts: {
      MockUSDC: usdcAddress,
      RWA_NFT: nftAddress,
      RWA_Oracle: oracleAddress,
      LendingPool: poolAddress,
      Vault: vaultAddress,
      LiquidationManager: liquidationAddress
    },
    network: {
      chainId: 31337,
      name: "Hardhat Local"
    }
  };

  // Tạo thư mục nếu chưa có
  if (!fs.existsSync('./deployments')) {
    fs.mkdirSync('./deployments');
  }

  fs.writeFileSync(
    './deployments/localhost.json',
    JSON.stringify(config, null, 2)
  );
  console.log("\n✅ Config file saved to: ./deployments/localhost.json");
  console.log("📝 Copy file này vào frontend/src/config/contracts.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
