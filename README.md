# 🏦 RWA Lending Platform - Hướng Dẫn Chạy Dự Án# 🏦 RWA Lending Platform



Chào mừng bạn đến với **RWA Lending Platform**! Đây là hướng dẫn chính thức để chạy dự án này trên máy local của bạn.Nền tảng Cho vay/Thế chấp Tài sản Thực (Real World Assets) - Full-stack DeFi Application



---## 📋 Tổng Quan



## ✅ Yêu Cầu Trước Khi ChạyDự án này là một nền tảng lending prototype cho phép:

- **Admin**: Mint NFT đại diện cho RWA và cập nhật giá trị

1. **Node.js**: Đã cài đặt (Khuyên dùng v18 hoặc v20 LTS).- **Lender**: Gửi USDC vào pool để tạo thanh khoản

2. **Git**: Đã cài đặt.- **Borrower**: Thế chấp NFT và vay USDC (LTV 60%)

3. **MetaMask**: Extension đã cài trên trình duyệt.- **Liquidator**: Tham gia đấu giá thanh lý các khoản vay không an toàn

4. **Terminal**: Git Bash (Windows) hoặc Terminal (Mac/Linux).

## 🛠️ Tech Stack

---

### Backend (Smart Contracts)

## 🚀 Cách 1: Chạy Tự Động (Khuyên Dùng)- **Solidity** 0.8.20

- **Hardhat** - Development environment

Chúng tôi đã chuẩn bị các script tự động để bạn không phải gõ nhiều lệnh.- **OpenZeppelin** - Secure contract libraries

- **Ethers.js** - Blockchain interaction

### Trên Windows (Git Bash) hoặc Linux/Mac

### Frontend

1. Mở terminal tại thư mục dự án.- **React** 18.2 - UI framework

2. Chạy lệnh:- **Vite** - Build tool

- **TailwindCSS** - Styling

```bash- **Ethers.js v6** - Web3 provider

./run.sh- **React Router** - Navigation

```

## 📁 Cấu Trúc Dự Án

3. Chọn **[1] FULL RESET** (nếu chạy lần đầu hoặc gặp lỗi).

4. Sau đó chọn **[2] QUICK START**.```

   - Script sẽ tự động mở 3 cửa sổ terminal riêng biệt cho: Node, Deploy/Seed, và Frontend.RWA-Exchange/

├── backend/

### Trên Windows (Command Prompt)│   ├── contracts/

│   │   ├── tokens/

1. Double-click vào file `RUN.bat`.│   │   │   ├── RWA_NFT.sol           # ERC-721 NFT

2. Làm theo hướng dẫn trên màn hình tương tự như trên.│   │   │   └── MockUSDC.sol          # ERC-20 Token

│   │   ├── oracles/

---│   │   │   └── RWA_Oracle.sol        # Price Oracle

│   │   └── core/

## 🛠️ Cách 2: Chạy Thủ Công (Từng Bước)│   │       ├── LendingPool.sol       # Liquidity Pool

│   │       ├── Vault.sol             # Collateral & Borrow

Nếu bạn muốn kiểm soát từng bước, hãy làm theo trình tự sau:│   │       └── LiquidationManager.sol # Auction System

│   ├── scripts/

### Bước 1: Reset & Cài Đặt (Lần đầu)│   │   └── deploy.js                 # Deployment script

│   ├── test/

```bash│   │   └── RWALending.test.js        # Unit tests

# Cài đặt dependencies│   ├── hardhat.config.js

cd backend && npm install│   └── package.json

cd ../frontend && npm install│

└── frontend/

# Quay lại thư mục gốc    ├── src/

cd ..    │   ├── components/

```    │   │   └── Navbar.jsx

    │   ├── pages/

### Bước 2: Khởi động Blockchain (Terminal 1)    │   │   ├── Home.jsx

    │   │   ├── AdminMint.jsx

Mở một terminal mới và chạy:    │   │   ├── LenderPool.jsx

    │   │   ├── BorrowerDashboard.jsx

```bash    │   │   └── Auctions.jsx

cd backend    │   ├── config/

npm run node    │   │   └── contracts.js          # Contract addresses

```    │   ├── abis/                     # Contract ABIs

    │   ├── App.jsx

> **Đợi** đến khi thấy dòng: `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`    │   ├── main.jsx

    │   └── index.css

### Bước 3: Deploy & Tạo Dữ Liệu Mẫu (Terminal 2)    ├── index.html

    ├── vite.config.js

Mở một terminal **khác** và chạy:    ├── tailwind.config.js

    └── package.json

```bash```

cd backend

## 🚀 Hướng Dẫn Cài Đặt & Chạy

# Deploy smart contracts

npm run deploy### ✅ Yêu Cầu Hệ Thống



# Tạo dữ liệu mẫu (Transactions, Users, NFTs...)- **Node.js**: v18 trở lên ([Download](https://nodejs.org/))

npm run seed- **MetaMask**: Extension cho trình duyệt ([Download](https://metamask.io/))

```- **Git**: Để clone repository (optional)



### Bước 4: Khởi động Frontend (Terminal 3)### 📦 Bước 1: Cài Đặt Backend



Mở một terminal **thứ 3** và chạy:```powershell

# Di chuyển vào thư mục backend

```bashcd backend

cd frontend

npm run dev# Cài đặt dependencies

```npm install



> Truy cập: `http://localhost:3000` (hoặc port hiển thị trên màn hình)# Compile smart contracts

npx hardhat compile

---```



## 🦊 Cấu Hình MetaMask (Quan Trọng)**Expected Output:**

```

Để tương tác với ứng dụng, bạn cần cấu hình MetaMask kết nối với Local Blockchain.Compiled 15 Solidity files successfully

```

### 1. Thêm Mạng Hardhat Local

### 🔧 Bước 2: Chạy Local Blockchain

- Mở MetaMask → Click vào tên mạng (góc trên trái) → **Add network**.

- Chọn **Add a network manually** và điền:**Mở Terminal 1** và chạy:

  - **Network name**: `Hardhat Local`

  - **New RPC URL**: `http://127.0.0.1:8545````powershell

  - **Chain ID**: `31337`cd backend

  - **Currency symbol**: `ETH`npx hardhat node

- Click **Save**.```



### 2. Import Tài Khoản Test**Expected Output:**

- 20 test accounts với private keys

Sử dụng Private Key của Account #1 (User) để test:- RPC server chạy tại `http://127.0.0.1:8545`

- Chain ID: `31337`

- **Private Key**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

- **Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`**⚠️ Lưu ý**: Giữ Terminal 1 mở trong suốt quá trình development!



> **Cách làm**: MetaMask → Click icon tròn (Account) → **Import account** → Dán Private Key.### 📝 Bước 3: Deploy Smart Contracts



### 3. Xử Lý Lỗi Cache (Nếu thấy Transaction cũ/sai)**Mở Terminal 2** và chạy:



Nếu bạn thấy Transaction History hiển thị block number lạ (ví dụ: 23 triệu) hoặc lỗi nonce:```powershell

cd backend

1. Mở MetaMask.npx hardhat run scripts/deploy.js --network localhost

2. Vào **Settings** → **Advanced**.```

3. Click **Clear activity tab data**.

4. Reload lại trang web.**Expected Output:**

```

---🚀 Bắt đầu deploy RWA Lending Platform...



## 🐞 Khắc Phục Lỗi Thường Gặp✅ MockUSDC deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

✅ RWA_NFT deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

| Lỗi | Nguyên nhân | Cách sửa |✅ RWA_Oracle deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

|---|---|---|✅ LendingPool deployed to: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

| **Cannot connect to network localhost** | Hardhat Node chưa chạy | Kiểm tra Terminal 1, chạy lại `npm run node` |✅ Vault deployed to: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

| **Transaction History trống trơn** | Chưa chạy seed hoặc MetaMask cache cũ | 1. Clear MetaMask cache<br>2. Chạy `npm run seed` ở backend |✅ LiquidationManager deployed to: 0x5FC8d32690cc91D4c39d9d3abcBD16989F875707

| **MetaMask báo "Malicious address"** | Địa chỉ contract ngẫu nhiên trùng blacklist | Click "I want to proceed anyway" (An toàn trên localhost) |

| **Node.js Assertion failed** | Node v25 chưa tương thích tốt | Dùng Node v18 hoặc v20, hoặc cứ để chạy tiếp (thường vẫn thành công) |✅ Config file saved to: ./deployments/localhost.json

```

---

**🔑 Lưu lại các địa chỉ contract này!**

## 📂 Cấu Trúc Dự Án

### 🎨 Bước 4: Cài Đặt Frontend

- **backend/**: Chứa Smart Contracts (Hardhat).

  - `contracts/`: Mã nguồn Solidity.**Mở Terminal 3**:

  - `scripts/`: Script deploy và seed data.

- **frontend/**: Chứa giao diện Web (React + Vite).```powershell

  - `src/pages/`: Các trang chính (Home, Admin, Lender, Borrower, History).cd frontend

  - `src/config/`: Cấu hình địa chỉ Contract.npm install

```

---

### ⚙️ Bước 5: Cấu Hình Frontend

**Chúc bạn thành công! 🚀**

#### 5.1. Copy Contract Addresses

Mở file `backend/deployments/localhost.json` và copy nội dung.

Sau đó mở `frontend/src/config/contracts.js` và paste các địa chỉ:

```javascript
export const CONTRACTS = {
  MockUSDC: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  RWA_NFT: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  RWA_Oracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  LendingPool: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  Vault: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  LiquidationManager: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
};
```

#### 5.2. Copy Contract ABIs

Tạo thư mục `frontend/src/abis/` nếu chưa có:

```powershell
mkdir frontend\src\abis
```

Copy các file ABI từ backend:

```powershell
# Copy ABIs
copy backend\artifacts\contracts\tokens\MockUSDC.sol\MockUSDC.json frontend\src\abis\
copy backend\artifacts\contracts\tokens\RWA_NFT.sol\RWA_NFT.json frontend\src\abis\
copy backend\artifacts\contracts\oracles\RWA_Oracle.sol\RWA_Oracle.json frontend\src\abis\
copy backend\artifacts\contracts\core\LendingPool.sol\LendingPool.json frontend\src\abis\
copy backend\artifacts\contracts\core\Vault.sol\Vault.json frontend\src\abis\
copy backend\artifacts\contracts\core\LiquidationManager.sol\LiquidationManager.json frontend\src\abis\
```

### 🦊 Bước 6: Cấu Hình MetaMask

#### 6.1. Thêm Hardhat Local Network

1. Mở MetaMask
2. Click vào network dropdown (phía trên)
3. Click **"Add Network"** → **"Add a network manually"**
4. Điền thông tin:
   - **Network Name**: `Hardhat Local`
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
5. Click **"Save"**

#### 6.2. Import Test Account

1. Quay lại **Terminal 1** (nơi chạy `npx hardhat node`)
2. Copy **Private Key** của Account #0 (hoặc bất kỳ account nào)
   ```
   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   ```
3. Trong MetaMask:
   - Click vào icon account (phía trên bên phải)
   - **"Import Account"**
   - Paste Private Key
   - Click **"Import"**

**✅ Bạn sẽ thấy account có 10,000 ETH!**

### 🌐 Bước 7: Chạy Frontend

Trong **Terminal 3**:

```powershell
cd frontend
npm run dev
```

**Expected Output:**
```
  VITE v5.0.11  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

Trình duyệt sẽ tự động mở tại `http://localhost:3000`

### 🎉 Hoàn Tất!

Bây giờ bạn có thể:
1. Click **"Connect Wallet"** trên Navbar
2. Approve connection trong MetaMask
3. Bắt đầu sử dụng nền tảng!

---

## 📖 Hướng Dẫn Sử Dụng

### 👨‍💼 Admin Panel

**URL**: `/admin`

**Chức năng**:
1. **Mint NFT**:
   - Token ID: `1`, `2`, `3`...
   - Recipient: Địa chỉ ví của borrower
   - Metadata URI: `ipfs://example-metadata-1`

2. **Set Asset Price**:
   - Token ID: ID của NFT đã mint
   - Price: Ví dụ `100000` ($100,000)

**Example Workflow**:
```
1. Mint NFT #1 cho địa chỉ 0xAbc...
2. Set Price cho NFT #1 = 100000
3. Borrower giờ có thể dùng NFT #1 để vay
```

### 💰 Lender Pool

**URL**: `/lender`

**Chức năng**:
1. **Faucet**: Nhận 1,000 USDC miễn phí
2. **Deposit**: Gửi USDC vào pool (approve trước)
3. **Withdraw**: Rút USDC từ pool

**Example Workflow**:
```
1. Click "Claim 1,000 USDC"
2. Nhập amount: 500
3. Click "Deposit"
4. Approve trong MetaMask
5. Chờ transaction confirm
```

### 🏠 Borrower Dashboard

**URL**: `/borrower`

**Chức năng**:
1. **Deposit Collateral**: Thế chấp NFT vào Vault
2. **Borrow**: Vay USDC (tối đa 60% giá trị NFT)
3. **Repay**: Trả nợ
4. **Withdraw Collateral**: Rút NFT về (sau khi trả hết nợ)

**Example Workflow**:
```
1. Có NFT #1 trị giá $100,000
2. Click "Deposit as Collateral"
3. NFT chuyển vào Vault
4. Nhập amount: 40000 (40% < 60% LTV)
5. Click "Borrow"
6. Nhận 40,000 USDC vào ví
```

**LTV Calculation**:
- Asset Value: $100,000
- Max Borrow (60%): $60,000
- Current Debt: $40,000
- Available: $20,000
- Utilization: 66.67%

### ⚖️ Auctions

**URL**: `/auctions`

**Chức năng**:
1. **View Active Auctions**: Xem các đấu giá đang diễn ra
2. **Place Bid**: Đặt giá (tối thiểu +5% so với giá hiện tại)
3. **End Auction**: Kết thúc đấu giá (sau 3 ngày)

**Example Liquidation Flow**:
```
1. Borrower vay $40k với NFT trị giá $100k
2. Giá NFT giảm xuống $50k
3. LTV limit: $30k (60% của $50k)
4. Debt: $40k > $30k → Unhealthy
5. Ai đó start auction
6. Bidders đặt giá (tối thiểu $40k)
7. Sau 3 ngày, highest bidder thắng
8. $40k trả nợ, phần dư trả cho borrower, NFT cho winner
```

---

## 🐞 Hướng Dẫn Debug

### 🔍 Debug Smart Contracts

#### 1. Sử dụng Console.log

Thêm vào contract:

```solidity
import "hardhat/console.sol";

function borrow(uint256 tokenId, uint256 amount) external {
    uint256 assetPrice = oracle.getAssetPrice(tokenId);
    console.log("Asset Price:", assetPrice);
    console.log("Borrow Amount:", amount);
    // ...
}
```

Output sẽ hiện trong **Terminal 1** (hardhat node).

#### 2. Viết Unit Tests

Chạy tests:

```powershell
cd backend
npx hardhat test
```

Chạy test cụ thể:

```powershell
npx hardhat test --grep "Should allow borrower to borrow"
```

#### 3. Kiểm Tra Transaction Failed

Nếu transaction revert:
1. Xem chi tiết lỗi trong Console của MetaMask
2. Kiểm tra `require()` statements trong contract
3. Common errors:
   - `"Exceeds borrowing limit"` → Vay quá nhiều
   - `"Insufficient liquidity"` → Pool không đủ USDC
   - `"ERC20: insufficient allowance"` → Chưa approve

### 🌐 Debug Frontend

#### 1. Browser Console

Mở Developer Tools (F12) → Console tab

Các log từ React component sẽ hiện ở đây.

#### 2. Common Issues

**"Transaction Failed"**:
- Kiểm tra đã approve token chưa (USDC, NFT)
- Kiểm tra balance đủ không
- Kiểm tra gas limit

**"Contract Address Error"**:
- Verify địa chỉ trong `config/contracts.js`
- Verify ABIs đã copy đúng

**"MetaMask Not Connected"**:
- Reload page
- Reconnect wallet
- Kiểm tra network = Hardhat Local

#### 3. React Developer Tools

Install extension: [React DevTools](https://react.dev/learn/react-developer-tools)

Xem state và props của components.

### 🔄 Reset Environment

Nếu có lỗi lạ, reset lại từ đầu:

```powershell
# Stop hardhat node (Ctrl+C trong Terminal 1)
# Restart hardhat node
cd backend
npx hardhat node

# Redeploy (Terminal 2)
npx hardhat run scripts/deploy.js --network localhost

# Update contract addresses trong frontend/src/config/contracts.js

# Restart frontend (Terminal 3)
cd frontend
npm run dev
```

**Reset MetaMask**:
1. Settings → Advanced → Clear activity tab data
2. Hoặc delete và re-import account

---

## 🧪 Testing

### Run All Tests

```powershell
cd backend
npx hardhat test
```

### Expected Output

```
  RWA Lending Platform Tests
    1. Token Tests
      ✔ Should mint NFT correctly
      ✔ Should mint USDC correctly
    2. Oracle Tests
      ✔ Should set and get asset price
      ✔ Should reject non-owner setting price
    3. LendingPool Tests
      ✔ Should allow lender to deposit
      ✔ Should allow lender to withdraw
    4. Vault Tests - Borrow Flow
      ✔ Should allow borrower to deposit collateral
      ✔ Should allow borrower to borrow
      ✔ Should not allow borrowing more than LTV
      ✔ Should allow borrower to repay
      ✔ Should allow borrower to withdraw collateral after repaying
    5. LiquidationManager Tests
      ✔ Should check health correctly - healthy position
      ✔ Should check health correctly - unhealthy position
      ✔ Should start auction for unhealthy position
      ✔ Should not start auction for healthy position
    6. Full Liquidation Flow
      ✔ Should complete full auction and liquidation

  15 passing (5s)
```

### Coverage (Optional)

```powershell
npm install --save-dev solidity-coverage
npx hardhat coverage
```

---

## 📚 Kiến Trúc Chi Tiết

### Smart Contracts

#### 1. RWA_NFT.sol
- **Type**: ERC-721
- **Owner**: Admin
- **Functions**:
  - `safeMint(address to, uint256 tokenId, string uri)`: Mint NFT

#### 2. MockUSDC.sol
- **Type**: ERC-20
- **Decimals**: 6
- **Functions**:
  - `mint(address to, uint256 amount)`: Public faucet

#### 3. RWA_Oracle.sol
- **Owner**: Admin
- **Storage**: `mapping(tokenId => price)`
- **Functions**:
  - `setAssetPrice(uint256 tokenId, uint256 price)`: Update price
  - `getAssetPrice(uint256 tokenId)`: Get price

#### 4. LendingPool.sol
- **Storage**: USDC balance, deposits mapping
- **Functions**:
  - `deposit(uint256 amount)`: Lender deposits
  - `withdraw(uint256 amount)`: Lender withdraws
  - `lend(address borrower, uint256 amount)`: Vault calls this
  - `repayLoan(uint256 amount)`: Receive repayment

#### 5. Vault.sol
- **Storage**: `mapping(tokenId => Position)`
- **Position**: `{ owner, debt, tokenId, active }`
- **LTV**: 60%
- **Functions**:
  - `depositCollateral(uint256 tokenId)`: Lock NFT
  - `borrow(uint256 tokenId, uint256 amount)`: Borrow USDC
  - `repay(uint256 tokenId, uint256 amount)`: Repay debt
  - `withdrawCollateral(uint256 tokenId)`: Unlock NFT

#### 6. LiquidationManager.sol
- **Storage**: `mapping(tokenId => Auction)`
- **Auction**: `{ tokenId, highestBidder, highestBid, endTime, active }`
- **Duration**: 3 days
- **Functions**:
  - `checkHealth(uint256 tokenId)`: Returns true/false
  - `startAuction(uint256 tokenId)`: Begin auction
  - `bid(uint256 tokenId, uint256 amount)`: Place bid
  - `endAuction(uint256 tokenId)`: Finalize auction

### Flow Diagrams

#### Borrow Flow
```
User → depositCollateral(NFT) → Vault
User → borrow(amount) → Vault → checkOracle → checkLTV → LendingPool.lend() → User receives USDC
```

#### Liquidation Flow
```
Anyone → checkHealth() → false → startAuction()
Bidders → bid() → 3 days pass
Anyone → endAuction() → repay debt → transfer surplus → transfer NFT to winner
```

---

## 🔐 Security Considerations

**⚠️ ĐÂY LÀ PROTOTYPE - KHÔNG SỬ DỤNG TRONG PRODUCTION!**

Các vấn đề cần xử lý trước khi production:
1. **Oracle Security**: Dùng Chainlink Price Feeds thay vì Oracle tập trung
2. **Access Control**: Thêm multi-sig cho Admin functions
3. **Reentrancy**: Implement ReentrancyGuard
4. **Interest Rate**: Thêm tính lãi suất cho vay
5. **aTokens**: Implement receipt tokens cho Lenders
6. **Gas Optimization**: Tối ưu loops trong BorrowerDashboard
7. **Audit**: Audit toàn bộ smart contracts

---

## 📞 Troubleshooting

### ❌ "Cannot find module 'hardhat'"
```powershell
cd backend
npm install
```

### ❌ "Error: could not detect network"
- Kiểm tra Terminal 1 (hardhat node) đang chạy
- Kiểm tra RPC URL: `http://127.0.0.1:8545`

### ❌ "Transaction Failed: Cannot read properties of undefined"
- Copy lại ABIs vào frontend/src/abis/
- Update contract addresses trong config/contracts.js

### ❌ "MetaMask: User rejected transaction"
- User click "Reject" → Click lại button và approve

### ❌ "Insufficient funds for gas"
- Import account có đủ ETH từ hardhat node

---

## 🎓 Học Thêm

### Resources
- [Hardhat Docs](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Ethers.js v6](https://docs.ethers.org/v6/)
- [React Router](https://reactrouter.com/)
- [TailwindCSS](https://tailwindcss.com/)

### Next Steps
1. Thêm Interest Rate cho vay
2. Implement aTokens cho Lenders
3. Thêm Multiple Collateral Support
4. Deploy lên Testnet (Sepolia, Mumbai)
5. Integrate Chainlink Price Feeds
6. Thêm Governance Token

---

## 📄 License

MIT License - Dự án này được tạo ra cho mục đích học tập và nghiên cứu.

---

## 👨‍💻 Contributors

Tạo bởi GitHub Copilot - AI Assistant

---

**🎉 Chúc bạn thành công với dự án RWA Lending Platform!**

Nếu có câu hỏi, vui lòng mở Issue trên GitHub hoặc liên hệ qua email.
