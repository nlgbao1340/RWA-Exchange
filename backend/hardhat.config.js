require("@nomicfoundation/hardhat-toolbox");

//Add this
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    localhost: {
      url: process.env.RPC_URL || "http://127.0.0.1:8545",
      chainId: 31337
    },
    // Public testnet (this is the "internet" deployment)
    // Steps:
    // 1) Put PRIVATE_KEY and ALCHEMY_API_KEY in backend/.env
    // 2) Get some Sepolia ETH to the account for gas
    // 3) Deploy with: npx hardhat run scripts/deploy.js --network sepolia
    sepolia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        (process.env.ALCHEMY_API_KEY
          ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
          : ""),
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111
    }
  },

  // Optional: lets Hardhat verify on Etherscan if you set ETHERSCAN_API_KEY in .env
  // You can remove this block if you don't plan to verify.
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || ""
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};

