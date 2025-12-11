import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ethers } from 'ethers';
import { CONTRACTS, NETWORK } from './config/contracts';
import AdminMint from './pages/AdminMint';
import LenderPool from './pages/LenderPool';
import BorrowerDashboard from './pages/BorrowerDashboard';
import Auctions from './pages/Auctions';
import TransactionHistory from './pages/TransactionHistory';
import './index.css';

function Navigation({ account, connectWallet }) {
  const location = useLocation();
  const navItems = [
    { path: '/admin', label: 'Admin', icon: '⚙️' },
    { path: '/lender', label: 'Supply', icon: '💎' },
    { path: '/borrower', label: 'Borrow', icon: '💰' },
    { path: '/auctions', label: 'Liquidations', icon: '⚡' },
    { path: '/transactions', label: 'History', icon: '📜' },
  ];
  
  return (
    <nav className="backdrop-blur-xl bg-black/30 border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-2xl">💎</span>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">RWA Protocol</h1>
              <p className="text-xs text-gray-400">Decentralized Lending</p>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center space-x-2 ${ location.pathname === item.path ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5' }`}>
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          <div>
            {account ? (
              <div className="flex items-center space-x-3 glass-card px-4 py-2">
                <div className="pulse-dot bg-green-400"></div>
                <span className="text-sm font-mono text-gray-300">{account.slice(0, 6)}...{account.slice(-4)}</span>
              </div>
            ) : (
              <button onClick={connectWallet} className="btn-primary">
                <span className="flex items-center space-x-2">
                  <span>🔗</span><span>Connect Wallet</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function HomePage() {
  const features = [
    { path: '/admin', icon: '⚙️', title: 'Admin Panel', description: 'Mint RWA NFTs and manage asset valuations', gradient: 'from-purple-500 to-pink-500' },
    { path: '/lender', icon: '💎', title: 'Supply Capital', description: 'Earn yields by providing USDC liquidity', gradient: 'from-blue-500 to-cyan-500' },
    { path: '/borrower', icon: '💰', title: 'Borrow USDC', description: 'Collateralize RWA NFTs to borrow stablecoins', gradient: 'from-green-500 to-emerald-500' },
    { path: '/auctions', icon: '⚡', title: 'Liquidations', description: 'Participate in liquidation auctions', gradient: 'from-orange-500 to-red-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-20 pt-12">
        <div className="inline-block mb-6">
          <span className="badge badge-info text-base px-4 py-2">💎 Powered by Ethereum</span>
        </div>
        <h1 className="text-6xl md:text-7xl font-bold mb-6">
          <span className="gradient-text">Real World Asset</span><br/><span className="text-white">Lending Protocol</span>
        </h1>
        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">Unlock liquidity from your real-world assets. Collateralize, borrow, and earn in a trustless DeFi ecosystem.</p>
        <div className="flex justify-center gap-4 mb-16">
          <Link to="/lender" className="btn-primary text-lg px-8 py-4">Start Earning →</Link>
          <Link to="/borrower" className="btn-outline text-lg px-8 py-4">Borrow Now</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="stat-card text-center"><div className="text-4xl font-bold gradient-text-3 mb-2">60%</div><div className="text-gray-400">Loan-to-Value Ratio</div></div>
          <div className="stat-card text-center"><div className="text-4xl font-bold gradient-text mb-2">5%</div><div className="text-gray-400">Interest Rate (APY)</div></div>
          <div className="stat-card text-center"><div className="text-4xl font-bold gradient-text-2 mb-2">3 Days</div><div className="text-gray-400">Liquidation Period</div></div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
        {features.map((feature) => (
          <Link key={feature.path} to={feature.path} className="premium-card group hover:scale-105 transition-transform duration-300">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>{feature.icon}</div>
            <h3 className="text-2xl font-bold mb-2 text-white">{feature.title}</h3>
            <p className="text-gray-400 mb-4">{feature.description}</p>
            <div className="flex items-center text-purple-400 font-semibold group-hover:translate-x-2 transition-transform"><span>Explore</span><span className="ml-2">→</span></div>
          </Link>
        ))}
      </div>
      <div className="premium-card mb-20">
        <h2 className="text-3xl font-bold mb-8 text-center"><span className="gradient-text">How It Works</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center"><div className="w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div><h4 className="text-xl font-bold mb-2">Deposit Collateral</h4><p className="text-gray-400">Lock your RWA NFTs as collateral in the vault</p></div>
          <div className="text-center"><div className="w-16 h-16 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div><h4 className="text-xl font-bold mb-2">Borrow USDC</h4><p className="text-gray-400">Borrow up to 60% of your asset's value in stablecoins</p></div>
          <div className="text-center"><div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div><h4 className="text-xl font-bold mb-2">Repay & Withdraw</h4><p className="text-gray-400">Repay the loan with interest to reclaim your NFT</p></div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [readOnlyProvider, setReadOnlyProvider] = useState(null);

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    const chainIdHex = '0x' + NETWORK.chainId.toString(16);
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: NETWORK.name,
                rpcUrls: [NETWORK.rpcUrl],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
          alert('Failed to add network: ' + addError.message);
        }
      } else if (switchError.code === -32002 || switchError.message.includes("already pending")) {
        console.log("Request pending in MetaMask");
        alert("Please open your MetaMask extension to approve the pending request.");
      } else {
        console.error('Failed to switch network:', switchError);
        alert('Failed to switch network: ' + switchError.message);
      }
    }
  };

  // Initialize read-only provider immediately for blockchain queries
  useEffect(() => {
    const initReadOnlyProvider = async () => {
      try {
        // Create read-only provider using JsonRpcProvider for localhost
        const rpcProvider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
        setReadOnlyProvider(rpcProvider);
        console.log('[App] Read-only provider initialized');
      } catch (error) {
        console.error('[App] Failed to initialize read-only provider:', error);
      }
    };
    initReadOnlyProvider();
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) { alert('Please install MetaMask!'); return; }
      
      await switchNetwork();

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    }
  };

  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send('eth_accounts', []);
          if (accounts.length > 0) {
            // Check network on auto-connect
            const network = await provider.getNetwork();
            if (Number(network.chainId) !== NETWORK.chainId) {
               await switchNetwork();
            }
            
            const signer = await provider.getSigner();
            setProvider(provider);
            setSigner(signer);
            setAccount(accounts[0]);
          }
        } catch (error) { console.error('Auto-connect failed:', error); }
      }
    };
    autoConnect();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) { setAccount(accounts[0]); } else { setAccount(null); setProvider(null); setSigner(null); }
      });
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navigation account={account} connectWallet={connectWallet} />
        <main className="container mx-auto px-6 py-12 flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/admin" element={<AdminMint signer={signer} account={account} />} />
            <Route path="/lender" element={<LenderPool signer={signer} account={account} />} />
            <Route path="/borrower" element={<BorrowerDashboard signer={signer} account={account} />} />
            <Route path="/auctions" element={<Auctions signer={signer} account={account} />} />
            <Route path="/transactions" element={<TransactionHistory account={account} provider={readOnlyProvider || provider} />} />
          </Routes>
        </main>
        <footer className="bg-black/40 border-t border-white/10 mt-20">
          <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <h3 className="text-lg font-bold text-white mb-1">RWA Exchange</h3>
                <p className="text-sm text-gray-500">Enterprise Grade Asset Lending Platform</p>
              </div>
              <div className="flex space-x-6 text-sm text-gray-400">
                <span className="hover:text-white transition-colors cursor-pointer">Privacy Policy</span>
                <span className="hover:text-white transition-colors cursor-pointer">Terms of Service</span>
                <span className="hover:text-white transition-colors cursor-pointer">Contact Support</span>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
              <p>&copy; 2025 RWA Financial Services Ltd. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
