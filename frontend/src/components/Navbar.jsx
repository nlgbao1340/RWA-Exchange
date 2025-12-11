import { Link } from 'react-router-dom'

function Navbar({ account, connectWallet, isConnecting }) {
  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">🏦</span>
            </div>
            <span className="text-xl font-bold text-gray-800">RWA Lending</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-6">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/admin" 
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Admin
            </Link>
            <Link 
              to="/lender" 
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Lender
            </Link>
            <Link 
              to="/borrower" 
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Borrower
            </Link>
            <Link 
              to="/auctions" 
              className="text-gray-600 hover:text-primary transition-colors"
            >
              Auctions
            </Link>
          </div>

          {/* Connect Wallet Button */}
          <div>
            {account ? (
              <div className="flex items-center space-x-2 bg-green-100 px-4 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {formatAddress(account)}
                </span>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="btn-primary"
              >
                {isConnecting ? '🔄 Connecting...' : '🦊 Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className="md:hidden border-t border-gray-200">
        <div className="flex flex-col space-y-2 p-4">
          <Link to="/" className="text-gray-600 hover:text-primary">Home</Link>
          <Link to="/admin" className="text-gray-600 hover:text-primary">Admin</Link>
          <Link to="/lender" className="text-gray-600 hover:text-primary">Lender</Link>
          <Link to="/borrower" className="text-gray-600 hover:text-primary">Borrower</Link>
          <Link to="/auctions" className="text-gray-600 hover:text-primary">Auctions</Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
