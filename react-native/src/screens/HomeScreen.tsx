import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, useColorScheme, Appearance } from 'react-native';
import { ethers } from 'ethers';
import { CONTRACTS, NETWORK } from '../config/contracts';
import LendingPoolABI from '../abis/LendingPool.json';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import { Wallet, TrendingUp, ShieldCheck, Gavel, ShoppingBag, Briefcase, LogOut, Landmark, History as HistoryIcon, Coins, Shield, Activity, Moon, Sun } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useWallet } from '../context/WalletContext';
import ConnectWalletModal from '../components/ConnectWalletModal';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { account, signer, isConnected, disconnect, isAdmin } = useWallet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    Appearance.setColorScheme(nextTheme);
  };

  const [balance, setBalance] = useState('0');
  const [totalLiquidity, setTotalLiquidity] = useState('0');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFaucetLoading, setIsFaucetLoading] = useState(false);

  const loadData = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
      const usdc = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi, provider);
      const lendingPool = new ethers.Contract(CONTRACTS.LendingPool, LendingPoolABI.abi, provider);

      if (isConnected && account) {
        const bal = await usdc.balanceOf(account);
        setBalance(ethers.formatUnits(bal, 6));
      } else {
        setBalance('0');
      }

      const totalDep = await lendingPool.totalDeposits();
      setTotalLiquidity(ethers.formatUnits(totalDep, 6));
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isConnected, account]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, [isConnected, account]);

  const handleConnect = () => {
    setIsModalVisible(true);
  };

  const handleFaucet = async () => {
    if (!isConnected || !signer) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    setIsFaucetLoading(true);
    try {
      const usdc = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi, signer);
      const tx = await usdc.mint(account, ethers.parseUnits("10000", 6));
      await tx.wait();
      Alert.alert("Success", "Minted 10,000 USDC successfully!");
      loadData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Faucet failed");
    } finally {
      setIsFaucetLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!isConnected || !signer) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    try {
      const usdc = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi, signer);
      const lendingPool = new ethers.Contract(CONTRACTS.LendingPool, LendingPoolABI.abi, signer);

      Alert.alert(
        "Deposit USDC",
        "Enter amount to deposit (Demo: 1000 USDC)",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Deposit 1000", 
            onPress: async () => {
              try {
                setLoading(true);
                const amount = ethers.parseUnits("1000", 6);
                
                // Check allowance
                const allowance = await usdc.allowance(account, CONTRACTS.LendingPool);
                if (allowance < amount) {
                  const txApprove = await usdc.approve(CONTRACTS.LendingPool, ethers.MaxUint256);
                  await txApprove.wait();
                }

                const tx = await lendingPool.deposit(amount);
                await tx.wait();
                
                Alert.alert("Success", "Deposited 1000 USDC!");
                loadData();
              } catch (err: any) {
                Alert.alert("Error", err.message || "Failed to deposit");
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !signer) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    try {
      const lendingPool = new ethers.Contract(CONTRACTS.LendingPool, LendingPoolABI.abi, signer);

      Alert.alert(
        "Withdraw USDC",
        "Enter amount to withdraw (Demo: 500 USDC)",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Withdraw 500", 
            onPress: async () => {
              try {
                setLoading(true);
                const amount = ethers.parseUnits("500", 6);
                const tx = await lendingPool.withdraw(amount);
                await tx.wait();
                
                Alert.alert("Success", "Withdrawn 500 USDC!");
                loadData();
              } catch (err: any) {
                Alert.alert("Error", err.message || "Failed to withdraw");
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <ScrollView 
        className="flex-1 bg-slate-50 dark:bg-slate-950"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-6">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-8">
            <View className="flex-1 mr-4">
              <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">Welcome back,</Text>
              <Text className="text-slate-900 dark:text-white text-2xl font-bold" numberOfLines={1}>
                {isConnected ? `${account?.slice(0, 6)}...${account?.slice(-4)}` : "Guest"}
              </Text>
            </View>
            <View className="flex-row">
              <TouchableOpacity 
                onPress={toggleTheme}
                className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-2xl items-center justify-center mr-2"
              >
                {isDarkMode ? <Sun color="#fbbf24" size={24} /> : <Moon color="#6366f1" size={24} />}
              </TouchableOpacity>
              {isConnected && (
                <TouchableOpacity 
                  onPress={handleFaucet}
                  disabled={isFaucetLoading}
                  className="h-12 w-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl items-center justify-center mr-2"
                >
                  {isFaucetLoading ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <Coins color="#10b981" size={24} />
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                onPress={() => isConnected ? disconnect() : handleConnect()}
                className={`h-12 w-12 ${isConnected ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-200 dark:bg-slate-800'} rounded-2xl items-center justify-center`}
              >
                {isConnected ? (
                  <LogOut color="#ef4444" size={24} />
                ) : (
                  <Wallet color="#64748b" size={24} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {!isConnected ? (
            <View className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 items-center mb-8 shadow-sm">
              <View className="h-20 w-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full items-center justify-center mb-6">
                <ShieldCheck color="#4f46e5" size={40} />
              </View>
              <Text className="text-slate-900 dark:text-white text-2xl font-bold mb-3 text-center">Connect Wallet</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center mb-8 leading-6">
                Connect your secure wallet to start managing your RWA assets and earning yield.
              </Text>
              <TouchableOpacity 
                onPress={handleConnect}
                activeOpacity={0.8}
                className="bg-indigo-600 py-4 rounded-2xl w-full items-center shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                <Text className="text-white font-bold text-lg">Connect Wallet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Balance Card */
            <View className="bg-indigo-600 p-8 rounded-[40px] shadow-2xl shadow-indigo-300 dark:shadow-none mb-8">
              <View className="flex-row justify-between items-start mb-6">
                <View>
                  <Text className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Total Balance</Text>
                  <Text className="text-white text-4xl font-bold">${parseFloat(balance).toLocaleString()}</Text>
                </View>
                <View className="bg-white/20 p-3 rounded-2xl">
                  <TrendingUp color="white" size={24} />
                </View>
              </View>
              <View className="flex-row justify-between items-center pt-6 border-t border-white/10">
                <View>
                  <Text className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-1">Pool Liquidity</Text>
                  <Text className="text-white text-lg font-bold">${parseFloat(totalLiquidity).toLocaleString()}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Market')}
                  className="bg-white px-6 py-3 rounded-2xl"
                >
                  <Text className="text-indigo-600 font-bold">Market</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <Text className="text-slate-900 dark:text-white text-xl font-bold mb-4">Quick Actions</Text>
          <View className="flex-row flex-wrap justify-between">
            <QuickAction 
              icon={<ShoppingBag color="#4f46e5" size={24} />} 
              label="Market" 
              onPress={() => navigation.navigate('Market')}
              color="bg-indigo-50 dark:bg-indigo-900/20"
            />
            <QuickAction 
              icon={<Briefcase color="#059669" size={24} />} 
              label="Portfolio" 
              onPress={() => navigation.navigate('Portfolio')}
              color="bg-emerald-50 dark:bg-emerald-900/20"
            />
            <QuickAction 
              icon={<Activity color="#7c3aed" size={24} />} 
              label="Activity" 
              onPress={() => navigation.navigate('Activity')}
              color="bg-purple-50 dark:bg-purple-900/20"
            />
            {isConnected && isAdmin && (
              <QuickAction 
                icon={<Shield color="#475569" size={24} />} 
                label="Admin" 
                onPress={() => navigation.navigate('Admin')}
                color="bg-slate-100 dark:bg-slate-800"
              />
            )}
            <QuickAction 
              icon={<Coins color="#db2777" size={24} />} 
              label="Faucet" 
              onPress={handleFaucet}
              color="bg-pink-50 dark:bg-pink-900/20"
            />
          </View>
        </View>
      </ScrollView>

      <ConnectWalletModal 
        visible={isModalVisible} 
        onClose={() => setIsModalVisible(false)} 
      />
    </>
  );
}

function QuickAction({ icon, label, onPress, color }: { icon: any, label: string, onPress: () => void, color: string }) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={0.7}
      className="w-[31%] mb-4"
    >
      <View className={`p-4 rounded-[24px] ${color} items-center border border-white dark:border-slate-800 shadow-sm`}>
        <View className="mb-2">{icon}</View>
        <Text className="text-slate-900 dark:text-slate-200 font-bold text-[10px]">{label}</Text>
      </View>
    </TouchableOpacity>
  );
}
