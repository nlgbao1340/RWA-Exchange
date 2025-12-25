import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image, useColorScheme, TextInput, Modal } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { ethers } from 'ethers';
import { CONTRACTS, NETWORK } from '../config/contracts';
import RWA_NFT_ABI from '../abis/RWA_NFT.json';
import RWA_Oracle_ABI from '../abis/RWA_Oracle.json';
import Vault_ABI from '../abis/Vault.json';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import LendingPool_ABI from '../abis/LendingPool.json';
import { ShoppingBag, Info, ArrowUpRight, ArrowDownLeft, Landmark, Coins, X } from 'lucide-react-native';
import { useWallet } from '../context/WalletContext';

export default function MarketScreen() {
  const { account, signer, isConnected } = useWallet();
  const route = useRoute<any>();
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
  const [borrowModalVisible, setBorrowModalVisible] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [borrowAmount, setBorrowAmount] = useState('');

  useEffect(() => {
    if (route.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route.params]);

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
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi, provider);
      const totalSupply = await nftContract.totalSupply();
      const list = [];
      
      for (let i = 1; i <= Number(totalSupply); i++) {
        try {
          const owner = await nftContract.ownerOf(i);
          let isUserNFT = false;
          let status: 'wallet' | 'vault' = 'wallet';
          let debt = '0';

          if (account && owner.toLowerCase() === account.toLowerCase()) {
            isUserNFT = true;
            status = 'wallet';
          } else if (owner.toLowerCase() === CONTRACTS.Vault.toLowerCase()) {
            const position = await vaultContract.positions(i);
            if (account && position.owner.toLowerCase() === account.toLowerCase()) {
              isUserNFT = true;
              status = 'vault';
              debt = ethers.formatUnits(position.debt, 6);
            }
          }

          if (isUserNFT) {
            let price = '0';
            let priceSet = false;
            try {
              priceSet = await oracleContract.isPriceSet(i);
              if (priceSet) {
                const priceWei = await oracleContract.getAssetPrice(i);
                price = ethers.formatUnits(priceWei, 6);
              }
            } catch (e) {}

            list.push({
              tokenId: i,
              owner,
              price,
              priceSet,
              status,
              debt,
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

  const handleDepositCollateral = async (tokenId: number) => {
    if (!isConnected || !signer) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    Alert.alert(
      "Confirm Deposit",
      `Do you want to deposit RWA #${tokenId} as collateral into the Vault?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setLoading(true);
            try {
              const nft = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi, signer);
              const vault = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi, signer);
              
              // Check approval
              const isApproved = await nft.getApproved(tokenId);
              if (isApproved.toLowerCase() !== CONTRACTS.Vault.toLowerCase()) {
                const tx = await nft.approve(CONTRACTS.Vault, tokenId);
                await tx.wait();
              }
              
              const txDep = await vault.depositCollateral(tokenId);
              await txDep.wait();
              Alert.alert("Success", "NFT deposited as collateral!");
              loadData();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Deposit failed");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleBorrow = (nft: any) => {
    if (!nft.priceSet) {
      Alert.alert("Error", "Price not set for this asset. Please wait for oracle update.");
      return;
    }
    setSelectedNFT(nft);
    const maxBorrow = Number(nft.price) * 0.6 - Number(nft.debt);
    setBorrowAmount(maxBorrow > 0 ? maxBorrow.toString() : '0');
    setBorrowModalVisible(true);
  };

  const confirmBorrow = async () => {
    if (!signer || !selectedNFT || !borrowAmount) return;
    
    const amountToBorrow = parseFloat(borrowAmount);
    const maxBorrow = Number(selectedNFT.price) * 0.6 - Number(selectedNFT.debt);

    if (isNaN(amountToBorrow) || amountToBorrow <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (amountToBorrow > maxBorrow) {
      Alert.alert("Error", `Exceeds borrowing limit. Max available: $${maxBorrow.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setBorrowModalVisible(false);
    try {
      const vault = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi, signer);
      const txBorr = await vault.borrow(selectedNFT.tokenId, ethers.parseUnits(borrowAmount, 6));
      await txBorr.wait();
      Alert.alert("Success", `Borrowed $${borrowAmount} USDC!`);
      loadData();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Borrow failed");
    } finally {
      setLoading(false);
      setSelectedNFT(null);
      setBorrowAmount('');
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
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="p-6 pb-2">
        <View className="flex-row justify-between items-start mb-2">
          <View>
            <Text className="text-slate-900 dark:text-white text-3xl font-bold">Market</Text>
            <Text className="text-slate-500 dark:text-slate-400">Supply or borrow assets</Text>
          </View>
          {isConnected && (
            <View className="bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-2xl items-end border border-indigo-100 dark:border-indigo-900/30">
              <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase">Wallet Balance</Text>
              <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">${parseFloat(userBalance).toLocaleString()} USDC</Text>
            </View>
          )}
        </View>
        
        <View className="flex-row bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4 mt-4">
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
            <View className="flex-row flex-wrap justify-between mb-8">
              <View className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 w-[31%] shadow-sm">
                <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mb-1">Pool Liq.</Text>
                <Text className="text-slate-900 dark:text-white text-sm font-bold">${parseFloat(poolBalance).toLocaleString()}</Text>
              </View>
              <View className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 w-[31%] shadow-sm">
                <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mb-1">Your Dep.</Text>
                <Text className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">${parseFloat(userDeposit).toLocaleString()}</Text>
              </View>
              <View className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 w-[31%] shadow-sm">
                <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase mb-1">Wallet</Text>
                <Text className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">${parseFloat(userBalance).toLocaleString()}</Text>
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
                  No NFTs found in your wallet or vault.{"\n"}Mint or buy some to use as collateral.
                </Text>
              </View>
            )}
            
            {nfts.map((nft) => (
              <View key={nft.tokenId} className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                <View className="relative">
                  <Image source={{ uri: nft.image }} className="w-full aspect-square rounded-2xl mb-4" />
                  <View className={`absolute top-2 right-2 px-2 py-1 rounded-lg ${nft.status === 'vault' ? 'bg-indigo-600' : 'bg-slate-500'}`}>
                    <Text className="text-white text-[10px] font-bold uppercase">{nft.status}</Text>
                  </View>
                </View>
                
                <Text className="text-slate-900 dark:text-white font-bold mb-1">RWA #{nft.tokenId}</Text>
                
                {nft.priceSet ? (
                  <View>
                    <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-1">Value: ${parseFloat(nft.price).toLocaleString()}</Text>
                    {nft.status === 'vault' && (
                      <Text className="text-slate-500 dark:text-slate-400 text-[10px] mb-3">Debt: ${parseFloat(nft.debt).toLocaleString()}</Text>
                    )}
                  </View>
                ) : (
                  <View className="bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg mb-3">
                    <Text className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">⚠️ Price not set</Text>
                  </View>
                )}
                
                {nft.status === 'wallet' ? (
                  <TouchableOpacity 
                    onPress={() => handleDepositCollateral(nft.tokenId)}
                    disabled={!nft.priceSet || loading}
                    className={`py-2 rounded-xl items-center ${!nft.priceSet || loading ? 'bg-slate-100 dark:bg-slate-800' : 'bg-indigo-600'}`}
                  >
                    <Text className={`font-bold text-xs ${!nft.priceSet || loading ? 'text-slate-400' : 'text-white'}`}>Deposit</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    onPress={() => handleBorrow(nft)}
                    disabled={loading}
                    className={`py-2 rounded-xl items-center ${loading ? 'bg-slate-100 dark:bg-slate-800' : 'bg-emerald-600'}`}
                  >
                    <Text className={`font-bold text-xs ${loading ? 'text-slate-400' : 'text-white'}`}>Borrow</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Borrow Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={borrowModalVisible}
        onRequestClose={() => setBorrowModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">Borrow USDC</Text>
              <TouchableOpacity onPress={() => setBorrowModalVisible(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <X size={20} color={isDarkMode ? "#fff" : "#000"} />
              </TouchableOpacity>
            </View>

            {selectedNFT && (
              <View className="mb-6">
                <View className="flex-row items-center mb-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                  <Image source={{ uri: selectedNFT.image }} className="w-12 h-12 rounded-xl mr-4" />
                  <View className="flex-1">
                    <Text className="text-slate-900 dark:text-white font-bold">RWA #{selectedNFT.tokenId}</Text>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 dark:text-slate-400 text-xs">Value: ${parseFloat(selectedNFT.price).toLocaleString()}</Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-xs">LTV: 60%</Text>
                    </View>
                  </View>
                </View>

                <View className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl mb-6">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-600 dark:text-slate-400 text-xs">Max Borrowable:</Text>
                    <Text className="text-slate-900 dark:text-white font-bold text-xs">${(Number(selectedNFT.price) * 0.6).toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-slate-600 dark:text-slate-400 text-xs">Current Debt:</Text>
                    <Text className="text-amber-600 dark:text-amber-400 font-bold text-xs">${parseFloat(selectedNFT.debt).toLocaleString()}</Text>
                  </View>
                  <View className="h-[1px] bg-slate-200 dark:bg-slate-700 my-2" />
                  <View className="flex-row justify-between">
                    <Text className="text-slate-600 dark:text-slate-400 text-xs font-bold">Available to Borrow:</Text>
                    <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">${(Number(selectedNFT.price) * 0.6 - Number(selectedNFT.debt)).toLocaleString()}</Text>
                  </View>
                </View>

                <Text className="text-slate-900 dark:text-white font-bold mb-2">Borrow Amount</Text>
                <View className="relative">
                  <TextInput
                    className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold text-lg border border-slate-100 dark:border-slate-700"
                    placeholder="0.00"
                    placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                    keyboardType="numeric"
                    value={borrowAmount}
                    onChangeText={setBorrowAmount}
                  />
                  <TouchableOpacity 
                    onPress={() => setBorrowAmount((Number(selectedNFT.price) * 0.6 - Number(selectedNFT.debt)).toString())}
                    className="absolute right-4 top-4 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-lg"
                  >
                    <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">MAX</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={confirmBorrow}
              disabled={loading || !borrowAmount}
              className={`py-4 rounded-2xl items-center ${loading || !borrowAmount ? 'bg-slate-200 dark:bg-slate-800' : 'bg-emerald-600'}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Confirm Borrow</Text>
              )}
            </TouchableOpacity>
            <View className="h-8" />
          </View>
        </View>
      </Modal>
    </View>
  );
}

