# 🚀 HƯỚNG DẪN CHẠY DỰ ÁN RWA LENDING PLATFORM

## ✅ YÊU CẦU TRƯỚC KHI CHẠY

1. ✅ Có Docker

---

## Chạy bằng 

## 🔄 BƯỚC 1: Chạy bằng Docker
Lưu ý: mọi thứ đã được deploy nên khi chạy phải vào frontend/ để build front-end
```
docker build . -t rwa-sepolia-deployer 
docker run --rm --env-file .env rwa-sepolia-deployer
```
Tài khoản admin là ví của Huỳnh Văn Đức An, mọi người có muốn tài sản hóa token thì liên hệ bạn để mint NFT ngoài ra muốn dùng thì phải có SEPOLIA bằng cách đào hoặc lấy từ SEPOLIA FAUCET, không còn bị giới hạn bởi địa chỉ ví hardcode, đổi ví liên tục được, không cần xóa và import ví. 