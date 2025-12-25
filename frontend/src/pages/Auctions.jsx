import { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import LiquidationManager_ABI from '../abis/LiquidationManager.json';
import RWA_NFT_ABI from '../abis/RWA_NFT.json';
import RWA_Oracle_ABI from '../abis/RWA_Oracle.json';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import Vault_ABI from '../abis/Vault.json';

function Auctions({ signer, account }) {
  const [auctions, setAuctions] = useState([]);
  const [liquidatable, setLiquidatable] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Cache for prices to reduce RPC calls (30s TTL)
  const priceCache = useRef({});
  // Track optimistic updates to prevent overwriting with stale RPC data
  const pendingUpdates = useRef({});

  const loadAuctions = async () => {
    try {
      const liquidationContract = new ethers.Contract(CONTRACTS.LiquidationManager, LiquidationManager_ABI.abi || LiquidationManager_ABI, signer);
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
      const oracleContract = new ethers.Contract(CONTRACTS.RWA_Oracle, RWA_Oracle_ABI.abi || RWA_Oracle_ABI, signer);
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi || Vault_ABI, signer);

      // Iterate over Vault tokens ONCE to find both Active Auctions and Liquidatable Positions
      const balance = await nftContract.balanceOf(CONTRACTS.Vault);
      const auctionList = [];
      const riskyList = [];

      for (let i = 0; i < balance; i++) {
        try {
          const tokenId = await nftContract.tokenOfOwnerByIndex(CONTRACTS.Vault, i);
          const tokenIdStr = tokenId.toString();
          
          // 1. Check Auction Status
          const auction = await liquidationContract.auctions(tokenId);
          
          // Fetch Price with Caching
          let price = '0';
          const now = Date.now();
          if (priceCache.current[tokenIdStr] && (now - priceCache.current[tokenIdStr].timestamp < 30000)) {
            price = priceCache.current[tokenIdStr].value;
          } else {
            try {
              const priceWei = await oracleContract.getAssetPrice(tokenId);
              price = ethers.formatUnits(priceWei, 6);
              priceCache.current[tokenIdStr] = { value: price, timestamp: now };
            } catch (e) {
              console.warn(`Price fetch failed for ${tokenIdStr}`, e);
            }
          }

          if (auction.active) {
            // --- ACTIVE AUCTION ---
            const debt = ethers.formatUnits(auction.originalDebt || auction.debtAmount || 0, 6);
            const currentBid = ethers.formatUnits(auction.highestBid, 6);
            const timeLeft = Number(auction.endTime) - Math.floor(Date.now() / 1000);
            
            auctionList.push({
              tokenId: tokenIdStr,
              price,
              debt,
              currentBid,
              highestBidder: auction.highestBidder,
              endTime: Number(auction.endTime),
              timeLeft,
              isActive: true
            });
          } else {
            // --- POTENTIAL LIQUIDATION ---
            // Only check for liquidation if NOT already in auction
            const position = await vaultContract.positions(tokenId);
            
            if (position.debt > 0) {
              const debt = ethers.formatUnits(position.debt, 6);
              const maxBorrow = parseFloat(price) * 0.6; // 60% LTV
              const healthFactor = parseFloat(debt) > 0 ? (maxBorrow / parseFloat(debt)) * 100 : 100;
              
              if (healthFactor < 100) {
                riskyList.push({
                  tokenId: tokenIdStr,
                  price,
                  debt,
                  healthFactor,
                  owner: position.owner
                });
              }
            }
          }
        } catch (err) {
          console.error(`Error processing token at index ${i}:`, err);
        }
      }

      // Update state, but preserve optimistic updates if they are recent (< 20s)
      setAuctions(prevAuctions => {
        return auctionList.map(newItem => {
          const tokenId = newItem.tokenId;
          if (pendingUpdates.current[tokenId] && Date.now() - pendingUpdates.current[tokenId] < 20000) {
            const optimisticItem = prevAuctions.find(p => p.tokenId === tokenId);
            if (optimisticItem) return optimisticItem;
          }
          return newItem;
        });
      });

      setLiquidatable(prevRisky => {
        // Filter out items that we know are auctioned (optimistically)
        return riskyList.filter(item => {
           if (pendingUpdates.current[item.tokenId] && Date.now() - pendingUpdates.current[item.tokenId] < 20000) {
             // If we recently started an auction for this, don't show it in risky list
             return false; 
           }
           return true;
        });
      });

    } catch (error) {
      console.error('Load auctions failed:', error);
    }
  };

  useEffect(() => {
    if (signer && account) {
      loadAuctions();
      const interval = setInterval(loadAuctions, 10000);
      return () => clearInterval(interval);
    }
  }, [signer, account]);

  const handleStartAuction = async (tokenId) => {
    setLoading(true);
    try {
      const liquidationContract = new ethers.Contract(CONTRACTS.LiquidationManager, LiquidationManager_ABI.abi || LiquidationManager_ABI, signer);
      // Manual gas limit to prevent "missing revert data" errors
      const tx = await liquidationContract.startAuction(tokenId, { gasLimit: 300000 });
      await tx.wait();
      
      // Optimistic Update: Remove from liquidatable immediately
      pendingUpdates.current[tokenId] = Date.now();
      setLiquidatable(prev => prev.filter(item => item.tokenId !== tokenId));
      
      alert('✅ Liquidation started successfully!');
      // Delay reload to allow RPC to index the event
      setTimeout(loadAuctions, 2000);
    } catch (error) {
      console.error('Start auction failed:', error);
      let errorMessage = error.message;
      if (error.reason) errorMessage = error.reason;
      if (error.info?.error?.message) errorMessage = error.info.error.message;
      if (errorMessage.includes("missing revert data")) errorMessage = "Transaction failed. Possible reasons: Health factor is above 100% or auction already started.";
      alert('❌ Start auction failed: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBid = async (tokenId, bidAmount) => {
    setLoading(true);
    try {
      const usdcContract = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi || MockUSDC_ABI, signer);
      const liquidationContract = new ethers.Contract(CONTRACTS.LiquidationManager, LiquidationManager_ABI.abi || LiquidationManager_ABI, signer);
      
      const bidWei = ethers.parseUnits(bidAmount, 6);
      
      // Check allowance first
      const allowance = await usdcContract.allowance(account, CONTRACTS.LiquidationManager);
      if (allowance < bidWei) {
        const approveTx = await usdcContract.approve(CONTRACTS.LiquidationManager, bidWei, { gasLimit: 100000 });
        await approveTx.wait();
      }
      
      // Manual gas limit to fix "missing revert data"
      const bidTx = await liquidationContract.bid(tokenId, bidWei, { gasLimit: 300000 });
      await bidTx.wait();
      
      // Optimistic Update: Update bid amount
      pendingUpdates.current[tokenId] = Date.now();
      setAuctions(prev => prev.map(auction => {
        if (auction.tokenId === tokenId) {
          return { ...auction, currentBid: bidAmount, highestBidder: account };
        }
        return auction;
      }));
      
      alert('✅ Bid placed successfully!');
      // Skip immediate reload to prevent stale data from overwriting optimistic update
      // The background poller will eventually sync the state
    } catch (error) {
      console.error('Bid failed:', error);
      let errorMessage = error.message;
      if (errorMessage.includes("missing revert data")) errorMessage = "Transaction failed. Possible reasons: Bid too low or auction ended.";
      alert('❌ Bid failed: ' + errorMessage);
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
      
      // Optimistic Update: Remove from auctions
      pendingUpdates.current[tokenId] = Date.now();
      setAuctions(prev => prev.filter(auction => auction.tokenId !== tokenId));
      
      alert('✅ Auction ended successfully!');
      // Delay reload to allow RPC to index the event
      setTimeout(loadAuctions, 2000);
    } catch (error) {
      console.error('End auction failed:', error);
      alert('❌ End auction failed: ' + error.message);
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
          <span className="badge badge-danger text-base px-4 py-2">⚡ Liquidation Auctions</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="gradient-text-2">Active Auctions</span>
        </h1>
        <p className="text-xl text-gray-400">Bid on liquidated collateral - 3-day English auction</p>
      </div>

      {/* Liquidatable Positions Section */}
      {liquidatable.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold flex items-center space-x-3">
              <span>⚠️</span><span>Liquidatable Positions</span>
            </h2>
            <span className="badge badge-danger animate-pulse">{liquidatable.length} At Risk</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liquidatable.map((pos) => (
              <div key={pos.tokenId} className="premium-card border-red-500/30 bg-red-500/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="badge badge-danger">NFT #{pos.tokenId}</span>
                  <span className="text-2xl">📉</span>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Health Factor</span>
                    <span className="text-red-400 font-bold">{pos.healthFactor.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Debt</span>
                    <span className="text-white font-bold">${parseFloat(pos.debt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Collateral Value</span>
                    <span className="text-white font-bold">${parseFloat(pos.price).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Owner</span>
                    <span className="text-gray-400 text-xs font-mono">{pos.owner.slice(0,6)}...{pos.owner.slice(-4)}</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleStartAuction(pos.tokenId)}
                  disabled={loading}
                  className="btn-danger w-full"
                >
                  {loading ? '⚙️ Processing...' : '⚡ Trigger Liquidation'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {auctions.length === 0 ? (
        <div className="premium-card text-center p-12">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold mb-2">No Active Auctions</h3>
          <p className="text-gray-400">All positions are healthy. Check back later for liquidation opportunities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {auctions.map((auction) => {
            const isWinning = auction.highestBidder.toLowerCase() === account.toLowerCase();
            const hasEnded = auction.timeLeft <= 0;
            const minNextBid = parseFloat(auction.currentBid) > 0 ? parseFloat(auction.currentBid) * 1.05 : parseFloat(auction.debt);

            return (
              <div key={auction.tokenId} className="premium-card animated-border relative overflow-hidden">
                {isWinning && !hasEnded && (
                  <div className="absolute top-4 right-4 badge badge-success animate-pulse">
                    💎 You're Winning!
                  </div>
                )}
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-3xl">💎</span>
                      <div>
                        <div className="text-sm text-gray-400">Auction</div>
                        <div className="font-bold text-xl">NFT #{auction.tokenId}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="text-xs text-gray-400">Asset Value</div>
                        <div className="text-lg font-bold gradient-text">${parseFloat(auction.price).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Outstanding Debt</div>
                        <div className="text-lg font-bold gradient-text-2">${parseFloat(auction.debt).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold mb-4 flex items-center space-x-2">
                      <span>💎</span><span>Current Bid</span>
                    </h4>
                    <div className="mb-4">
                      {parseFloat(auction.currentBid) > 0 ? (
                        <>
                          <div className="text-3xl font-bold gradient-text-3">${parseFloat(auction.currentBid).toLocaleString()}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            by {auction.highestBidder.slice(0, 6)}...{auction.highestBidder.slice(-4)}
                          </div>
                        </>
                      ) : (
                        <div className="text-2xl font-bold text-gray-500">No bids yet</div>
                      )}
                    </div>
                    <div className="glass-card p-3 border border-yellow-500/30">
                      <div className="text-xs text-gray-400">Minimum Next Bid</div>
                      <div className="text-lg font-bold text-yellow-300">${minNextBid.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">+5% increment</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold mb-4 flex items-center space-x-2">
                      <span>⏰</span><span>Time Remaining</span>
                    </h4>
                    <div className="mb-4">
                      <div className={`text-3xl font-bold ${auction.timeLeft > 86400 ? 'gradient-text' : auction.timeLeft > 3600 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {formatTimeLeft(auction.timeLeft)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Ends: {new Date(auction.endTime * 1000).toLocaleString()}
                      </div>
                    </div>
                    {hasEnded ? (
                      <div className="badge badge-danger w-full py-2">⏱️ Auction Ended</div>
                    ) : (
                      <div className="badge badge-warning w-full py-2">💎 Live Auction</div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold mb-4 flex items-center space-x-2">
                      <span>💎</span><span>Actions</span>
                    </h4>
                    {!hasEnded ? (
                      <div className="space-y-3">
                        <div className="glass-card p-3 border border-blue-500/30">
                          <div className="text-xs text-gray-400 mb-1">Potential Profit</div>
                          <div className="text-lg font-bold gradient-text-3">
                            ${(parseFloat(auction.price) - minNextBid).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">{((parseFloat(auction.price) - minNextBid) / minNextBid * 100).toFixed(1)}% gain</div>
                        </div>
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
                          className="btn-primary w-full"
                        >
                          {loading ? '⚙️' : '💎'} {loading ? 'Processing...' : 'Place Bid'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEndAuction(auction.tokenId)}
                        disabled={loading}
                        className="btn-success w-full"
                      >
                        {loading ? '⚙️' : '💎'} {loading ? 'Processing...' : 'End Auction'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div>
                        <span className="text-gray-400">Health Status:</span>
                        <span className="ml-2 badge badge-danger">Liquidating</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Auction Type:</span>
                        <span className="ml-2 text-white font-semibold">English Auction (3 days)</span>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      {isWinning ? '💎 Your bid is winning!' : '💎 Place a bid to win this NFT'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
