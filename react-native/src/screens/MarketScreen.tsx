import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image, useColorScheme, TextInput } from 'react-native';
import { ethers } from 'ethers';
import { CONTRACTS, NETWORK } from '../config/contracts';
import RWA_NFT_ABI from '../abis/RWA_NFT.json';
import RWA_Oracle_ABI from '../abis/RWA_Oracle.json';
import Vault_ABI from '../abis/Vault.json';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import LendingPool_ABI from '../abis/LendingPool.json';
import { ShoppingBag, Info, ArrowUpRight, ArrowDownLeft, Landmark, Coins } from 'lucide-react-native';
import { useWallet } from '../context/WalletContext';

export default function MarketScreen() {
  const { account, signer, isConnected } = useWallet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  
  const [activeTab, setActiveTab] = useState<'supply' | 'borrow'>('supply');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Supply State
  const [poolBalance, setPoolBalance] = useState('0');
  const [userBalance, setUserBalance] = useState('0');
  const [userDeposit, setUserDeposit] = useState('0');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Borrow State
  const [nfts, setNfts] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
      
      // Load Supply Data
      const usdcContract = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi, provider);
      const poolContract = new ethers.Contract(CONTRACTS.LendingPool, LendingPool_ABI.abi, provider);
      
      const [poolLiq, totalDep] = await Promise.all([
        usdcContract.balanceOf(CONTRACTS.LendingPool),
        poolContract.totalDeposits()
      ]);
      setPoolBalance(ethers.formatUnits(poolLiq, 6));

      if (isConnected && account) {
        const [uBal, uDep] = await Promise.all([
          usdcContract.balanceOf(account),
          poolContract.deposits(account)
        ]);
        setUserBalance(ethers.formatUnits(uBal, 6));
        setUserDeposit(ethers.formatUnits(uDep, 6));
      }

      // Load Borrow Data
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi, provider);
      const oracleContract = new ethers.Contract(CONTRACTS.RWA_Oracle, RWA_Oracle_ABI.abi, provider);
      const totalSupply = await nftContract.totalSupply();
      const list = [];
      for (let i = 1; i <= Number(totalSupply); i++) {
        try {
          const owner = await nftContract.ownerOf(i);
          // Only show NFTs owned by the user and not in Vault
          if (owner !== CONTRACTS.Vault && account && owner.toLowerCase() === account.toLowerCase()) {
            let price = '0';
            const priceSet = await oracleContract.isPriceSet(i);
            if (priceSet) {
              const priceWei = await oracleContract.getAssetPrice(i);
              price = ethers.formatUnits(priceWei, 6);
            }
            list.push({
              tokenId: i,
              owner,
              price,
              image: `https://api.dicebear.com/7.x/identicon/png?seed=${i}`
            });
          }
        } catch (e) {}
      }
      setNfts(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isConnected, account]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, [isConnected, account]);

  const handleDeposit = async () => {
    if (!signer || !account || !depositAmount) return;
    setLoading(true);
    try {
      const usdc = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi, signer);
      const pool = new ethers.Contract(CONTRACTS.LendingPool, LendingPool_ABI.abi, signer);
      const amount = ethers.parseUnits(depositAmount, 6);
      
      const allowance = await usdc.allowance(account, CONTRACTS.LendingPool);
      if (allowance < amount) {
        const tx = await usdc.approve(CONTRACTS.LendingPool, ethers.MaxUint256);
        await tx.wait();
      }
      const tx = await pool.deposit(amount);
      await tx.wait();
      Alert.alert("Success", "Deposited successfully!");
      setDepositAmount('');
      loadData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Deposit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!signer || !account || !withdrawAmount) return;
    setLoading(true);
    try {
      const pool = new ethers.Contract(CONTRACTS.LendingPool, LendingPool_ABI.abi, signer);
      const amount = ethers.parseUnits(withdrawAmount, 6);
      const tx = await pool.withdraw(amount);
      await tx.wait();
      Alert.alert("Success", "Withdrawn successfully!");
      setWithdrawAmount('');
      loadData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Withdraw failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async (tokenId: number, price: string) => {
    if (!isConnected || !signer) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }
    const maxBorrow = Number(price) * 0.8;
    Alert.alert(
      "Borrow Request",
      `Asset Value: $${price}\nMax Borrow (80% LTV): $${maxBorrow}\n\nDo you want to borrow against this asset?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Borrow Max", 
          onPress: async () => {
            try {
              setLoading(true);
              const nft = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi, signer);
              const vault = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi, signer);
              const isApproved = await nft.getApproved(tokenId);
              if (isApproved.toLowerCase() !== CONTRACTS.Vault.toLowerCase()) {
                const tx = await nft.approve(CONTRACTS.Vault, tokenId);
                await tx.wait();
              }
              const txDep = await vault.depositCollateral(tokenId);
              await txDep.wait();
              const txBorr = await vault.borrow(tokenId, ethers.parseUnits(maxBorrow.toString(), 6));
              await txBorr.wait();
              Alert.alert("Success", "Borrowed successfully!");
              loadData();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Borrow failed");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="p-6 pb-2">
        <Text className="text-slate-900 dark:text-white text-3xl font-bold mb-2">Market</Text>
        <Text className="text-slate-500 dark:text-slate-400 mb-6">Supply liquidity or borrow against assets</Text>
        
        <View className="flex-row bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4">
          <TouchableOpacity 
            onPress={() => setActiveTab('supply')}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${activeTab === 'supply' ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
          >
            <Landmark size={16} color={activeTab === 'supply' ? (isDarkMode ? '#fff' : '#0f172a') : '#94a3b8'} className="mr-2" />
            <Text className={`font-bold ${activeTab === 'supply' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Supply</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('borrow')}
            className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${activeTab === 'borrow' ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
          >
            <ShoppingBag size={16} color={activeTab === 'borrow' ? (isDarkMode ? '#fff' : '#0f172a') : '#94a3b8'} className="mr-2" />
            <Text className={`font-bold ${activeTab === 'borrow' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>Borrow</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingTop: 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'supply' ? (
          <View>
            <View className="flex-row justify-between mb-8">
              <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 w-[48%] shadow-sm">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-2">Pool Liquidity</Text>
                <Text className="text-slate-900 dark:text-white text-xl font-bold">${parseFloat(poolBalance).toLocaleString()}</Text>
              </View>
              <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 w-[48%] shadow-sm">
                <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-2">Your Deposit</Text>
                <Text className="text-indigo-600 dark:text-indigo-400 text-xl font-bold">${parseFloat(userDeposit).toLocaleString()}</Text>
              </View>
            </View>

            <View className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
              <Text className="text-slate-900 dark:text-white text-xl font-bold mb-6">Deposit USDC</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold text-lg border border-slate-100 dark:border-slate-700 mb-6"
                placeholder="0.00"
                placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                keyboardType="numeric"
                value={depositAmount}
                onChangeText={setDepositAmount}
              />
              <TouchableOpacity
                onPress={handleDeposit}
                disabled={loading || !isConnected}
                className={`py-4 rounded-2xl items-center ${loading || !isConnected ? 'bg-slate-200 dark:bg-slate-800' : 'bg-indigo-600'}`}
              >
                <Text className="text-white font-bold text-lg">Deposit</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
              <Text className="text-slate-900 dark:text-white text-xl font-bold mb-6">Withdraw USDC</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold text-lg border border-slate-100 dark:border-slate-700 mb-6"
                placeholder="0.00"
                placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
              />
              <TouchableOpacity
                onPress={handleWithdraw}
                disabled={loading || !isConnected}
                className={`py-4 rounded-2xl items-center ${loading || !isConnected ? 'bg-slate-200 dark:bg-slate-800' : 'bg-emerald-600'}`}
              >
                <Text className="text-white font-bold text-lg">Withdraw</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {nfts.length === 0 && !loading && (
              <View className="w-full bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 items-center">
                <Text className="text-slate-400 dark:text-slate-500 text-center">
                  No NFTs found in your wallet.{"\n"}Mint or buy some to use as collateral.
                </Text>
              </View>
            )}
            
            {nfts.map((nft) => (
              <View key={nft.tokenId} className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                <Image source={{ uri: nft.image }} className="w-full aspect-square rounded-2xl mb-4" />
                <Text className="text-slate-900 dark:text-white font-bold mb-1">RWA #{nft.tokenId}</Text>
                <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-4">Value: ${parseFloat(nft.price).toLocaleString()}</Text>
                
                <TouchableOpacity 
                  onPress={() => handleBorrow(nft.tokenId, nft.price)}
                  className="bg-indigo-600 py-2 rounded-xl items-center"
                >
                  <Text className="text-white font-bold text-xs">Borrow</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

