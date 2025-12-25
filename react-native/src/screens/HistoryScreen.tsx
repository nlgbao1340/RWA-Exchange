import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  useColorScheme,
  Modal,
  ScrollView,
} from 'react-native';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { CONTRACTS, NETWORK } from '../config/contracts';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Repeat, 
  ExternalLink,
  User,
  Globe,
  Wallet,
  X,
  CheckCircle2,
  Clock,
  Hash,
  Box,
  ArrowRight
} from 'lucide-react-native';

interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  type: string;
  contract: string;
  from: string;
  to: string;
  amount?: string;
  tokenId?: string;
}

const HistoryScreen = () => {
  const { account, provider: walletProvider } = useWallet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'personal'>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const provider = walletProvider || new ethers.JsonRpcProvider(NETWORK.rpcUrl);
      const latestBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, latestBlock - 10000);
      
      const txList: Transaction[] = [];
      
      const usdcContract = new ethers.Contract(
        CONTRACTS.MockUSDC,
        ['event Transfer(address indexed from, address indexed to, uint256 value)'],
        provider
      );
      
      const nftContract = new ethers.Contract(
        CONTRACTS.RWA_NFT,
        ['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'],
        provider
      );

      const vaultContract = new ethers.Contract(
        CONTRACTS.Vault,
        [
          'event Borrowed(address indexed user, uint256 indexed tokenId, uint256 amount)',
          'event Repaid(address indexed user, uint256 indexed tokenId, uint256 amount)',
          'event CollateralDeposited(address indexed user, uint256 indexed tokenId)',
          'event CollateralWithdrawn(address indexed user, uint256 indexed tokenId)'
        ],
        provider
      );

      const poolContract = new ethers.Contract(
        CONTRACTS.LendingPool,
        [
          'event Deposited(address indexed user, uint256 amount)',
          'event Withdrawn(address indexed user, uint256 amount)'
        ],
        provider
      );

      const [usdcEvents, nftEvents, borrowEvents, repayEvents, poolDepositEvents, poolWithdrawEvents] = await Promise.all([
        usdcContract.queryFilter(usdcContract.filters.Transfer(), fromBlock, latestBlock),
        nftContract.queryFilter(nftContract.filters.Transfer(), fromBlock, latestBlock),
        vaultContract.queryFilter(vaultContract.filters.Borrowed(), fromBlock, latestBlock),
        vaultContract.queryFilter(vaultContract.filters.Repaid(), fromBlock, latestBlock),
        poolContract.queryFilter(poolContract.filters.Deposited(), fromBlock, latestBlock),
        poolContract.queryFilter(poolContract.filters.Withdrawn(), fromBlock, latestBlock)
      ]);
      
      usdcEvents.forEach((event: any) => {
        const from = event.args.from.toLowerCase();
        const to = event.args.to.toLowerCase();
        const pool = CONTRACTS.LendingPool.toLowerCase();
        const vault = CONTRACTS.Vault.toLowerCase();
        if (from === pool || to === pool || from === vault || to === vault) return;

        txList.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: 0,
          type: 'USDC Transfer',
          contract: 'USDC',
          from: event.args.from,
          to: event.args.to,
          amount: ethers.formatUnits(event.args.value, 6)
        });
      });

      nftEvents.forEach((event: any) => {
        const from = event.args.from.toLowerCase();
        const to = event.args.to.toLowerCase();
        const vault = CONTRACTS.Vault.toLowerCase();
        if (from === vault || to === vault) return;

        txList.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: 0,
          type: 'NFT Transfer',
          contract: 'RWA NFT',
          from: event.args.from,
          to: event.args.to,
          tokenId: event.args.tokenId.toString()
        });
      });

      borrowEvents.forEach((event: any) => {
        txList.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: 0,
          type: 'Borrowed',
          contract: 'Vault',
          from: CONTRACTS.Vault,
          to: event.args.user,
          amount: ethers.formatUnits(event.args.amount, 6),
          tokenId: event.args.tokenId.toString()
        });
      });

      repayEvents.forEach((event: any) => {
        txList.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: 0,
          type: 'Repaid',
          contract: 'Vault',
          from: event.args.user,
          to: CONTRACTS.Vault,
          amount: ethers.formatUnits(event.args.amount, 6),
          tokenId: event.args.tokenId.toString()
        });
      });

      poolDepositEvents.forEach((event: any) => {
        txList.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: 0,
          type: 'Pool Deposit',
          contract: 'LendingPool',
          from: event.args.user,
          to: CONTRACTS.LendingPool,
          amount: ethers.formatUnits(event.args.amount, 6)
        });
      });

      poolWithdrawEvents.forEach((event: any) => {
        txList.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: 0,
          type: 'Pool Withdraw',
          contract: 'LendingPool',
          from: CONTRACTS.LendingPool,
          to: event.args.user,
          amount: ethers.formatUnits(event.args.amount, 6)
        });
      });

      const sorted = txList.sort((a, b) => b.blockNumber - a.blockNumber);
      setTransactions(sorted);
    } catch (error) {
      console.error('Load transactions failed:', error);
    } finally {
      setLoading(false);
    }
  }, [walletProvider]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
    setRefreshing(false);
  };

  const filteredTransactions = viewMode === 'personal' 
    ? transactions.filter(tx => 
        account && (tx.from.toLowerCase() === account.toLowerCase() || tx.to.toLowerCase() === account.toLowerCase())
      )
    : transactions;

  const renderItem = ({ item }: { item: Transaction }) => {
    let icon = <Repeat color="#4f46e5" size={24} />;
    let iconBg = 'bg-indigo-50 dark:bg-indigo-900/20';

    if (item.type === 'Borrowed' || item.type === 'Pool Withdraw') {
      icon = <ArrowDownLeft color="#ef4444" size={24} />;
      iconBg = 'bg-red-50 dark:bg-red-900/20';
    } else if (item.type === 'Repaid' || item.type === 'Pool Deposit') {
      icon = <ArrowUpRight color="#10b981" size={24} />;
      iconBg = 'bg-emerald-50 dark:bg-emerald-900/20';
    } else if (item.type.includes('USDC')) {
      icon = <Wallet color="#059669" size={24} />;
      iconBg = 'bg-emerald-50 dark:bg-emerald-900/20';
    }

    return (
      <TouchableOpacity 
        onPress={() => setSelectedTx(item)}
        className="bg-white dark:bg-slate-900 p-4 rounded-3xl mb-3 border border-slate-100 dark:border-slate-800 flex-row items-center shadow-sm"
      >
        <View className={`h-12 w-12 rounded-2xl items-center justify-center mr-4 ${iconBg}`}>
          {icon}
        </View>
        
        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-slate-900 dark:text-white font-bold">{item.type}</Text>
            {item.amount && (
              <Text className={`font-bold ${item.type === 'Borrowed' || item.type === 'Pool Withdraw' ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {item.amount} USDC
              </Text>
            )}
          </View>
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Text className="text-slate-400 dark:text-slate-500 text-xs mr-2">Block: {item.blockNumber}</Text>
              {item.tokenId && (
                <Text className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">ID: #{item.tokenId}</Text>
              )}
            </View>
            <View className="flex-row items-center">
              <Text className="text-slate-400 dark:text-slate-500 text-xs mr-1">
                {item.from.slice(0, 4)}...{item.from.slice(-4)}
              </Text>
              <ArrowRight color="#94a3b8" size={12} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="p-6 pb-2">
        <Text className="text-slate-900 dark:text-white text-3xl font-bold mb-2">Activity</Text>
        <Text className="text-slate-500 dark:text-slate-400 mb-6">Recent blockchain transactions</Text>
        
        <View className="flex-row bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
          <TouchableOpacity 
            onPress={() => setViewMode('all')}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${viewMode === 'all' ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
          >
            <Globe size={16} color={viewMode === 'all' ? (isDarkMode ? '#fff' : '#0f172a') : '#94a3b8'} className="mr-2" />
            <Text className={`font-bold ${viewMode === 'all' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Global</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('personal')}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${viewMode === 'personal' ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
          >
            <User size={16} color={viewMode === 'personal' ? (isDarkMode ? '#fff' : '#0f172a') : '#94a3b8'} className="mr-2" />
            <Text className={`font-bold ${viewMode === 'personal' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Personal</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredTransactions}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.hash}-${item.type}-${index}`}
        contentContainerStyle={{ padding: 24, paddingTop: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDarkMode ? "#fff" : "#6366f1"} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <View className="h-20 w-20 bg-slate-100 dark:bg-slate-900 rounded-full items-center justify-center mb-4">
              <History color="#94a3b8" size={40} />
            </View>
            <Text className="text-slate-400 dark:text-slate-500 font-medium">No transactions found</Text>
          </View>
        }
      />

      <Modal
        visible={!!selectedTx}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTx(null)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 pb-12">
            <View className="flex-row justify-between items-center mb-8">
              <Text className="text-slate-900 dark:text-white text-2xl font-bold">Transaction Details</Text>
              <TouchableOpacity 
                onPress={() => setSelectedTx(null)}
                className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
              >
                <X color={isDarkMode ? "#fff" : "#0f172a"} size={20} />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="items-center mb-8">
                  <View className="h-20 w-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full items-center justify-center mb-4">
                    <CheckCircle2 color="#10b981" size={48} />
                  </View>
                  <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xl mb-1">Success</Text>
                  <Text className="text-slate-400 dark:text-slate-500">{selectedTx.type}</Text>
                </View>

                <View className="space-y-6">
                  <View className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <View className="flex-row justify-between mb-4">
                      <View className="flex-row items-center">
                        <Hash size={16} color="#94a3b8" className="mr-2" />
                        <Text className="text-slate-500 dark:text-slate-400 font-medium">Transaction Hash</Text>
                      </View>
                      <TouchableOpacity onPress={() => Linking.openURL(`https://sepolia.etherscan.io/tx/${selectedTx.hash}`)}>
                        <ExternalLink size={16} color="#6366f1" />
                      </TouchableOpacity>
                    </View>
                    <Text className="text-slate-900 dark:text-white font-mono text-xs" numberOfLines={1}>
                      {selectedTx.hash}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <View className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 w-[48%]">
                      <View className="flex-row items-center mb-2">
                        <Box size={16} color="#94a3b8" className="mr-2" />
                        <Text className="text-slate-500 dark:text-slate-400 font-medium">Block</Text>
                      </View>
                      <Text className="text-slate-900 dark:text-white font-bold">{selectedTx.blockNumber}</Text>
                    </View>
                    <View className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 w-[48%]">
                      <View className="flex-row items-center mb-2">
                        <Clock size={16} color="#94a3b8" className="mr-2" />
                        <Text className="text-slate-500 dark:text-slate-400 font-medium">Status</Text>
                      </View>
                      <Text className="text-emerald-600 dark:text-emerald-400 font-bold">Confirmed</Text>
                    </View>
                  </View>

                  <View className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800">
                    <View className="mb-6">
                      <Text className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase mb-2">From</Text>
                      <Text className="text-slate-900 dark:text-white font-mono text-xs">{selectedTx.from}</Text>
                    </View>
                    <View className="h-[1px] bg-slate-200 dark:bg-slate-700 mb-6" />
                    <View>
                      <Text className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase mb-2">To</Text>
                      <Text className="text-slate-900 dark:text-white font-mono text-xs">{selectedTx.to}</Text>
                    </View>
                  </View>

                  {selectedTx.amount && (
                    <View className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 items-center">
                      <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase mb-2">Value Transferred</Text>
                      <Text className="text-indigo-600 dark:text-indigo-400 text-3xl font-bold">{selectedTx.amount} USDC</Text>
                    </View>
                  )}

                  {selectedTx.tokenId && (
                    <View className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30 items-center">
                      <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase mb-2">Asset ID</Text>
                      <Text className="text-indigo-600 dark:text-indigo-400 text-3xl font-bold">RWA #{selectedTx.tokenId}</Text>
                    </View>
                  )}

                  <TouchableOpacity 
                    onPress={() => Linking.openURL(`https://sepolia.etherscan.io/tx/${selectedTx.hash}`)}
                    className="bg-indigo-600 py-4 rounded-2xl items-center flex-row justify-center mt-4"
                  >
                    <ExternalLink size={18} color="#fff" className="mr-2" />
                    <Text className="text-white font-bold text-lg">View on Explorer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HistoryScreen;
