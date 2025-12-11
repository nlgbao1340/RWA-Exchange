import { useState } from 'react';
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

  const handleMintNFT = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
      const tx = await nftContract.safeMint(nftRecipient, tokenId, tokenURI);
      await tx.wait();
      alert(`✅ NFT #${tokenId} minted successfully!`);
      setNftRecipient(''); setTokenId(''); setTokenURI('');
    } catch (error) {
      console.error('Mint failed:', error);
      alert('❌ Mint failed: ' + error.message);
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
      const tx = await oracleContract.setAssetPrice(priceTokenId, priceInWei);
      await tx.wait();
      alert(`✅ Price for NFT #${priceTokenId} set to $${assetPrice} USDC`);
      setPriceTokenId(''); setAssetPrice('');
    } catch (error) {
      console.error('Set price failed:', error);
      alert('❌ Set price failed: ' + error.message);
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

      <div className="premium-card"><h3 className="text-2xl font-bold mb-6 flex items-center space-x-3"><span>📋</span><span>Administrator Guide</span></h3><div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div className="glass-card p-5"><div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl font-bold mb-3">1</div><h4 className="font-bold text-lg mb-2">Mint RWA NFT</h4><p className="text-sm text-gray-400">Create ERC-721 tokens representing real-world assets.</p></div><div className="glass-card p-5"><div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl font-bold mb-3">2</div><h4 className="font-bold text-lg mb-2">Set Valuation</h4><p className="text-sm text-gray-400">Update oracle prices to reflect current fair market value.</p></div><div className="glass-card p-5"><div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl font-bold mb-3">3</div><h4 className="font-bold text-lg mb-2">Enable Lending</h4><p className="text-sm text-gray-400">Once priced, NFTs become eligible collateral for borrowers.</p></div></div></div>
    </div>
  );
}

export default AdminMint;
