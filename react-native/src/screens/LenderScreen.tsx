import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { CONTRACTS } from '../config/contracts';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import LendingPool_ABI from '../abis/LendingPool.json';
import { Wallet, ArrowUpRight, ArrowDownLeft, Coins, Info } from 'lucide-react-native';

const LenderScreen = () => {
  const { account, signer, isConnected } = useWallet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [poolBalance, setPoolBalance] = useState('0');
  const [userBalance, setUserBalance] = useState('0');
  const [userDeposit, setUserDeposit] = useState('0');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!signer || !account) return;

    try {
      const usdcContract = new ethers.Contract(
        CONTRACTS.MockUSDC,
        MockUSDC_ABI.abi || MockUSDC_ABI,
        signer
      );
      const poolContract = new ethers.Contract(
        CONTRACTS.LendingPool,
        LendingPool_ABI.abi || LendingPool_ABI,
        signer
      );

      const [balance, pool, deposit] = await Promise.all([
        usdcContract.balanceOf(account),
        usdcContract.balanceOf(CONTRACTS.LendingPool),
        poolContract.deposits(account),
      ]);

      setUserBalance(ethers.formatUnits(balance, 6));
      setPoolBalance(ethers.formatUnits(pool, 6));
      setUserDeposit(ethers.formatUnits(deposit, 6));
    } catch (error) {
      console.error('Load data failed:', error);
    }
  }, [signer, account]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDeposit = async () => {
    if (!signer || !account || !depositAmount) return;
    setLoading(true);
    try {
      const usdcContract = new ethers.Contract(
        CONTRACTS.MockUSDC,
        MockUSDC_ABI.abi || MockUSDC_ABI,
        signer
      );
      const poolContract = new ethers.Contract(
        CONTRACTS.LendingPool,
        LendingPool_ABI.abi || LendingPool_ABI,
        signer
      );

      const amount = ethers.parseUnits(depositAmount, 6);
      
      // Check allowance
      const allowance = await usdcContract.allowance(account, CONTRACTS.LendingPool);
      if (allowance < amount) {
        const approveTx = await usdcContract.approve(CONTRACTS.LendingPool, amount);
        await approveTx.wait();
      }

      const depositTx = await poolContract.deposit(amount);
      await depositTx.wait();
      
      Alert.alert('Success', `Deposited ${depositAmount} USDC!`);
      setDepositAmount('');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!signer || !account || !withdrawAmount) return;
    setLoading(true);
    try {
      const poolContract = new ethers.Contract(
        CONTRACTS.LendingPool,
        LendingPool_ABI.abi || LendingPool_ABI,
        signer
      );
      const amount = ethers.parseUnits(withdrawAmount, 6);
      const tx = await poolContract.withdraw(amount);
      await tx.wait();
      
      Alert.alert('Success', `Withdrawn ${withdrawAmount} USDC!`);
      setWithdrawAmount('');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Withdraw failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-slate-50 dark:bg-slate-950">
        <View className="h-24 w-24 bg-slate-100 dark:bg-slate-900 rounded-full items-center justify-center mb-6">
          <Wallet size={48} color={isDarkMode ? "#475569" : "#94a3b8"} />
        </View>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Wallet Not Connected</Text>
        <Text className="text-slate-500 dark:text-slate-400 text-center mb-8">
          Please connect your wallet to supply liquidity and earn yield.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-slate-50 dark:bg-slate-950"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-6">
        <Text className="text-slate-900 dark:text-white text-3xl font-bold mb-2">Market</Text>
        <Text className="text-slate-500 dark:text-slate-400 mb-8">Lend USDC to earn yield from RWA assets</Text>

        {/* Stats Cards */}
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

        {/* Action Section */}
        <View className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
          <View className="flex-row items-center mb-6">
            <View className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl items-center justify-center mr-3">
              <ArrowUpRight color="#4f46e5" size={20} />
            </View>
            <Text className="text-slate-900 dark:text-white text-xl font-bold">Deposit USDC</Text>
          </View>

          <View className="mb-6">
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-500 dark:text-slate-400 font-medium">Amount</Text>
              <Text className="text-slate-400 dark:text-slate-500 text-xs">Balance: {parseFloat(userBalance).toFixed(2)} USDC</Text>
            </View>
            <TextInput
              className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold text-lg border border-slate-100 dark:border-slate-700"
              placeholder="0.00"
              placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
              keyboardType="numeric"
              value={depositAmount}
              onChangeText={setDepositAmount}
            />
          </View>

          <TouchableOpacity
            onPress={handleDeposit}
            disabled={loading}
            className={`py-4 rounded-2xl items-center ${loading ? 'bg-slate-200 dark:bg-slate-800' : 'bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Deposit</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Withdraw Section */}
        <View className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <View className="flex-row items-center mb-6">
            <View className="h-10 w-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl items-center justify-center mr-3">
              <ArrowDownLeft color="#059669" size={20} />
            </View>
            <Text className="text-slate-900 dark:text-white text-xl font-bold">Withdraw USDC</Text>
          </View>

          <View className="mb-6">
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-500 dark:text-slate-400 font-medium">Amount</Text>
              <Text className="text-slate-400 dark:text-slate-500 text-xs">Available: {parseFloat(userDeposit).toFixed(2)} USDC</Text>
            </View>
            <TextInput
              className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold text-lg border border-slate-100 dark:border-slate-700"
              placeholder="0.00"
              placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
            />
          </View>

          <TouchableOpacity
            onPress={handleWithdraw}
            disabled={loading}
            className={`py-4 rounded-2xl items-center ${loading ? 'bg-slate-200 dark:bg-slate-800' : 'bg-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-none'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Withdraw</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default LenderScreen;
