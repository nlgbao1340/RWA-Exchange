import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image, useColorScheme, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ethers } from 'ethers';
import { CONTRACTS, NETWORK } from '../config/contracts';
import RWA_NFT_ABI from '../abis/RWA_NFT.json';
import Vault_ABI from '../abis/Vault.json';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import { Briefcase, Wallet, ArrowDownLeft, ArrowUpRight, ShieldCheck, X } from 'lucide-react-native';
import { useWallet } from '../context/WalletContext';

export default function PortfolioScreen() {
  const { account, signer, isConnected } = useWallet();
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [walletNFTs, setWalletNFTs] = useState<any[]>([]);
  const [vaultedNFTs, setVaultedNFTs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Repay Modal State
  const [repayModalVisible, setRepayModalVisible] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<any>(null);
  const [repayAmount, setRepayAmount] = useState('');

  const loadData = async () => {
    if (!isConnected || !account) {
      setWalletNFTs([]);
      setVaultedNFTs([]);
      setLoading(false);
      return;
    }

    try {
      const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi, provider);
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi, provider);

      // Load Wallet NFTs
      const balance = await nftContract.balanceOf(account);
      const walletList = [];
      for (let i = 0; i < Number(balance); i++) {
        try {
          const tokenId = await nftContract.tokenOfOwnerByIndex(account, i);
          walletList.push({
            tokenId: tokenId.toString(),
            image: `https://api.dicebear.com/7.x/identicon/png?seed=${tokenId}`
          });
        } catch (e) {}
      }
      setWalletNFTs(walletList);

      // Load Vaulted NFTs (Borrowed)
      const vaultBalance = await nftContract.balanceOf(CONTRACTS.Vault);
      const vaultList = [];
      for (let i = 0; i < Number(vaultBalance); i++) {
        try {
          const tokenId = await nftContract.tokenOfOwnerByIndex(CONTRACTS.Vault, i);
          const position = await vaultContract.positions(tokenId);
          if (position.owner.toLowerCase() === account.toLowerCase()) {
            vaultList.push({
              tokenId: tokenId.toString(),
              debt: ethers.formatUnits(position.debt, 6),
              image: `https://api.dicebear.com/7.x/identicon/png?seed=${tokenId}`
            });
          }
        } catch (e) {}
      }
      setVaultedNFTs(vaultList);
    } catch (error) {
      console.error(error);
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

  const handleRepay = (nft: any) => {
    setSelectedNFT(nft);
    setRepayAmount(nft.debt); // Default to full debt
    setRepayModalVisible(true);
  };

  const confirmRepay = async () => {
    if (!signer || !account || !selectedNFT || !repayAmount) return;
    
    const amountToRepay = parseFloat(repayAmount);
    if (isNaN(amountToRepay) || amountToRepay <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (amountToRepay > parseFloat(selectedNFT.debt)) {
      Alert.alert("Error", "Repay amount exceeds debt");
      return;
    }

    try {
      setLoading(true);
      setRepayModalVisible(false);
      const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi, signer);
      const usdcContract = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi, signer);

      const amountWei = ethers.parseUnits(repayAmount, 6);
      
      // 1. Approve USDC
      const allowance = await usdcContract.allowance(account, CONTRACTS.Vault);
      if (allowance < amountWei) {
        const txApprove = await usdcContract.approve(CONTRACTS.Vault, ethers.MaxUint256);
        await txApprove.wait();
      }

      // 2. Repay
      const txRepay = await vaultContract.repay(selectedNFT.tokenId, amountWei);
      await txRepay.wait();

      Alert.alert("Success", `Repaid $${repayAmount} USDC for NFT #${selectedNFT.tokenId}`);
      loadData();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to repay");
    } finally {
      setLoading(false);
      setSelectedNFT(null);
      setRepayAmount('');
    }
  };

  const handleWithdraw = async (tokenId: string) => {
    if (!signer) return;

    Alert.alert(
      "Withdraw Collateral",
      `Do you want to withdraw NFT #${tokenId} from the vault?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          onPress: async () => {
            try {
              setLoading(true);
              const vaultContract = new ethers.Contract(CONTRACTS.Vault, Vault_ABI.abi, signer);
              const txWithdraw = await vaultContract.withdrawCollateral(tokenId);
              await txWithdraw.wait();

              Alert.alert("Success", `Withdrawn NFT #${tokenId}`);
              loadData();
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to withdraw. Make sure debt is 0.");
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

  if (!isConnected) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-slate-50 dark:bg-slate-950">
        <View className="h-24 w-24 bg-slate-100 dark:bg-slate-900 rounded-full items-center justify-center mb-6">
          <Briefcase size={48} color={isDarkMode ? "#475569" : "#94a3b8"} />
        </View>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Portfolio</Text>
        <Text className="text-slate-500 dark:text-slate-400 text-center mb-8">
          Connect your wallet to view your RWA assets and active loans.
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
        <Text className="text-slate-900 dark:text-white text-3xl font-bold mb-2">Portfolio</Text>
        <Text className="text-slate-500 dark:text-slate-400 mb-8">Manage your RWA assets and loans</Text>

        {/* Wallet NFTs */}
        <Text className="text-slate-900 dark:text-white text-xl font-bold mb-4">Your Assets ({walletNFTs.length})</Text>
        {walletNFTs.length === 0 ? (
          <View className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 items-center mb-8">
            <Text className="text-slate-400 dark:text-slate-500">No assets in wallet</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between mb-8">
            {walletNFTs.map((nft) => (
              <View key={nft.tokenId} className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                <Image source={{ uri: nft.image }} className="w-full aspect-square rounded-2xl mb-4" />
                <Text className="text-slate-900 dark:text-white font-bold mb-1">RWA #{nft.tokenId}</Text>
                <Text className="text-slate-500 dark:text-slate-400 text-xs mb-4">Status: In Wallet</Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('Market', { tab: 'borrow' })}
                  className="bg-indigo-50 dark:bg-indigo-900/20 py-2 rounded-xl items-center"
                >
                  <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">Borrow Against</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Vaulted NFTs */}
        <Text className="text-slate-900 dark:text-white text-xl font-bold mb-4">Active Loans ({vaultedNFTs.length})</Text>
        {vaultedNFTs.length === 0 ? (
          <View className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 items-center">
            <Text className="text-slate-400 dark:text-slate-500">No active loans</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {vaultedNFTs.map((nft) => (
              <View key={nft.tokenId} className="w-[48%] bg-white dark:bg-slate-900 p-4 rounded-[32px] border border-slate-100 dark:border-slate-800 mb-4 shadow-sm">
                <Image source={{ uri: nft.image }} className="w-full aspect-square rounded-2xl mb-4" />
                <Text className="text-slate-900 dark:text-white font-bold mb-1">RWA #{nft.tokenId}</Text>
                <Text className="text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-4">Debt: ${nft.debt}</Text>
                <View className="flex-row justify-between">
                  <TouchableOpacity 
                    onPress={() => handleRepay(nft)}
                    disabled={Number(nft.debt) === 0}
                    className={`flex-1 py-2 rounded-xl items-center mr-1 ${Number(nft.debt) === 0 ? 'bg-slate-100 dark:bg-slate-800' : 'bg-emerald-600'}`}
                  >
                    <Text className={`font-bold text-xs ${Number(nft.debt) === 0 ? 'text-slate-400' : 'text-white'}`}>Repay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleWithdraw(nft.tokenId)}
                    disabled={Number(nft.debt) > 0}
                    className={`flex-1 py-2 rounded-xl items-center ml-1 ${Number(nft.debt) > 0 ? 'bg-slate-100 dark:bg-slate-800' : 'bg-indigo-600'}`}
                  >
                    <Text className={`font-bold text-xs ${Number(nft.debt) > 0 ? 'text-slate-400' : 'text-white'}`}>Withdraw</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Repay Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={repayModalVisible}
        onRequestClose={() => setRepayModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-bold text-slate-900 dark:text-white">Repay Loan</Text>
              <TouchableOpacity onPress={() => setRepayModalVisible(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <X size={20} color={isDarkMode ? "#fff" : "#000"} />
              </TouchableOpacity>
            </View>

            {selectedNFT && (
              <View className="mb-6">
                <View className="flex-row items-center mb-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                  <Image source={{ uri: selectedNFT.image }} className="w-12 h-12 rounded-xl mr-4" />
                  <View>
                    <Text className="text-slate-900 dark:text-white font-bold">RWA #{selectedNFT.tokenId}</Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-xs">Current Debt: ${selectedNFT.debt} USDC</Text>
                  </View>
                </View>

                <Text className="text-slate-900 dark:text-white font-bold mb-2">Repay Amount</Text>
                <View className="relative">
                  <TextInput
                    className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold text-lg border border-slate-100 dark:border-slate-700"
                    placeholder="0.00"
                    placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                    keyboardType="numeric"
                    value={repayAmount}
                    onChangeText={setRepayAmount}
                  />
                  <TouchableOpacity 
                    onPress={() => setRepayAmount(selectedNFT.debt)}
                    className="absolute right-4 top-4 bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 rounded-lg"
                  >
                    <Text className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">MAX</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={confirmRepay}
              disabled={loading || !repayAmount}
              className={`py-4 rounded-2xl items-center ${loading || !repayAmount ? 'bg-slate-200 dark:bg-slate-800' : 'bg-emerald-600'}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-lg">Confirm Repay</Text>
              )}
            </TouchableOpacity>
            <View className="h-8" />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
