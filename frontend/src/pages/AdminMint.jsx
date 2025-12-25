import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import RWA_NFT_ABI from '../abis/RWA_NFT.json';
import RWA_Oracle_ABI from '../abis/RWA_Oracle.json';

function AdminMint({ signer, account }) {
  const [nftRecipient, setNftRecipient] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [loading, setLoading] = useState(false);
  const [priceTokenId, setPriceTokenId] = useState('');
  const [assetPrice, setAssetPrice] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(true);
  const [systemNFTs, setSystemNFTs] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSystemNFTs = async () => {
    if (!signer) return;
    setIsRefreshing(true);
    try {
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
      const oracleContract = new ethers.Contract(CONTRACTS.RWA_Oracle, RWA_Oracle_ABI.abi || RWA_Oracle_ABI, signer);
      
      const total = await nftContract.totalSupply();
      const items = [];
      
      // Loop through all tokens (in reverse to show newest first)
      for (let i = Number(total) - 1; i >= 0; i--) {
        try {
          const tokenId = await nftContract.tokenByIndex(i);
          const owner = await nftContract.ownerOf(tokenId);
          const uri = await nftContract.tokenURI(tokenId);
          
          let price = '0';
          let isPriced = false;
          try {
            // Force a fresh call by not using a cached provider if possible, or just standard call
            isPriced = await oracleContract.isPriceSet(tokenId);
            if (isPriced) {
              const priceWei = await oracleContract.getAssetPrice(tokenId);
              price = ethers.formatUnits(priceWei, 6);
              console.log(`Token ${tokenId} price: ${price}`);
            } else {
               console.log(`Token ${tokenId} has no price set.`);
            }
          } catch (priceErr) {
            console.warn(`Price fetch failed for token ${tokenId}:`, priceErr);
          }

          items.push({
            id: tokenId.toString(),
            owner,
            uri,
            price,
            isPriced
          });
        } catch (itemErr) {
          console.error(`Failed to load item at index ${i}:`, itemErr);
        }
      }
      setSystemNFTs(items);
    } catch (error) {
      console.error("Failed to load system NFTs:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const checkOwner = async () => {
      if (!signer || !account) return;
      try {
        const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
        const owner = await nftContract.owner();
        setIsOwner(owner.toLowerCase() === account.toLowerCase());
      } catch (error) {
        console.error("Failed to check owner:", error);
      } finally {
        setCheckingOwner(false);
      }
    };
    checkOwner();
  }, [signer, account]);

  useEffect(() => {
    if (isOwner && signer) {
      loadSystemNFTs();
    }
  }, [isOwner, signer]); // Removed loading dependencies to prevent race conditions

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="premium-card text-center p-12">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-gray-400">Please connect your wallet to access Admin functions</p>
        </div>
      </div>
    );
  }

  if (checkingOwner) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin text-6xl">⚙️</div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="premium-card text-center p-12 border-red-500/30">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold mb-2 text-red-400">Access Denied</h2>
          <p className="text-gray-400">You are not the administrator of this platform.</p>
          <div className="mt-6 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
            <p className="text-sm text-red-300">Only the contract owner can access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleMintNFT = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Clean and validate address
      const cleanAddress = nftRecipient.trim();
      if (!ethers.isAddress(cleanAddress)) {
        throw new Error("Invalid recipient address format");
      }

      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
      
      // Pre-check: Verify if Token ID already exists to avoid gas estimation errors
      try {
        // ownerOf reverts if token does not exist
        const existingOwner = await nftContract.ownerOf(tokenId);
        if (existingOwner) {
          throw new Error(`Token ID ${tokenId} already exists and is owned by ${existingOwner}`);
        }
      } catch (err) {
        // If error is "invalid token ID" or similar, it means token doesn't exist (which is what we want)
        // If it's our custom error, rethrow it
        if (err.message.includes("already exists")) {
          throw err;
        }
        // Otherwise proceed with minting
      }

      // Manual gas limit to prevent "missing revert data" on some RPCs if estimation fails
      // safeMint usually takes 150k-200k gas
      const tx = await nftContract.safeMint(cleanAddress, tokenId, tokenURI, {
        gasLimit: 300000 
      });
      
      await tx.wait();
      alert(`✅ NFT #${tokenId} minted successfully!`);
      setNftRecipient(''); setTokenId(''); setTokenURI('');
      loadSystemNFTs(); // Refresh list
    } catch (error) {
      console.error('Mint failed:', error);
      
      let errorMessage = error.message;
      // Try to extract readable error from RPC response
      if (error.reason) errorMessage = error.reason;
      if (error.info?.error?.message) errorMessage = error.info.error.message;
      
      if (errorMessage.includes("missing revert data")) {
        errorMessage = "Transaction failed. Possible reasons: Token ID already exists, or you are not the owner.";
      }
      
      alert('❌ Mint failed: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrice = async (e) => {
    e.preventDefault();
    setPriceLoading(true);
    try {
      const oracleContract = new ethers.Contract(CONTRACTS.RWA_Oracle, RWA_Oracle_ABI.abi || RWA_Oracle_ABI, signer);
      const priceInWei = ethers.parseUnits(assetPrice, 6);
      
      // Manual gas limit to prevent "missing revert data" errors
      const tx = await oracleContract.setAssetPrice(priceTokenId, priceInWei, { gasLimit: 300000 });
      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);
      
      alert(`✅ Price for NFT #${priceTokenId} set to $${assetPrice} USDC`);
      setPriceTokenId(''); setAssetPrice('');
      
      // Small delay to ensure node indexing
      setTimeout(() => {
        loadSystemNFTs();
      }, 1000);
    } catch (error) {
      console.error('Set price failed:', error);
      
      let errorMessage = error.message;
      if (error.reason) errorMessage = error.reason;
      if (error.info?.error?.message) errorMessage = error.info.error.message;
      
      if (errorMessage.includes("missing revert data")) {
        errorMessage = "Transaction failed. Possible reasons: Not owner or invalid token ID.";
      }
      
      alert('❌ Set price failed: ' + errorMessage);
    } finally {
      setPriceLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <div className="inline-block mb-4">
          <span className="badge badge-warning text-base px-4 py-2">⚙️ Administrator Access</span>
        </div>
        <h1 className="text-5xl font-bold mb-4"><span className="gradient-text">Admin Control Panel</span></h1>
        <p className="text-xl text-gray-400">Manage RWA NFT minting and asset valuations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="premium-card animated-border">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">🎨</div>
            <div><h2 className="text-2xl font-bold">Mint RWA NFT</h2><p className="text-sm text-gray-400">Create new asset tokens</p></div>
          </div>
          <form onSubmit={handleMintNFT} className="space-y-5">
            <div><label className="label">Recipient Address</label><input type="text" className="input" value={nftRecipient} onChange={(e) => setNftRecipient(e.target.value)} placeholder="0x1234...abcd" required /><p className="text-xs text-gray-500 mt-1">Who will receive this NFT</p></div>
            <div><label className="label">Token ID</label><input type="number" className="input" value={tokenId} onChange={(e) => setTokenId(e.target.value)} placeholder="1" required /><p className="text-xs text-gray-500 mt-1">Unique identifier for this asset</p></div>
            <div><label className="label">Metadata URI</label><input type="text" className="input" value={tokenURI} onChange={(e) => setTokenURI(e.target.value)} placeholder="ipfs://QmX..." required /><p className="text-xs text-gray-500 mt-1">Link to asset metadata</p></div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-lg">{loading ? <span className="flex items-center justify-center space-x-2"><span className="animate-spin">⚙️</span><span>Minting...</span></span> : <span className="flex items-center justify-center space-x-2"><span>✨</span><span>Mint NFT</span></span>}</button>
          </form>
        </div>

        <div className="premium-card animated-border">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl">💎</div>
            <div><h2 className="text-2xl font-bold">Set Asset Valuation</h2><p className="text-sm text-gray-400">Oracle price management</p></div>
          </div>
          <form onSubmit={handleSetPrice} className="space-y-5">
            <div><label className="label">Token ID</label><input type="number" className="input" value={priceTokenId} onChange={(e) => setPriceTokenId(e.target.value)} placeholder="1" required /><p className="text-xs text-gray-500 mt-1">Which NFT to price</p></div>
            <div><label className="label">Fair Market Value (USDC)</label><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span><input type="number" step="0.01" className="input pl-8" value={assetPrice} onChange={(e) => setAssetPrice(e.target.value)} placeholder="100000.00" required /></div><p className="text-xs text-gray-500 mt-1">Asset valuation in USD stablecoins</p></div>
            <div className="glass-card p-4 border border-blue-500/30"><div className="flex items-start space-x-3"><span className="text-2xl">💡</span><div className="text-sm text-blue-300"><p className="font-semibold mb-1">Lending Parameters:</p><ul className="space-y-1 text-xs text-gray-400"><li>• Max LTV: <span className="text-blue-300 font-semibold">60%</span></li><li>• Interest Rate: <span className="text-blue-300 font-semibold">5% APY</span></li></ul></div></div></div>
            <button type="submit" disabled={priceLoading} className="btn-success w-full text-lg">{priceLoading ? <span className="flex items-center justify-center space-x-2"><span className="animate-spin">⚙️</span><span>Updating...</span></span> : <span className="flex items-center justify-center space-x-2"><span>💰</span><span>Set Price</span></span>}</button>
          </form>
        </div>
      </div>

      {/* System Assets List */}
      <div className="premium-card mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold flex items-center space-x-3">
            <span>🗃️</span><span>System Assets Registry</span>
          </h3>
          <button onClick={loadSystemNFTs} disabled={isRefreshing} className="btn-outline text-sm px-3 py-1">
            {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-400 border-b border-white/10">
                <th className="p-4">Token ID</th>
                <th className="p-4">Owner</th>
                <th className="p-4">Metadata URI</th>
                <th className="p-4">Valuation (USDC)</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {systemNFTs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No assets minted yet.</td>
                </tr>
              ) : (
                systemNFTs.map((nft) => (
                  <tr key={nft.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-purple-300">#{nft.id}</td>
                    <td className="p-4 font-mono text-xs text-gray-400">
                      {nft.owner.slice(0, 6)}...{nft.owner.slice(-4)}
                      {nft.owner.toLowerCase() === account.toLowerCase() && <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">You</span>}
                    </td>
                    <td className="p-4 text-sm text-gray-400 truncate max-w-[150px]">{nft.uri}</td>
                    <td className="p-4">
                      {nft.isPriced ? (
                        <span className="text-green-400 font-bold">${nft.price}</span>
                      ) : (
                        <span className="text-yellow-500 text-sm italic">Pending Valuation</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => { setPriceTokenId(nft.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="text-sm bg-blue-500/20 text-blue-300 px-3 py-1 rounded hover:bg-blue-500/40 transition-colors"
                      >
                        Set Price
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="premium-card"><h3 className="text-2xl font-bold mb-6 flex items-center space-x-3"><span>📋</span><span>Administrator Guide</span></h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="glass-card p-5"><div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl font-bold mb-3">1</div><h4 className="font-bold text-lg mb-2">Mint RWA NFT</h4><p className="text-sm text-gray-400">Create ERC-721 tokens representing real-world assets.</p></div><div className="glass-card p-5"><div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl font-bold mb-3">2</div><h4 className="font-bold text-lg mb-2">Set Valuation</h4><p className="text-sm text-gray-400">Update oracle prices to reflect current fair market value.</p></div><div className="glass-card p-5"><div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl font-bold mb-3">3</div><h4 className="font-bold text-lg mb-2">Enable Lending</h4><p className="text-sm text-gray-400">Once priced, NFTs become eligible collateral for borrowers.</p></div></div></div>
    </div>
  );
}

export default AdminMint;
