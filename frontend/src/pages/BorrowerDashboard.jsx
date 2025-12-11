import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import RWA_NFT_ABI from '../abis/RWA_NFT.json';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import Vault_ABI from '../abis/Vault.json';
import RWA_Oracle_ABI from '../abis/RWA_Oracle.json';

function BorrowerDashboard({ signer, account }) {
  const [walletNFTs, setWalletNFTs] = useState([]);
  const [vaultedNFTs, setVaultedNFTs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadNFTs = async () => {
    try {
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi || Vault_ABI, signer);
      const oracleContract = new ethers.Contract(CONTRACTS.RWA_Oracle, RWA_Oracle_ABI.abi || RWA_Oracle_ABI, signer);
      const usdcContract = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi || MockUSDC_ABI, signer);

      const balance = await nftContract.balanceOf(account);
      const walletList = [];
      for (let i = 0; i < balance; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(account, i);
        const uri = await nftContract.tokenURI(tokenId);
        const priceSet = await oracleContract.isPriceSet(tokenId);
        let price = '0';
        if (priceSet) {
          const priceWei = await oracleContract.getAssetPrice(tokenId);
          price = ethers.formatUnits(priceWei, 6);
        }
        walletList.push({ tokenId: tokenId.toString(), uri, price });
      }
      setWalletNFTs(walletList);

      const vaultBalance = await nftContract.balanceOf(CONTRACTS.Vault);
      const vaultList = [];
      for (let i = 0; i < vaultBalance; i++) {
        const tokenId = await nftContract.tokenOfOwnerByIndex(CONTRACTS.Vault, i);
        const position = await vaultContract.positions(tokenId);
        if (position.borrower.toLowerCase() === account.toLowerCase()) {
          const uri = await nftContract.tokenURI(tokenId);
          const priceWei = await oracleContract.getAssetPrice(tokenId);
          const price = ethers.formatUnits(priceWei, 6);
          const debt = ethers.formatUnits(position.debt, 6);
          const usdcBal = await usdcContract.balanceOf(account);
          const usdcBalance = ethers.formatUnits(usdcBal, 6);
          vaultList.push({ tokenId: tokenId.toString(), uri, price, debt, borrowed: debt, usdcBalance });
        }
      }
      setVaultedNFTs(vaultList);
    } catch (error) {
      console.error('Load NFTs failed:', error);
    }
  };

  useEffect(() => {
    if (signer && account) {
      loadNFTs();
    }
  }, [signer, account]);

  const handleDepositCollateral = async (tokenId) => {
    setLoading(true);
    try {
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
      const approveTx = await nftContract.approve(CONTRACTS.Vault, tokenId);
      await approveTx.wait();
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi || Vault_ABI, signer);
      const depositTx = await vaultContract.depositCollateral(tokenId);
      await depositTx.wait();
      alert('✅ Collateral deposited successfully!');
      loadNFTs();
    } catch (error) {
      console.error('Deposit failed:', error);
      alert('❌ Deposit failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (tokenId, amount) => {
    setLoading(true);
    try {
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi || Vault_ABI, signer);
      const amountWei = ethers.parseUnits(amount, 6);
      const tx = await vaultContract.borrow(tokenId, amountWei);
      await tx.wait();
      alert('✅ Borrowed ' + amount + ' USDC successfully!');
      loadNFTs();
    } catch (error) {
      console.error('Borrow failed:', error);
      alert('❌ Borrow failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRepay = async (tokenId, amount) => {
    setLoading(true);
    try {
      const usdcContract = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi || MockUSDC_ABI, signer);
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi || Vault_ABI, signer);
      const amountWei = ethers.parseUnits(amount, 6);
      const approveTx = await usdcContract.approve(CONTRACTS.Vault, amountWei);
      await approveTx.wait();
      const repayTx = await vaultContract.repay(tokenId, amountWei);
      await repayTx.wait();
      alert('✅ Repaid ' + amount + ' USDC successfully!');
      loadNFTs();
    } catch (error) {
      console.error('Repay failed:', error);
      alert('❌ Repay failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (tokenId) => {
    setLoading(true);
    try {
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi || Vault_ABI, signer);
      const tx = await vaultContract.withdrawCollateral(tokenId);
      await tx.wait();
      alert('✅ Collateral withdrawn successfully!');
      loadNFTs();
    } catch (error) {
      console.error('Withdraw failed:', error);
      alert('❌ Withdraw failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="premium-card text-center p-12">
          <div className="text-6xl mb-4">💎</div>
          <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-gray-400">Please connect your wallet to borrow</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-12 text-center">
        <div className="inline-block mb-4">
          <span className="badge badge-success text-base px-4 py-2">💎 Borrower Dashboard</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="gradient-text">Borrow Against Assets</span>
        </h1>
        <p className="text-xl text-gray-400">Collateralize your RWA NFTs to borrow USDC</p>
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold flex items-center space-x-3">
            <span>💎</span><span>Your Wallet NFTs</span>
          </h2>
          <span className="badge badge-info">{walletNFTs.length} Assets</span>
        </div>

        {walletNFTs.length === 0 ? (
          <div className="premium-card text-center p-12">
            <div className="text-6xl mb-4">💎</div>
            <h3 className="text-xl font-bold mb-2">No NFTs in Wallet</h3>
            <p className="text-gray-400">Contact admin to mint RWA NFTs</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {walletNFTs.map((nft) => (
              <div key={nft.tokenId} className="premium-card group hover:scale-105 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <span className="badge badge-info">#{nft.tokenId}</span>
                  <span className="text-2xl">💎</span>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-1">Fair Market Value</div>
                  <div className="text-2xl font-bold gradient-text">${parseFloat(nft.price).toLocaleString()}</div>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-1">Max Borrowable (60% LTV)</div>
                  <div className="text-xl font-bold gradient-text-3">${(parseFloat(nft.price) * 0.6).toLocaleString()}</div>
                </div>
                <button onClick={() => handleDepositCollateral(nft.tokenId)} disabled={loading || parseFloat(nft.price) === 0} className="btn-primary w-full">
                  {loading ? '⚙️ Processing...' : '💎 Deposit as Collateral'}
                </button>
                {parseFloat(nft.price) === 0 && (
                  <p className="text-xs text-yellow-400 mt-2 text-center">⚠️ Price not set</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold flex items-center space-x-3">
            <span>💎</span><span>Collateralized Positions</span>
          </h2>
          <span className="badge badge-warning">{vaultedNFTs.length} Active</span>
        </div>

        {vaultedNFTs.length === 0 ? (
          <div className="premium-card text-center p-12">
            <div className="text-6xl mb-4">💎</div>
            <h3 className="text-xl font-bold mb-2">No Active Positions</h3>
            <p className="text-gray-400">Deposit NFTs as collateral to start borrowing</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {vaultedNFTs.map((nft) => {
              const maxBorrow = parseFloat(nft.price) * 0.6;
              const currentDebt = parseFloat(nft.debt);
              const available = maxBorrow - currentDebt;
              const healthFactor = currentDebt > 0 ? (maxBorrow / currentDebt) * 100 : 100;
              
              return (
                <div key={nft.tokenId} className="premium-card animated-border">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="badge badge-warning">NFT #{nft.tokenId}</span>
                        <span className="text-3xl">💎️</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-400">Collateral Value</div>
                          <div className="text-xl font-bold gradient-text">${parseFloat(nft.price).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Current Debt</div>
                          <div className="text-xl font-bold gradient-text-2">${parseFloat(nft.debt).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-400">Health Factor</div>
                          <div className={`text-xl font-bold ${healthFactor > 150 ? 'text-green-400' : healthFactor > 120 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {healthFactor.toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold mb-4 flex items-center space-x-2">
                        <span>💎</span><span>Borrow More</span>
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Available to Borrow</div>
                          <div className="text-2xl font-bold gradient-text-3">${available.toLocaleString()}</div>
                        </div>
                        <button onClick={() => {
                          const amount = prompt('Enter amount to borrow (USDC):', Math.floor(available).toString());
                          if (amount && parseFloat(amount) > 0 && parseFloat(amount) <= available) {
                            handleBorrow(nft.tokenId, amount);
                          }
                        }} disabled={loading || available <= 0} className="btn-success w-full">
                          {loading ? '⚙️' : '💎'} Borrow USDC
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold mb-4 flex items-center space-x-2">
                        <span>✅</span><span>Repay & Withdraw</span>
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-400 mb-1">Your USDC Balance</div>
                          <div className="text-xl font-bold gradient-text">${parseFloat(nft.usdcBalance || 0).toLocaleString()}</div>
                        </div>
                        <button onClick={() => {
                          const amount = prompt('Enter amount to repay (USDC):', nft.debt);
                          if (amount && parseFloat(amount) > 0) {
                            handleRepay(nft.tokenId, amount);
                          }
                        }} disabled={loading || currentDebt === 0} className="btn-primary w-full mb-2">
                          {loading ? '⚙️' : '💎'} Repay Loan
                        </button>
                        <button onClick={() => handleWithdraw(nft.tokenId)} disabled={loading || currentDebt > 0} className="btn-outline w-full">
                          {loading ? '⚙️' : '💎'} Withdraw NFT
                        </button>
                        {currentDebt > 0 && (
                          <p className="text-xs text-yellow-400 text-center">⚠️ Repay debt first</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="premium-card mt-8">
        <h3 className="text-2xl font-bold mb-6 flex items-center space-x-3">
          <span>ℹ️</span><span>Borrowing Guide</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl font-bold mb-3">1</div>
            <h4 className="font-bold text-lg mb-2">Deposit Collateral</h4>
            <p className="text-sm text-gray-400">Lock your RWA NFT in the vault as collateral.</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl font-bold mb-3">2</div>
            <h4 className="font-bold text-lg mb-2">Borrow USDC</h4>
            <p className="text-sm text-gray-400">Borrow up to 60% LTV. Pay 5% APY interest.</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl font-bold mb-3">3</div>
            <h4 className="font-bold text-lg mb-2">Repay & Reclaim</h4>
            <p className="text-sm text-gray-400">Repay loan with interest to withdraw your NFT.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BorrowerDashboard;
