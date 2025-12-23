const hre = require("hardhat");

async function main() {
  console.log(" B?t d?u deploy RWA Lending Platform...\n");

  // L?y deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(" Deploying v?i account:", deployer.address);
  console.log(" Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // 1. Deploy MockUSDC
  console.log("1 Deploying MockUSDC...");
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log(" MockUSDC deployed to:", usdcAddress, "\n");

  // 2. Deploy RWA_NFT
  console.log("2 Deploying RWA_NFT...");
  const RWA_NFT = await hre.ethers.getContractFactory("RWA_NFT");
  const rwaToken = await RWA_NFT.deploy();
  await rwaToken.waitForDeployment();
  const nftAddress = await rwaToken.getAddress();
  console.log(" RWA_NFT deployed to:", nftAddress, "\n");

  // 3. Deploy RWA_Oracle
  console.log("3 Deploying RWA_Oracle...");
  const RWA_Oracle = await hre.ethers.getContractFactory("RWA_Oracle");
  const oracle = await RWA_Oracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(" RWA_Oracle deployed to:", oracleAddress, "\n");

  // 4. Deploy LendingPool
  console.log("4 Deploying LendingPool...");
  const LendingPool = await hre.ethers.getContractFactory("LendingPool");
  const lendingPool = await LendingPool.deploy(usdcAddress);
  await lendingPool.waitForDeployment();
  const poolAddress = await lendingPool.getAddress();
  console.log(" LendingPool deployed to:", poolAddress, "\n");

  // 5. Deploy Vault
  console.log("5 Deploying Vault...");
  const Vault = await hre.ethers.getContractFactory("Vault");
  const vault = await Vault.deploy(nftAddress, usdcAddress, oracleAddress, poolAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(" Vault deployed to:", vaultAddress, "\n");

  // 6. Deploy LiquidationManager
  console.log("6 Deploying LiquidationManager...");
  const LiquidationManager = await hre.ethers.getContractFactory("LiquidationManager");
  const liquidationManager = await LiquidationManager.deploy(
    vaultAddress,
    oracleAddress,
    usdcAddress,
    poolAddress
  );
  await liquidationManager.waitForDeployment();
  const liquidationAddress = await liquidationManager.getAddress();
  console.log(" LiquidationManager deployed to:", liquidationAddress, "\n");

  // 7. Li�n k?t c�c contracts
  console.log("7 Li�n k?t c�c contracts...");
  
  // Set Vault trong LendingPool
  const setVaultTx = await lendingPool.setVault(vaultAddress);
  await setVaultTx.wait();
  console.log(" LendingPool.setVault() completed");

  // Set LiquidationManager trong Vault
  const setLiquidationTx = await vault.setLiquidationManager(liquidationAddress);
  await setLiquidationTx.wait();
  console.log(" Vault.setLiquidationManager() completed\n");

  // 8. In ra t?t c? d?a ch?
  console.log("=" . repeat(60));
  console.log(" DEPLOYMENT COMPLETED!");
  console.log("=" . repeat(60));
  console.log("\n Contract Addresses:\n");
  console.log("MockUSDC:           ", usdcAddress);
  console.log("RWA_NFT:            ", nftAddress);
  console.log("RWA_Oracle:         ", oracleAddress);
  console.log("LendingPool:        ", poolAddress);
  console.log("Vault:              ", vaultAddress);
  console.log("LiquidationManager: ", liquidationAddress);
  console.log("\n" + "=" . repeat(60));

  // 9. Update frontend config
  const fs = require('fs');
  const path = require('path');
  
  const contractsContent = ` // Contract addresses - Updated after deployment

export const CONTRACTS = {
  MockUSDC: "${usdcAddress}",
  RWA_NFT: "${nftAddress}",
  RWA_Oracle: "${oracleAddress}",
  LendingPool: "${poolAddress}",
  Vault: "${vaultAddress}",
  LiquidationManager: "${liquidationAddress}"
};

export const NETWORK = {
  chainId: 31337,
  name: "Hardhat Local",
  rpcUrl: "${process.env.BROWSER_RPC_URL || 'http://127.0.0.1:8545'}"
};
` ;

  const configPath = process.env.FRONTEND_CONFIG_PATH || path.join(__dirname, '../../frontend/src/config/contracts.js');
  
  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, contractsContent);
    console.log(` \n Config file saved to: ${configPath}` );
  } catch (error) {
    console.error(` \n Failed to save config file to ${configPath}:` , error.message);
    // Fallback to local file if cross-volume write fails
    if (!fs.existsSync('./deployments')) {
        fs.mkdirSync('./deployments');
    }
    fs.writeFileSync('./deployments/localhost.js', contractsContent);
    console.log("Saved to ./deployments/localhost.js instead.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
