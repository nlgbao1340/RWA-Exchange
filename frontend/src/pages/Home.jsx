function Home({ account }) {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          🏦 RWA Lending Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Thế chấp Tài sản Thực (Real World Assets) để vay USDC
        </p>
        
        {!account && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 max-w-2xl mx-auto">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Vui lòng kết nối MetaMask để sử dụng nền tảng
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="card text-center hover:shadow-xl transition-shadow">
          <div className="text-4xl mb-4">👨‍💼</div>
          <h3 className="text-lg font-bold mb-2">Admin</h3>
          <p className="text-gray-600 text-sm">
            Mint RWA NFT và cập nhật giá trị tài sản
          </p>
        </div>

        <div className="card text-center hover:shadow-xl transition-shadow">
          <div className="text-4xl mb-4">💰</div>
          <h3 className="text-lg font-bold mb-2">Lender</h3>
          <p className="text-gray-600 text-sm">
            Gửi USDC vào pool để kiếm lãi suất
          </p>
        </div>

        <div className="card text-center hover:shadow-xl transition-shadow">
          <div className="text-4xl mb-4">🏠</div>
          <h3 className="text-lg font-bold mb-2">Borrower</h3>
          <p className="text-gray-600 text-sm">
            Thế chấp NFT để vay USDC (LTV 60%)
          </p>
        </div>

        <div className="card text-center hover:shadow-xl transition-shadow">
          <div className="text-4xl mb-4">⚖️</div>
          <h3 className="text-lg font-bold mb-2">Auctions</h3>
          <p className="text-gray-600 text-sm">
            Tham gia đấu giá các khoản vay thanh lý
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="card max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">📖 Cách Hoạt Động</h2>
        
        <div className="space-y-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-bold mb-1">Admin Mint NFT</h4>
              <p className="text-gray-600 text-sm">
                Nhà phát hành tạo NFT đại diện cho tài sản thực (RWA) và cập nhật giá trị qua Oracle
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-bold mb-1">Lender Deposit</h4>
              <p className="text-gray-600 text-sm">
                Người cho vay gửi USDC vào Lending Pool để tạo thanh khoản
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <h4 className="font-bold mb-1">Borrower Collateralize & Borrow</h4>
              <p className="text-gray-600 text-sm">
                Người vay thế chấp NFT vào Vault và vay USDC (tối đa 60% giá trị NFT)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <h4 className="font-bold mb-1">Liquidation (Nếu Cần)</h4>
              <p className="text-gray-600 text-sm">
                Nếu giá trị NFT giảm và khoản vay không còn an toàn, hệ thống sẽ đấu giá NFT để thanh lý
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Info */}
      <div className="mt-12 grid md:grid-cols-3 gap-6">
        <div className="card bg-blue-50 border border-blue-200">
          <h4 className="font-bold text-blue-900 mb-2">⚙️ Smart Contracts</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• ERC-721 RWA NFT</li>
            <li>• ERC-20 Mock USDC</li>
            <li>• Vault với LTV 60%</li>
            <li>• Liquidation Manager</li>
          </ul>
        </div>

        <div className="card bg-green-50 border border-green-200">
          <h4 className="font-bold text-green-900 mb-2">🔗 Network</h4>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Hardhat Local</li>
            <li>• Chain ID: 31337</li>
            <li>• RPC: localhost:8545</li>
            <li>• Test Environment</li>
          </ul>
        </div>

        <div className="card bg-purple-50 border border-purple-200">
          <h4 className="font-bold text-purple-900 mb-2">🛠️ Tech Stack</h4>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Solidity 0.8.20</li>
            <li>• React + Vite</li>
            <li>• Ethers.js v6</li>
            <li>• TailwindCSS</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Home
