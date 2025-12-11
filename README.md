# 🚀 HƯỚNG DẪN CHẠY DỰ ÁN RWA LENDING PLATFORM

## ✅ YÊU CẦU TRƯỚC KHI CHẠY

1. ✅ Node.js đã cài đặt
2. ✅ MetaMask extension đã cài đặt trên browser
3. ✅ Đã chạy `npm install` trong cả 2 thư mục `backend` và `frontend`

---

## 🔄 BƯỚC 1: RESET VÀ XÓA CACHE (Nếu đã chạy trước đó)

### 1.1. Kill tất cả Node.js processes
```bash
taskkill //F //IM node.exe
```

### 1.2. Xóa cache và blockchain data cũ
```bash
cd backend
rm -rf cache artifacts deployments/localhost.json node_modules/.cache
```

### 1.3. Reset MetaMask (QUAN TRỌNG!)
1. Mở MetaMask
2. **Settings** → **Advanced**
3. Kéo xuống, click **"Clear activity tab data"**
4. Đóng và mở lại MetaMask

---

## 🎯 BƯỚC 2: CHẠY DỰ ÁN

### Terminal 1: Khởi động Hardhat Node
```bash
cd backend
npm run node
```

**Đợi thấy message:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

### Terminal 2: Deploy Contracts và Seed Data
**Đợi 5-10 giây sau khi Terminal 1 khởi động xong**

```bash
cd backend

# Deploy contracts
npm run deploy

# Seed sample data
npm run seed
```

**Kết quả mong đợi:**
- ✅ Deploy thành công 6 contracts
- ✅ Seed ~25+ transactions
- ✅ Exit code: 0

### Terminal 3: Khởi động Frontend
```bash
cd frontend
npm run dev
```

**Frontend sẽ chạy tại:** `http://localhost:3000` hoặc `http://localhost:3001`

---

## 🔧 BƯỚC 3: CẤU HÌNH METAMASK

### 3.1. Thêm Hardhat Network vào MetaMask

1. Mở MetaMask
2. Click dropdown network → **Add Network** → **Add a network manually**
3. Điền thông tin:
   - **Network Name:** `Hardhat Local`
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** `ETH`
4. Click **Save**

### 3.2. Import Test Account

Chọn một trong các account test từ Hardhat (có trong Terminal 1):

**Account #1 (User 1):**
- Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

**Cách import:**
1. MetaMask → Click icon account → **Import Account**
2. Dán private key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
3. Click **Import**

### 3.3. Chuyển sang Hardhat Network
1. Click dropdown network trong MetaMask
2. Chọn **Hardhat Local**

---

## 🎨 BƯỚC 4: SỬ DỤNG ỨNG DỤNG

### 4.1. Mở Browser
Truy cập: `http://localhost:3000` hoặc `http://localhost:3001`

### 4.2. Connect Wallet
- Click **"Connect Wallet"** ở góc phải
- Chọn account đã import
- Approve connection

### 4.3. Các trang có thể truy cập:

1. **🏠 Home** - Trang chủ với tổng quan
2. **👨‍💼 Admin** - Mint NFTs (chỉ deployer)
3. **💰 Supply** - Gửi USDC vào lending pool
4. **📤 Borrow** - Thế chấp NFT để vay USDC
5. **🔨 Auctions** - Đấu giá NFTs bị thanh lý
6. **📜 History** - Lịch sử tất cả transactions trên blockchain

---

## ✅ KIỂM TRA HOẠT ĐỘNG

### Transaction History Page

1. Vào tab **History** (📜)
2. Mở Console (F12)
3. Kiểm tra logs:

**Logs mong đợi:**
```
[App] Read-only provider initialized
[TransactionHistory] loadTransactions called
Loading all transactions from blockchain...
Latest block: 45  ← SỐ NHỎ (40-50), KHÔNG PHẢI HÀNG TRIỆU!
USDC Transfers: 15
NFT Transfers: 10
Deposits: 3
Borrows: 3
...
Total transactions loaded: 25+
```

### Nếu thấy "Latest block: 23964xxx" (số lớn)
➡️ **MetaMask đang cache blockchain cũ!**

**Giải pháp:**
1. MetaMask → Settings → Advanced → **Clear activity tab data**
2. Hoặc: Xóa network "Hardhat Local" và thêm lại
3. Reload trang

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi 1: "Cannot connect to network localhost"
**Nguyên nhân:** Node chưa khởi động hoặc đã crash

**Giải pháp:**
```bash
taskkill //F //IM node.exe
cd backend
npm run node
```

### Lỗi 2: "Transaction History shows 0 transactions"
**Nguyên nhân:** 
- MetaMask cache blockchain cũ
- Hoặc seed script chưa chạy

**Giải pháp:**
1. Clear MetaMask activity data
2. Chạy lại `npm run seed` trong backend
3. Reload trang frontend

### Lỗi 3: "MetaMask: This is a malicious request"
**Nguyên nhân:** Contract address trùng với address bị blacklist trên mainnet

**Giải pháp:** 
- Click **"I want to proceed anyway"** 
- Đây là false positive, an toàn trên localhost

### Lỗi 4: Node.js v25 "Assertion failed"
**Nguyên nhân:** Node.js v25 không tương thích với Hardhat

**Giải pháp:**
- Downgrade Node.js xuống v20 LTS
- Hoặc bỏ qua warning (operations vẫn thành công)

---

## 📊 THÔNG TIN HỮU ÍCH

### Contract Addresses (sau khi deploy)
Xem trong file: `backend/deployments/localhost.json`

### Test Accounts
```
Account #0 (Deployer): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account #1 (User1):    0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Account #2 (User2):    0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Account #3 (User3):    0x90F79bf6EB2c4f870365E785982E1f101E93b906
```

### Seed Data Summary
- 5 NFTs được mint
- 3 users có USDC
- 3 deposits vào lending pool
- 3 borrows với NFT collateral
- 1 repayment
- 1 withdrawal
- 1 liquidation auction với 2 bids

---

## 🎉 HOÀN THÀNH!

Nếu mọi thứ chạy đúng:
- ✅ Transaction History hiển thị 25+ transactions
- ✅ Latest block < 100
- ✅ Có thể filter transactions theo type
- ✅ Có thể xem "All Transactions" hoặc "My Transactions"

**Happy Testing! 🚀**
