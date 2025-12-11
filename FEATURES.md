# 🌟 Các Chức Năng Của Ứng Dụng RWA Lending Platform

Tài liệu này tổng hợp chi tiết các chức năng hiện có trong ứng dụng, giúp bạn hiểu rõ luồng hoạt động của hệ thống.

---

## 1. ⚙️ Admin Panel (Quản Trị Viên)
*Dành cho Admin để quản lý tài sản và giá cả.*

*   **Mint RWA NFT**:
    *   Tạo mới một NFT đại diện cho tài sản thực (Real World Asset).
    *   Nhập địa chỉ người nhận, Token ID và đường dẫn Metadata (URI).
*   **Set Asset Valuation (Định Giá Tài Sản)**:
    *   Thiết lập giá trị cho NFT bằng đồng USDC thông qua Oracle.
    *   Giá trị này quyết định hạn mức vay tối đa (Max LTV) của người dùng khi thế chấp NFT đó.

---

## 2. 💎 Lender Pool (Nhà Cung Cấp Thanh Khoản)
*Dành cho người dùng muốn gửi tiền (USDC) để kiếm lãi.*

*   **USDC Faucet**:
    *   Nhận miễn phí 10,000 MockUSDC (chỉ dùng cho testnet/localhost) để trải nghiệm.
*   **Deposit (Gửi Tiền)**:
    *   Gửi USDC vào Lending Pool để cung cấp thanh khoản cho người vay.
    *   Bắt đầu nhận lãi suất từ thời điểm gửi.
*   **Withdraw (Rút Tiền)**:
    *   Rút lại số vốn gốc và lãi suất đã kiếm được bất kỳ lúc nào (nếu Pool còn đủ thanh khoản).
*   **Dashboard**:
    *   Xem số dư ví, tổng thanh khoản của Pool và số tiền cá nhân đang gửi.

---

## 3. 💰 Borrower Dashboard (Người Vay)
*Dành cho người sở hữu NFT muốn thế chấp để vay tiền.*

*   **Wallet NFTs**:
    *   Xem danh sách các RWA NFT đang có trong ví cá nhân.
*   **Deposit Collateral (Gửi Thế Chấp)**:
    *   Chuyển NFT từ ví vào Vault (Kho bạc) để làm tài sản đảm bảo.
*   **Vaulted NFTs**:
    *   Quản lý các NFT đang được thế chấp.
    *   Xem thông tin khoản vay hiện tại (Nợ gốc, Lãi suất, Giá trị tài sản).
*   **Borrow USDC (Vay Tiền)**:
    *   Vay USDC dựa trên giá trị tài sản thế chấp (Tối đa 60% giá trị tài sản).
*   **Repay Loan (Trả Nợ)**:
    *   Trả lại số tiền gốc + lãi suất phát sinh để giải phóng tài sản thế chấp.
    *   Sau khi trả hết nợ, có thể rút NFT về ví.

---

## 4. ⚡ Auctions (Thanh Lý Tài Sản)
*Thị trường đấu giá các tài sản bị thanh lý.*

*   **Active Auctions (Đấu Giá Đang Diễn Ra)**:
    *   Hiển thị danh sách các NFT bị thanh lý (do người vay không trả nợ đúng hạn hoặc giá trị tài sản giảm quá mức cho phép).
    *   Hiển thị giá khởi điểm, giá thầu cao nhất hiện tại và thời gian còn lại.
*   **Place Bid (Đặt Giá Thầu)**:
    *   Người dùng dùng USDC để tham gia đấu giá mua lại tài sản giá rẻ.
*   **End Auction (Kết Thúc Đấu Giá)**:
    *   Khi hết thời gian, bất kỳ ai cũng có thể kích hoạt lệnh kết thúc.
    *   NFT sẽ được chuyển cho người trả giá cao nhất, tiền sẽ được dùng để trả nợ cho Pool.

---

## 5. 📜 Transaction History (Lịch Sử Giao Dịch)
*Theo dõi minh bạch mọi hoạt động trên Blockchain.*

*   **Global History**: Xem toàn bộ giao dịch diễn ra trên hệ thống (Ai gửi tiền, ai vay, ai bị thanh lý...).
*   **Personal History**: Lọc và chỉ xem các giao dịch liên quan đến ví của bạn.
*   **Bộ Lọc Chi Tiết**:
    *   Transfers (Chuyển tiền/NFT).
    *   Deposits (Gửi tiền).
    *   Borrows (Vay tiền).
    *   Repayments (Trả nợ).
    *   Liquidations (Thanh lý).

---

## 6. 🛠️ Tính Năng Hệ Thống
*   **Auto Network Switching**: Tự động phát hiện và yêu cầu chuyển sang mạng Hardhat Local nếu người dùng đang ở mạng sai.
*   **Read-Only Mode**: Cho phép xem dữ liệu (Lịch sử, Danh sách đấu giá...) ngay cả khi chưa kết nối ví.
*   **Real-time Updates**: Cập nhật trạng thái giao dịch và số dư ngay lập tức sau khi xác nhận trên Blockchain.
