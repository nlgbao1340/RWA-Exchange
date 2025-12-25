import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import LendingPool_ABI from '../abis/LendingPool.json';

function LenderPool({ signer, account }) {
  const [poolBalance, setPoolBalance] = useState('0');
  const [userBalance, setUserBalance] = useState('0');
  const [userDeposit, setUserDeposit] = useState('0');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const usdcContract = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi || MockUSDC_ABI, signer);
      const poolContract = new ethers.Contract(CONTRACTS.LendingPool, LendingPool_ABI.abi || LendingPool_ABI, signer);
      const balance = await usdcContract.balanceOf(account);
      const pool = await usdcContract.balanceOf(CONTRACTS.LendingPool);
      const deposit = await poolContract.deposits(account);
      setUserBalance(ethers.formatUnits(balance, 6));
      setPoolBalance(ethers.formatUnits(pool, 6));
      setUserDeposit(ethers.formatUnits(deposit, 6));
    } catch (error) {
      console.error('Load data failed:', error);
    }
  };

  useEffect(() => {
    if (signer && account) {
      loadData();
    }
  }, [signer, account]);

  const handleFaucet = async () => {
    setLoading(true);
    try {
      const usdcContract = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi || MockUSDC_ABI, signer);
      const tx = await usdcContract.mint(account, ethers.parseUnits('10000', 6));
      await tx.wait();
      alert('✅ Minted 10,000 USDC successfully!');
      loadData();
    } catch (error) {
      console.error('Faucet failed:', error);
      alert('❌ Faucet failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const usdcContract = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi || MockUSDC_ABI, signer);
      const poolContract = new ethers.Contract(CONTRACTS.LendingPool, LendingPool_ABI.abi || LendingPool_ABI, signer);
      const amount = ethers.parseUnits(depositAmount, 6);
      
      // Check balance
      const balance = await usdcContract.balanceOf(account);
      if (balance < amount) {
        throw new Error(`Insufficient USDC balance. You have ${ethers.formatUnits(balance, 6)} USDC.`);
      }

      // Check allowance to avoid unnecessary approve tx
      const allowance = await usdcContract.allowance(account, CONTRACTS.LendingPool);
      if (allowance < amount) {
        console.log("Approving USDC...");
        const approveTx = await usdcContract.approve(CONTRACTS.LendingPool, amount);
        await approveTx.wait();
      }

      console.log("Depositing...");
      // Manual gas limit to prevent "missing revert data" errors
      const depositTx = await poolContract.deposit(amount, { gasLimit: 300000 });
      await depositTx.wait();
      
      alert('✅ Deposited ' + depositAmount + ' USDC!');
      setDepositAmount('');
      loadData();
    } catch (error) {
      console.error('Deposit failed:', error);
      
      let errorMessage = error.message;
      if (error.reason) errorMessage = error.reason;
      if (error.info?.error?.message) errorMessage = error.info.error.message;
      
      if (errorMessage.includes("missing revert data")) {
        errorMessage = "Transaction failed. Possible reasons: Insufficient balance, allowance issue, or contract paused.";
      }
      
      alert('❌ Deposit failed: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const poolContract = new ethers.Contract(CONTRACTS.LendingPool, LendingPool_ABI.abi || LendingPool_ABI, signer);
      const amount = ethers.parseUnits(withdrawAmount, 6);
      
      // Manual gas limit
      const tx = await poolContract.withdraw(amount, { gasLimit: 300000 });
      await tx.wait();
      alert('✅ Withdrawn ' + withdrawAmount + ' USDC!');
      setWithdrawAmount('');
      loadData();
    } catch (error) {
      console.error('Withdraw failed:', error);
      
      let errorMessage = error.message;
      if (error.reason) errorMessage = error.reason;
      if (error.info?.error?.message) errorMessage = error.info.error.message;
      
      if (errorMessage.includes("missing revert data")) {
        errorMessage = "Transaction failed. Possible reasons: Insufficient deposit balance or pool liquidity.";
      }
      
      alert('❌ Withdraw failed: ' + errorMessage);
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
          <p className="text-gray-400">Please connect your wallet to supply liquidity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <div className="inline-block mb-4">
          <span className="badge badge-info text-base px-4 py-2">💎 Liquidity Provider</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="gradient-text-3">Supply Capital</span>
        </h1>
        <p className="text-xl text-gray-400">Earn yields by providing USDC liquidity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Total Pool</span>
            <span className="text-2xl">💎</span>
          </div>
          <div className="text-3xl font-bold gradient-text-3">${parseFloat(poolBalance).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Available liquidity</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Your Deposit</span>
            <span className="text-2xl">💎</span>
          </div>
          <div className="text-3xl font-bold gradient-text">${parseFloat(userDeposit).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Currently supplied</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Wallet Balance</span>
            <span className="text-2xl">💎</span>
          </div>
          <div className="text-3xl font-bold gradient-text-2">${parseFloat(userBalance).toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">USDC available</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="premium-card animated-border">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl">💎</div>
            <div>
              <h2 className="text-2xl font-bold">Supply USDC</h2>
              <p className="text-sm text-gray-400">Deposit to earn yields</p>
            </div>
          </div>
          <form onSubmit={handleDeposit} className="space-y-5">
            <div>
              <label className="label">Deposit Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                <input type="number" step="0.01" className="input pl-8" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="1000.00" required />
              </div>
              <p className="text-xs text-gray-500 mt-1">Available: ${parseFloat(userBalance).toLocaleString()}</p>
            </div>
            <div className="glass-card p-4 border border-blue-500/30">
              <div className="flex items-start space-x-3">
                <span className="text-2xl">💎</span>
                <div className="text-sm">
                  <p className="font-semibold text-blue-300 mb-1">Earnings:</p>
                  <ul className="space-y-1 text-xs text-gray-400">
                    <li>• APY: <span className="text-blue-300 font-semibold">5%</span></li>
                    <li>• Withdraw anytime</li>
                  </ul>
                </div>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full text-lg">
              {loading ? <span className="animate-spin">⚙️</span> : '💎'} {loading ? 'Processing...' : 'Supply USDC'}
            </button>
          </form>
        </div>

        <div className="premium-card animated-border">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-2xl">��</div>
            <div>
              <h2 className="text-2xl font-bold">Withdraw USDC</h2>
              <p className="text-sm text-gray-400">Remove liquidity</p>
            </div>
          </div>
          <form onSubmit={handleWithdraw} className="space-y-5">
            <div>
              <label className="label">Withdrawal Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">$</span>
                <input type="number" step="0.01" className="input pl-8" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder="500.00" required />
              </div>
              <p className="text-xs text-gray-500 mt-1">Deposited: ${parseFloat(userDeposit).toLocaleString()}</p>
            </div>
            <button type="submit" disabled={loading || parseFloat(userDeposit) === 0} className="btn-success w-full text-lg">
              {loading ? <span className="animate-spin">⚙️</span> : '✅'} {loading ? 'Processing...' : 'Withdraw'}
            </button>
            <button type="button" onClick={handleFaucet} disabled={loading} className="btn-outline w-full">
              💎 Get Test USDC
            </button>
          </form>
        </div>
      </div>

      <div className="premium-card">
        <h3 className="text-2xl font-bold mb-6 flex items-center space-x-3">
          <span>💎</span><span>How It Works</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl font-bold mb-3">1</div>
            <h4 className="font-bold text-lg mb-2">Deposit USDC</h4>
            <p className="text-sm text-gray-400">Supply stablecoins to the pool.</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center text-xl font-bold mb-3">2</div>
            <h4 className="font-bold text-lg mb-2">Earn 5% APY</h4>
            <p className="text-sm text-gray-400">Automatically earn from borrowers.</p>
          </div>
          <div className="glass-card p-5">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-xl font-bold mb-3">3</div>
            <h4 className="font-bold text-lg mb-2">Withdraw</h4>
            <p className="text-sm text-gray-400">Remove capital anytime.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LenderPool;
