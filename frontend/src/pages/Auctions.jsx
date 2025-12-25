import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import LiquidationManager_ABI from '../abis/LiquidationManager.json';
import RWA_NFT_ABI from '../abis/RWA_NFT.json';
import RWA_Oracle_ABI from '../abis/RWA_Oracle.json';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import Vault_ABI from '../abis/Vault.json';

function Auctions({ signer, account }) {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [liquidatablePositions, setLiquidatablePositions] = useState([]);

  const loadData = async () => {
    try {
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi || Vault_ABI, signer);
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
      const liquidationContract = new ethers.Contract(CONTRACTS.LiquidationManager, LiquidationManager_ABI.abi || LiquidationManager_ABI, signer);
      const oracleContract = new ethers.Contract(CONTRACTS.RWA_Oracle, RWA_Oracle_ABI.abi || RWA_Oracle_ABI, signer);

      const vaultBalance = await nftContract.balanceOf(CONTRACTS.Vault);
      const riskyList = [];
      const auctionList = [];

      for (let i = 0; i < Number(vaultBalance); i++) {
        try {
          const tokenId = await nftContract.tokenOfOwnerByIndex(CONTRACTS.Vault, i);
          
          // Check if there's an active auction first
          const auction = await liquidationContract.auctions(tokenId);
          
          if (auction.active) {
            const priceWei = await oracleContract.getAssetPrice(tokenId);
            const price = ethers.formatUnits(priceWei, 6);
            const debt = ethers.formatUnits(auction.originalDebt, 6);
            const currentBid = ethers.formatUnits(auction.highestBid, 6);
            const timeLeft = Number(auction.endTime) - Math.floor(Date.now() / 1000);
            
            auctionList.push({
              tokenId: tokenId.toString(),
              price,
              debt,
              currentBid,
              highestBidder: auction.highestBidder,
              endTime: Number(auction.endTime),
              timeLeft,
              active: auction.active
            });
          } else {
            // If no auction, check if it's liquidatable
            const isHealthy = await liquidationContract.checkHealth(tokenId);
            if (!isHealthy) {
              const position = await vaultContract.positions(tokenId);
              const priceWei = await oracleContract.getAssetPrice(tokenId);
              
              riskyList.push({
                tokenId: tokenId.toString(),
                debt: ethers.formatUnits(position.debt, 6),
                price: ethers.formatUnits(priceWei, 6),
                owner: position.owner
              });
            }
          }
        } catch (err) {
          console.error(`Error processing token at index ${i}:`, err);
        }
      }

      setAuctions(auctionList);
      setLiquidatablePositions(riskyList);
    } catch (error) {
      console.error('Load data failed:', error);
    }
  };

  useEffect(() => {
    if (signer && account) {
      loadData();
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [signer, account]);

  const handleBid = async (tokenId, bidAmount) => {
    setLoading(true);
    try {
      const usdcContract = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi || MockUSDC_ABI, signer);
      const liquidationContract = new ethers.Contract(CONTRACTS.LiquidationManager, LiquidationManager_ABI.abi || LiquidationManager_ABI, signer);
      
      const bidWei = ethers.parseUnits(bidAmount, 6);
      const approveTx = await usdcContract.approve(CONTRACTS.LiquidationManager, bidWei);
      await approveTx.wait();
      
      const bidTx = await liquidationContract.bid(tokenId, bidWei);
      await bidTx.wait();
      
      alert('✅ Bid placed successfully!');
      loadData();
    } catch (error) {
      console.error('Bid failed:', error);
      alert('❌ Bid failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEndAuction = async (tokenId) => {
    setLoading(true);
    try {
      const liquidationContract = new ethers.Contract(CONTRACTS.LiquidationManager, LiquidationManager_ABI.abi || LiquidationManager_ABI, signer);
      const tx = await liquidationContract.endAuction(tokenId);
      await tx.wait();
      alert('✅ Auction ended successfully!');
      loadData();
    } catch (error) {
      console.error('End auction failed:', error);
      alert('❌ End auction failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAuction = async (tokenId) => {
    setLoading(true);
    try {
      const liquidationContract = new ethers.Contract(CONTRACTS.LiquidationManager, LiquidationManager_ABI.abi || LiquidationManager_ABI, signer);
      const tx = await liquidationContract.startAuction(tokenId);
      await tx.wait();
      alert('✅ Auction started successfully!');
      loadData();
    } catch (error) {
      console.error('Start auction failed:', error);
      alert('❌ Start auction failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeLeft = (seconds) => {
    if (seconds <= 0) return 'Ended';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="premium-card text-center p-12">
          <div className="text-6xl mb-4">💎</div>
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-gray-400">Connect wallet to participate in auctions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12 text-center">
        <div className="inline-block mb-4">
          <span className="badge badge-error text-base px-4 py-2">⚡ Liquidation Zone</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="gradient-text">Asset Auctions</span>
        </h1>
        <p className="text-xl text-gray-400">Bid on liquidated RWA assets at discounted prices</p>
      </div>

      {/* Risky Positions Section */}
      {liquidatablePositions.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3 text-red-400">
            <span>⚠️</span><span>Risky Positions (Ready for Liquidation)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liquidatablePositions.map((pos) => (
              <div key={pos.tokenId} className="premium-card border-red-500/30 bg-red-500/5 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="badge badge-error">NFT #{pos.tokenId}</span>
                    <span className="text-[10px] font-mono text-gray-500">Owner: {pos.owner.slice(0,6)}...</span>
                  </div>
                  <span className="text-xl">⚠️</span>
                </div>
                
                <div className="space-y-3 mb-6 flex-grow">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-xs text-gray-400">Outstanding Debt</span>
                    <span className="font-bold text-red-400">${parseFloat(pos.debt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-black/20 border border-white/5">
                    <span className="text-xs text-gray-400">Collateral Value</span>
                    <span className="font-bold text-white">${parseFloat(pos.price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="text-xs text-red-400 font-bold uppercase">Health Status</span>
                    <span className="font-black text-red-500 animate-pulse">CRITICAL</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleStartAuction(pos.tokenId)}
                  disabled={loading}
                  className="btn-primary w-full bg-red-500 hover:bg-red-600 border-red-500 py-3 font-bold shadow-lg shadow-red-500/20"
                >
                  {loading ? 'Processing...' : '⚡ TRIGGER LIQUIDATION'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {auctions.map((auction) => {
          const isWinning = auction.highestBidder.toLowerCase() === account.toLowerCase();
          const hasEnded = auction.timeLeft <= 0;
          const minNextBid = parseFloat(auction.currentBid) > 0 ? parseFloat(auction.currentBid) * 1.05 : parseFloat(auction.debt);

          return (
            <div key={auction.tokenId} className="premium-card animated-border relative overflow-hidden flex flex-col h-full">
              {isWinning && !hasEnded && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl animate-pulse z-10">
                  💎 YOU'RE WINNING
                </div>
              )}
              
              {/* Header Section */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl border border-white/10">
                    💎
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Auction</div>
                    <div className="font-bold text-xl">NFT #{auction.tokenId}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Asset Value</div>
                  <div className="text-xl font-bold gradient-text">${parseFloat(auction.price).toLocaleString()}</div>
                </div>
              </div>

              {/* Main Info Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-3 border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase mb-1">Current Bid</div>
                  {parseFloat(auction.currentBid) > 0 ? (
                    <div>
                      <div className="text-xl font-bold text-green-400">${parseFloat(auction.currentBid).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500 truncate">by {auction.highestBidder.slice(0, 6)}...</div>
                    </div>
                  ) : (
                    <div className="text-lg font-bold text-gray-500 italic">No bids</div>
                  )}
                </div>
                <div className="glass-card p-3 border-yellow-500/20 bg-yellow-500/5">
                  <div className="text-[10px] text-yellow-500/70 uppercase mb-1">Min. Next Bid</div>
                  <div className="text-xl font-bold text-yellow-400">${minNextBid.toLocaleString()}</div>
                </div>
              </div>

              {/* Time Section */}
              <div className="mb-6">
                <div className="flex justify-between items-end mb-2">
                  <div className="text-xs text-gray-400 uppercase font-semibold">Time Remaining</div>
                  <div className="text-[10px] text-gray-500">{new Date(auction.endTime * 1000).toLocaleTimeString()}</div>
                </div>
                <div className={`text-3xl font-mono font-bold text-center py-3 rounded-xl bg-black/20 border border-white/5 ${auction.timeLeft > 86400 ? 'text-blue-400' : auction.timeLeft > 3600 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatTimeLeft(auction.timeLeft)}
                </div>
              </div>

              {/* Profit Indicator */}
              {!hasEnded && (
                <div className="mb-6 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-blue-400 uppercase font-bold">Est. Profit</div>
                    <div className="text-lg font-bold text-white">${(parseFloat(auction.price) - minNextBid).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-blue-400">+{((parseFloat(auction.price) - minNextBid) / minNextBid * 100).toFixed(1)}%</div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-auto">
                {!hasEnded ? (
                  <button
                    onClick={() => {
                      const amount = prompt('Enter your bid amount (USDC):', minNextBid.toFixed(2));
                      if (amount && parseFloat(amount) >= minNextBid) {
                        handleBid(auction.tokenId, amount);
                      } else if (amount) {
                        alert('Bid must be at least $' + minNextBid.toFixed(2));
                      }
                    }}
                    disabled={loading}
                    className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-purple-500/20"
                  >
                    {loading ? 'Processing...' : 'PLACE BID'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleEndAuction(auction.tokenId)}
                    disabled={loading}
                    className="btn-success w-full py-4 text-lg font-bold"
                  >
                    {loading ? 'Processing...' : 'CLAIM ASSET'}
                  </button>
                )}
              </div>

              {/* Footer Status */}
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px]">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span className="text-gray-400 uppercase font-bold">Live Auction</span>
                </div>
                <div className="text-gray-500">Debt: ${parseFloat(auction.debt).toLocaleString()}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="premium-card mt-8">
        <h3 className="text-2xl font-bold mb-6 flex items-center space-x-3">
          <span>ℹ️</span><span>How Liquidation Works</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-xl font-bold mb-3">1</div>
            <h4 className="font-bold text-lg mb-2">Unhealthy Position</h4>
            <p className="text-sm text-gray-400">When LTV exceeds 60%, position becomes liquidatable.</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-xl font-bold mb-3">2</div>
            <h4 className="font-bold text-lg mb-2">Auction Starts</h4>
            <p className="text-sm text-gray-400">3-day English auction begins. Minimum bid = debt amount.</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-xl font-bold mb-3">3</div>
            <h4 className="font-bold text-lg mb-2">Place Bids</h4>
            <p className="text-sm text-gray-400">Each bid must be 5% higher than previous.</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl font-bold mb-3">4</div>
            <h4 className="font-bold text-lg mb-2">Win NFT</h4>
            <p className="text-sm text-gray-400">Highest bidder gets NFT after auction ends.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auctions;
