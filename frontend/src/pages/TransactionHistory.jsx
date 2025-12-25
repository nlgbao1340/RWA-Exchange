import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACTS } from '../config/contracts';

function TransactionHistory({ account, provider }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, deposit, borrow, repay, liquidation
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'personal'
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState(null);
  const itemsPerPage = 10;

  const loadTransactions = async () => {
    console.log('[TransactionHistory] loadTransactions called', { provider: !!provider });
    
    if (!provider) {
      console.log('[TransactionHistory] No provider, skipping load');
      return;
    }
    
    setLoading(true);
    
    // --- CACHE IMPLEMENTATION START ---
    const CACHE_KEY = 'RWA_TX_HISTORY_V1';
    let cachedData = { lastBlock: 0, transactions: [] };
    try {
      const saved = localStorage.getItem(CACHE_KEY);
      if (saved) {
        cachedData = JSON.parse(saved);
        if (!Array.isArray(cachedData.transactions)) cachedData.transactions = [];
      }
    } catch (e) {
      console.warn('Failed to load transaction cache', e);
    }

    // Initialize with cached transactions immediately
    let allFetchedTxs = [...cachedData.transactions];
    setTransactions(allFetchedTxs);
    console.log(`Loaded ${allFetchedTxs.length} transactions from cache. Last block: ${cachedData.lastBlock}`);
    // --- CACHE IMPLEMENTATION END ---
    
    try {
      // Get latest block
      const latestBlock = await provider.getBlockNumber();
      console.log('Latest block:', latestBlock);
      
      // If cache is fresh, stop here
      if (latestBlock <= cachedData.lastBlock) {
        console.log('Cache is up to date.');
        setLoading(false);
        return;
      }
      
      // Alchemy Free Tier has a strict 10-block limit for eth_getLogs
      const BLOCK_CHUNK_SIZE = 10; 
      
      // Query last ~500 blocks to prevent 429 errors and long load times
      // 500 blocks is approx 1.5 hours of history. 
      // Increase this value with caution on free tier.
      const MAX_HISTORY_QUERY = 2000;
      let fromBlock = cachedData.lastBlock > 0 ? cachedData.lastBlock + 1 : Math.max(0, latestBlock - 500);
      
      // If the gap is too huge, just fetch the recent ones
      if (latestBlock - fromBlock > MAX_HISTORY_QUERY) {
         fromBlock = latestBlock - MAX_HISTORY_QUERY;
         console.log('Gap too large, limiting query to last', MAX_HISTORY_QUERY, 'blocks');
      }
      
      console.log(`Querying blocks from ${fromBlock} to ${latestBlock} (Chunk size: ${BLOCK_CHUNK_SIZE})`)
      
      // Keep track of all transactions locally to merge and sort
      // allFetchedTxs is already initialized with cache

      // Helper to process events into transactions and update state incrementally
      const processAndAddEvents = async (events, type, contractLabel, extraDataFn) => {
        const newTxs = [];
        for (const event of events) {
          try {
            // Add delay for getBlock to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 50));
            const block = await provider.getBlock(event.blockNumber);
            
            const txData = {
              hash: event.transactionHash,
              blockNumber: event.blockNumber,
              timestamp: block.timestamp,
              type: type,
              contract: contractLabel,
              ...extraDataFn(event)
            };
            newTxs.push(txData);
          } catch (err) {
            console.error('Error fetching block for event:', err);
          }
        }
        
        if (newTxs.length > 0) {
          allFetchedTxs = [...allFetchedTxs, ...newTxs];
          // Sort by timestamp (newest first)
          allFetchedTxs.sort((a, b) => b.timestamp - a.timestamp);
          setTransactions([...allFetchedTxs]);
        }
      };
      
      // Helper function to query with chunking and retry logic
      // SEQUENTIAL execution to avoid 429 Too Many Requests
      const queryEventsWithChunking = async (contract, eventFilter, fromBlockStart, toBlockEnd) => {
        const events = [];
        const MAX_RETRIES = 5;
        
        // Create chunks
        const chunks = [];
        for (let i = fromBlockStart; i <= toBlockEnd; i += BLOCK_CHUNK_SIZE) {
          chunks.push({
            start: i,
            end: Math.min(i + BLOCK_CHUNK_SIZE - 1, toBlockEnd)
          });
        }

        // Process chunks sequentially
        for (const chunk of chunks) {
          let retries = 0;
          let success = false;
          
          while (retries < MAX_RETRIES && !success) {
            try {
              // Add delay to respect rate limits (Alchemy Free Tier)
              await new Promise(resolve => setTimeout(resolve, 200));
              
              const chunkEvents = await contract.queryFilter(eventFilter, chunk.start, chunk.end);
              events.push(...chunkEvents);
              success = true;
            } catch (error) {
              retries++;
              const isRateLimit = error.message && (error.message.includes('429') || error.message.includes('compute units'));
              
              if (retries >= MAX_RETRIES) {
                console.error(`Failed to query blocks ${chunk.start}-${chunk.end}:`, error.message);
                break; 
              }
              
              // Exponential backoff, longer if rate limited
              const delayMs = (isRateLimit ? 2000 : 500) * Math.pow(2, retries - 1);
              console.log(`Retry ${retries}/${MAX_RETRIES} for blocks ${chunk.start}-${chunk.end} after ${delayMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        }
        
        return events;
      };
      
      // 1. USDC Transfers
      try {
        const usdcContract = new ethers.Contract(
          CONTRACTS.MockUSDC,
          ['event Transfer(address indexed from, address indexed to, uint256 value)'],
          provider
        );
        const usdcEvents = await queryEventsWithChunking(
          usdcContract, 
          usdcContract.filters.Transfer(), 
          fromBlock, 
          latestBlock
        );
        console.log('USDC Transfers:', usdcEvents.length);
        await processAndAddEvents(usdcEvents, 'Transfer', 'USDC', (event) => ({
            from: event.args.from,
            to: event.args.to,
            amount: event.args.value
        }));
      } catch (e) {
        console.error('Error loading USDC events:', e.message);
      }

      // 2. NFT Transfers
      try {
        const nftContract = new ethers.Contract(
          CONTRACTS.RWA_NFT,
          ['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'],
          provider
        );
        const nftEvents = await queryEventsWithChunking(
          nftContract,
          nftContract.filters.Transfer(),
          fromBlock,
          latestBlock
        );
        console.log('NFT Transfers:', nftEvents.length);
        await processAndAddEvents(nftEvents, 'NFTTransfer', 'NFT', (event) => ({
            from: event.args.from,
            to: event.args.to,
            tokenId: event.args.tokenId
        }));
      } catch (e) {
        console.error('Error loading NFT events:', e.message);
      }

      // 3. LendingPool Events
      try {
        const poolContract = new ethers.Contract(
          CONTRACTS.LendingPool,
          [
            'event Deposit(address indexed user, uint256 amount)',
            'event Withdraw(address indexed user, uint256 amount)'
          ],
          provider
        );
        
        const depositEvents = await queryEventsWithChunking(
          poolContract,
          poolContract.filters.Deposit(),
          fromBlock,
          latestBlock
        );
        console.log('Deposits:', depositEvents.length);
        await processAndAddEvents(depositEvents, 'Deposit', 'LendingPool', (event) => ({
            user: event.args.user,
            amount: event.args.amount
        }));
        
        const withdrawEvents = await queryEventsWithChunking(
          poolContract,
          poolContract.filters.Withdraw(),
          fromBlock,
          latestBlock
        );
        console.log('Withdraws:', withdrawEvents.length);
        await processAndAddEvents(withdrawEvents, 'Withdraw', 'LendingPool', (event) => ({
            user: event.args.user,
            amount: event.args.amount
        }));
      } catch (e) {
        console.error('Error loading LendingPool events:', e.message);
      }

      // 4. Vault Events
      try {
        const vaultContract = new ethers.Contract(
          CONTRACTS.Vault,
          [
            'event CollateralDeposited(address indexed user, uint256 indexed tokenId)',
            'event Borrowed(address indexed user, uint256 indexed tokenId, uint256 amount)',
            'event Repaid(address indexed user, uint256 indexed tokenId, uint256 amount)',
            'event CollateralWithdrawn(address indexed user, uint256 indexed tokenId)'
          ],
          provider
        );
        
        const collateralEvents = await queryEventsWithChunking(
          vaultContract,
          vaultContract.filters.CollateralDeposited(),
          fromBlock,
          latestBlock
        );
        console.log('Collateral Deposits:', collateralEvents.length);
        await processAndAddEvents(collateralEvents, 'CollateralDeposited', 'Vault', (event) => ({
            user: event.args.user,
            tokenId: event.args.tokenId
        }));
        
        const borrowEvents = await queryEventsWithChunking(
          vaultContract,
          vaultContract.filters.Borrowed(),
          fromBlock,
          latestBlock
        );
        console.log('Borrows:', borrowEvents.length);
        await processAndAddEvents(borrowEvents, 'Borrowed', 'Vault', (event) => ({
            user: event.args.user,
            tokenId: event.args.tokenId,
            amount: event.args.amount
        }));
        
        const repayEvents = await queryEventsWithChunking(
          vaultContract,
          vaultContract.filters.Repaid(),
          fromBlock,
          latestBlock
        );
        console.log('Repayments:', repayEvents.length);
        await processAndAddEvents(repayEvents, 'Repaid', 'Vault', (event) => ({
            user: event.args.user,
            tokenId: event.args.tokenId,
            amount: event.args.amount
        }));
        
        const withdrawCollateralEvents = await queryEventsWithChunking(
          vaultContract,
          vaultContract.filters.CollateralWithdrawn(),
          fromBlock,
          latestBlock
        );
        console.log('Collateral Withdrawals:', withdrawCollateralEvents.length);
        await processAndAddEvents(withdrawCollateralEvents, 'CollateralWithdrawn', 'Vault', (event) => ({
            user: event.args.user,
            tokenId: event.args.tokenId
        }));
      } catch (e) {
        console.error('Error loading Vault events:', e.message);
      }

      // 5. Liquidation Events
      try {
        const liquidationContract = new ethers.Contract(
          CONTRACTS.LiquidationManager,
          [
            'event AuctionStarted(uint256 indexed tokenId, uint256 debtAmount, uint256 endTime)',
            'event BidPlaced(uint256 indexed tokenId, address indexed bidder, uint256 amount)',
            'event AuctionEnded(uint256 indexed tokenId, address indexed winner, uint256 finalBid)'
          ],
          provider
        );
        
        const auctionStartEvents = await queryEventsWithChunking(
          liquidationContract,
          liquidationContract.filters.AuctionStarted(),
          fromBlock,
          latestBlock
        );
        console.log('Auctions Started:', auctionStartEvents.length);
        await processAndAddEvents(auctionStartEvents, 'AuctionStarted', 'Liquidation', (event) => ({
            tokenId: event.args.tokenId,
            debtAmount: event.args.debtAmount
        }));
        
        const bidEvents = await queryEventsWithChunking(
          liquidationContract,
          liquidationContract.filters.BidPlaced(),
          fromBlock,
          latestBlock
        );
        console.log('Bids Placed:', bidEvents.length);
        await processAndAddEvents(bidEvents, 'BidPlaced', 'Liquidation', (event) => ({
            tokenId: event.args.tokenId,
            bidder: event.args.bidder,
            amount: event.args.amount
        }));
        
        const auctionEndEvents = await queryEventsWithChunking(
          liquidationContract,
          liquidationContract.filters.AuctionEnded(),
          fromBlock,
          latestBlock
        );
        console.log('Auctions Ended:', auctionEndEvents.length);
        await processAndAddEvents(auctionEndEvents, 'AuctionEnded', 'Liquidation', (event) => ({
            tokenId: event.args.tokenId,
            winner: event.args.winner,
            amount: event.args.finalBid
        }));
      } catch (e) {
        console.error('Error loading Liquidation events:', e.message);
      }

      console.log('[TransactionHistory] Total transactions loaded:', allFetchedTxs.length);
      
      // --- SAVE CACHE START ---
      // Sort by timestamp (newest first)
      allFetchedTxs.sort((a, b) => b.timestamp - a.timestamp);
      
      // Limit cache size to prevent localStorage overflow (e.g. 1000 items)
      const CACHE_LIMIT = 1000;
      const txsToCache = allFetchedTxs.slice(0, CACHE_LIMIT);
      
      try {
        localStorage.setItem('RWA_TX_HISTORY_V1', JSON.stringify({
          lastBlock: latestBlock,
          transactions: txsToCache
        }));
        console.log(`Saved ${txsToCache.length} transactions to cache. Last block: ${latestBlock}`);
      } catch (e) {
        console.warn('Failed to save transaction cache', e);
      }
      // --- SAVE CACHE END ---

    } catch (error) {
      console.error('[TransactionHistory] Load transactions failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (provider) {
      loadTransactions();
    }
  }, [provider]);

  const getTypeInfo = (type) => {
    const types = {
      'Deposit': { label: 'Supply', icon: '💰', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
      'Withdraw': { label: 'Withdraw', icon: '💸', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
      'CollateralDeposited': { label: 'Collateral Deposit', icon: '🔒', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
      'Borrowed': { label: 'Borrow', icon: '📤', color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
      'Repaid': { label: 'Repay', icon: '📥', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
      'CollateralWithdrawn': { label: 'Collateral Withdraw', icon: '🔓', color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/30' },
      'AuctionStarted': { label: 'Auction Started', icon: '🔨', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
      'BidPlaced': { label: 'Bid Placed', icon: '💎', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
      'AuctionEnded': { label: 'Auction Won', icon: '🏆', color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500/30' },
      'Transfer': { label: 'Transfer', icon: '↔️', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' }
    };
    return types[type] || { label: type, icon: '📝', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' };
  };

  const formatValue = (tx) => {
    if (tx.amount) {
      const decimals = tx.contract === 'NFT' ? 0 : 6;
      return ethers.formatUnits(tx.amount, decimals) + (tx.contract === 'USDC' || tx.contract === 'LendingPool' || tx.contract === 'Vault' ? ' USDC' : '');
    }
    if (tx.tokenId) {
      return `NFT #${tx.tokenId.toString()}`;
    }
    if (tx.value) {
      return ethers.formatUnits(tx.value, 18) + ' ETH';
    }
    return '-';
  };

  // Filter by personal transactions if in personal mode
  let displayedTxs = transactions;
  if (viewMode === 'personal' && account) {
    displayedTxs = transactions.filter(tx => {
      const accountLower = account.toLowerCase();
      return (
        (tx.from && tx.from.toLowerCase() === accountLower) ||
        (tx.to && tx.to.toLowerCase() === accountLower) ||
        (tx.user && tx.user.toLowerCase() === accountLower) ||
        (tx.bidder && tx.bidder.toLowerCase() === accountLower) ||
        (tx.winner && tx.winner.toLowerCase() === accountLower)
      );
    });
  }

  const filteredTxs = filter === 'all' 
    ? displayedTxs 
    : displayedTxs.filter(tx => {
        switch (filter) {
          case 'deposit': 
            return tx.type === 'Deposit' || tx.type === 'CollateralDeposited';
          case 'borrow': 
            return tx.type === 'Borrowed';
          case 'repay': 
            return tx.type === 'Repaid';
          case 'liquidation': 
            return tx.type.includes('Auction') || tx.type === 'BidPlaced';
          default: 
            return true;
        }
      });

  const paginatedTxs = filteredTxs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage);

  console.log('[TransactionHistory] Render:', {
    totalTransactions: transactions.length,
    displayedTxsLength: displayedTxs.length,
    viewMode,
    filter,
    filteredTxsLength: filteredTxs.length,
    paginatedTxsLength: paginatedTxs.length,
    loading
  });

  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!provider) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="premium-card text-center p-12">
          <div className="text-6xl mb-4">📜</div>
          <h2 className="text-2xl font-bold mb-2">No Provider</h2>
          <p className="text-gray-400">Unable to connect to blockchain</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="inline-block mb-4">
          <span className="badge badge-info text-base px-4 py-2">📜 Transaction History</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">
          <span className="gradient-text">Blockchain Activity</span>
        </h1>
        <p className="text-xl text-gray-400">All transactions on the RWA Exchange platform</p>
      </div>

      {/* View Mode Toggle - Only show if wallet connected */}
      {account && (
        <div className="mb-6 flex justify-center">
          <div className="inline-flex bg-white/5 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => { setViewMode('all'); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                viewMode === 'all'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🌐 All Transactions
            </button>
            <button
              onClick={() => { setViewMode('personal'); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                viewMode === 'personal'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              👤 My Transactions
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Transactions</div>
              <div className="text-3xl font-bold gradient-text">{displayedTxs.length}</div>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Last 24 Hours</div>
              <div className="text-3xl font-bold gradient-text-2">
                {displayedTxs.filter(tx => tx.timestamp > Date.now() / 1000 - 86400).length}
              </div>
            </div>
            <div className="text-4xl">⏰</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">Pending</div>
              <div className="text-3xl font-bold gradient-text-3">0</div>
            </div>
            <div className="text-4xl">⏳</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="premium-card mb-6">
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'all', label: 'All', icon: '📝' },
            { value: 'deposit', label: 'Deposits', icon: '💰' },
            { value: 'borrow', label: 'Borrows', icon: '📤' },
            { value: 'repay', label: 'Repayments', icon: '📥' },
            { value: 'liquidation', label: 'Liquidations', icon: '🔨' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => { setFilter(tab.value); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center space-x-2 ${
                filter === tab.value 
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' 
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List */}
      <div className="premium-card">
        {loading && transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4 animate-spin">⚙️</div>
            <p className="text-gray-400">Loading transactions...</p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="flex items-center justify-center space-x-2 py-2 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="animate-spin">⚙️</div>
                <span className="text-sm text-blue-300">Syncing with blockchain... ({transactions.length} found)</span>
              </div>
            )}

            {paginatedTxs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold mb-2">No Transactions Found</h3>
                <p className="text-gray-400">
                  {viewMode === 'personal' 
                    ? 'You have no transactions yet. Start by supplying or borrowing!' 
                    : 'No transactions on the blockchain yet.'}
                </p>
              </div>
            ) : (
              <>
                {/* Table Header */}
            <div className="hidden lg:grid grid-cols-6 gap-4 pb-4 mb-4 border-b border-white/10 text-sm text-gray-400 font-semibold">
              <div>TYPE</div>
              <div>HASH</div>
              <div>VALUE</div>
              <div>BLOCK</div>
              <div>TIME</div>
              <div>STATUS</div>
            </div>

            {/* Transaction Rows */}
            <div className="space-y-3">
              {paginatedTxs.map((tx, index) => {
                const typeInfo = getTypeInfo(tx.type);
                return (
                  <div 
                    key={index}
                    onClick={() => setSelectedTx(tx)}
                    className="glass-card p-4 hover:bg-white/10 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-center">
                      {/* Type */}
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg ${typeInfo.bg} border ${typeInfo.border} flex items-center justify-center text-xl`}>
                          {typeInfo.icon}
                        </div>
                        <div>
                          <div className={`font-semibold ${typeInfo.color}`}>{typeInfo.label}</div>
                          <div className="text-xs text-gray-500">{tx.contract}</div>
                        </div>
                      </div>

                      {/* Hash */}
                      <div className="font-mono text-sm">
                        <span className="text-purple-400">{tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}</span>
                      </div>

                      {/* Value */}
                      <div className="font-bold text-white">
                        {formatValue(tx)}
                      </div>

                      {/* Block */}
                      <div className="text-blue-400 font-mono text-sm">
                        {tx.blockNumber}
                      </div>

                      {/* Time */}
                      <div className="text-gray-400 text-sm">
                        {formatTimeAgo(tx.timestamp)}
                      </div>

                      {/* Status */}
                      <div className="flex items-center justify-between">
                        <span className="badge badge-success text-xs">✓ Passed</span>
                        <span className="text-gray-500 group-hover:text-purple-400 transition-colors">→</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
                <div className="text-sm text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredTxs.length)} of {filteredTxs.length}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="btn-outline px-3 py-1 text-sm disabled:opacity-30"
                  >
                    ««
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-outline px-3 py-1 text-sm disabled:opacity-30"
                  >
                    «
                  </button>
                  <div className="flex space-x-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      const pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                      if (pageNum > totalPages) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 rounded-lg text-sm ${
                            pageNum === currentPage 
                              ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' 
                              : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-outline px-3 py-1 text-sm disabled:opacity-30"
                  >
                    »
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="btn-outline px-3 py-1 text-sm disabled:opacity-30"
                  >
                    »»
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTx(null)}
        >
          <div 
            className="premium-card max-w-2xl w-full animated-border"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold gradient-text">Transaction Details</h3>
              <button 
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-4 border border-white/10">
                <div className="text-sm text-gray-400 mb-1">Transaction Hash</div>
                <div className="font-mono text-purple-400 break-all">{selectedTx.hash}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">Block</div>
                  <div className="font-bold text-white">{selectedTx.blockNumber}</div>
                </div>
                <div className="glass-card p-4 border border-white/10">
                  <div className="text-sm text-gray-400 mb-1">Status</div>
                  <div className="badge badge-success">✓ Passed</div>
                </div>
              </div>

              <div className="glass-card p-4 border border-white/10">
                <div className="text-sm text-gray-400 mb-1">Timestamp</div>
                <div className="font-bold text-white">
                  {new Date(selectedTx.timestamp * 1000).toLocaleString()} 
                  <span className="text-gray-400 text-sm ml-2">({formatTimeAgo(selectedTx.timestamp)})</span>
                </div>
              </div>

              <div className="glass-card p-4 border border-white/10">
                <div className="text-sm text-gray-400 mb-1">Type</div>
                <div className="font-bold text-white">{getTypeInfo(selectedTx.type).label}</div>
              </div>

              <div className="glass-card p-4 border border-white/10">
                <div className="text-sm text-gray-400 mb-1">Value</div>
                <div className="font-bold gradient-text text-xl">{formatValue(selectedTx)}</div>
              </div>

              <a
                href={`https://etherscan.io/tx/${selectedTx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <span>View on Explorer</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionHistory;
