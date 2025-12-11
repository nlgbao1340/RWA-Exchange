const hre = require("hardhat");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

async function main() {
  console.log("🚀 Full Setup: Deploy + Seed Data\n");
  console.log("=".repeat(60));

  try {
    // Step 1: Deploy contracts
    console.log("\n📦 Step 1: Deploying contracts...\n");
    await execPromise("npx hardhat run scripts/deploy.js --network localhost");
    console.log("✅ Contracts deployed successfully\n");

    // Wait a bit for deployment to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Seed data
    console.log("🌱 Step 2: Seeding sample data...\n");
    await execPromise("npx hardhat run scripts/seed-data.js --network localhost");
    console.log("✅ Data seeded successfully\n");

    console.log("=".repeat(60));
    console.log("🎉 Full setup completed!");
    console.log("\n📝 Next steps:");
    console.log("   1. Start frontend: cd frontend && npm run dev");
    console.log("   2. Import test accounts to MetaMask");
    console.log("   3. Check Transaction History page");
    console.log("\n💡 Default test accounts (from Hardhat):");
    console.log("   Account #0 (Deployer): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
    console.log("   Account #1 (User1): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    console.log("   Account #2 (User2): 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
    console.log("   Account #3 (User3): 0x90F79bf6EB2c4f870365E785982E1f101E93b906");
    console.log("\n🔑 Private keys are in Hardhat default accounts");
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
