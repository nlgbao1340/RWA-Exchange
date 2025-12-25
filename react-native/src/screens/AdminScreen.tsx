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
  FlatList,
  useColorScheme,
} from 'react-native';
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { CONTRACTS } from '../config/contracts';
import RWA_NFT_ABI from '../abis/RWA_NFT.json';
import RWA_Oracle_ABI from '../abis/RWA_Oracle.json';
import { Shield, Plus, DollarSign, RefreshCw, User, Tag } from 'lucide-react-native';

const AdminScreen = () => {
  const { account, signer, isAdmin } = useWallet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const [nftRecipient, setNftRecipient] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [loading, setLoading] = useState(false);
  const [priceTokenId, setPriceTokenId] = useState('');
  const [assetPrice, setAssetPrice] = useState('');
  const [priceLoading, setPriceLoading] = useState(false);
  const [systemNFTs, setSystemNFTs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSystemNFTs = useCallback(async () => {
    if (!signer) return;
    try {
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
      const oracleContract = new ethers.Contract(CONTRACTS.RWA_Oracle, RWA_Oracle_ABI.abi || RWA_Oracle_ABI, signer);
      
      const total = await nftContract.totalSupply();
      const items = [];
      
      for (let i = Number(total) - 1; i >= Math.max(0, Number(total) - 10); i--) {
        try {
          const tokenId = await nftContract.tokenByIndex(i);
          const owner = await nftContract.ownerOf(tokenId);
          const uri = await nftContract.tokenURI(tokenId);
          
          let price = '0';
          let isPriced = false;
          try {
            isPriced = await oracleContract.isPriceSet(tokenId);
            if (isPriced) {
              const priceWei = await oracleContract.getAssetPrice(tokenId);
              price = ethers.formatUnits(priceWei, 6);
            }
          } catch (e) {}

          items.push({
            id: tokenId.toString(),
            owner,
            uri,
            price,
            isPriced
          });
        } catch (e) {}
      }
      setSystemNFTs(items);
    } catch (error) {
      console.error('Load system NFTs failed:', error);
    }
  }, [signer]);

  useEffect(() => {
    loadSystemNFTs();
  }, [loadSystemNFTs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSystemNFTs();
    setRefreshing(false);
  };

  const handleMint = async () => {
    if (!signer || !nftRecipient || !tokenURI) return;
    setLoading(true);
    try {
      const nftContract = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi || RWA_NFT_ABI, signer);
      const tx = await nftContract.mint(nftRecipient, tokenURI);
      await tx.wait();
      Alert.alert('Success', 'NFT Minted successfully!');
      setNftRecipient('');
      setTokenURI('');
      loadSystemNFTs();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Minting failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrice = async () => {
    if (!signer || !priceTokenId || !assetPrice) return;
    setPriceLoading(true);
    try {
      const oracleContract = new ethers.Contract(CONTRACTS.RWA_Oracle, RWA_Oracle_ABI.abi || RWA_Oracle_ABI, signer);
      const priceWei = ethers.parseUnits(assetPrice, 6);
      const tx = await oracleContract.setAssetPrice(priceTokenId, priceWei);
      await tx.wait();
      Alert.alert('Success', `Price set for Token #${priceTokenId}`);
      setPriceTokenId('');
      setAssetPrice('');
      loadSystemNFTs();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Setting price failed');
    } finally {
      setPriceLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-slate-50 dark:bg-slate-950">
        <View className="h-24 w-24 bg-red-50 dark:bg-red-900/20 rounded-full items-center justify-center mb-6">
          <Shield size={48} color="#ef4444" />
        </View>
        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</Text>
        <Text className="text-slate-500 dark:text-slate-400 text-center">
          Only the contract owner can access the admin panel.
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
        <Text className="text-slate-900 dark:text-white text-3xl font-bold mb-2">Admin Panel</Text>
        <Text className="text-slate-500 dark:text-slate-400 mb-8">Manage RWA assets and oracle prices</Text>

        {/* Mint Section */}
        <View className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
          <View className="flex-row items-center mb-6">
            <View className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl items-center justify-center mr-3">
              <Plus color="#4f46e5" size={20} />
            </View>
            <Text className="text-slate-900 dark:text-white text-xl font-bold">Mint RWA NFT</Text>
          </View>

          <View className="mb-4">
            <Text className="text-slate-500 dark:text-slate-400 font-medium mb-2">Recipient Address</Text>
            <TextInput
              className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
              placeholder="0x..."
              placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
              value={nftRecipient}
              onChangeText={setNftRecipient}
            />
          </View>

          <View className="mb-6">
            <Text className="text-slate-500 dark:text-slate-400 font-medium mb-2">Token URI</Text>
            <TextInput
              className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
              placeholder="ipfs://..."
              placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
              value={tokenURI}
              onChangeText={setTokenURI}
            />
          </View>

          <TouchableOpacity
            onPress={handleMint}
            disabled={loading}
            className={`py-4 rounded-2xl items-center ${loading ? 'bg-slate-200 dark:bg-slate-800' : 'bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none'}`}
          >
            {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Mint NFT</Text>}
          </TouchableOpacity>
        </View>

        {/* Oracle Section */}
        <View className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm mb-8">
          <View className="flex-row items-center mb-6">
            <View className="h-10 w-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl items-center justify-center mr-3">
              <DollarSign color="#059669" size={20} />
            </View>
            <Text className="text-slate-900 dark:text-white text-xl font-bold">Set Asset Price</Text>
          </View>

          <View className="flex-row justify-between mb-6">
            <View className="w-[48%]">
              <Text className="text-slate-500 dark:text-slate-400 font-medium mb-2">Token ID</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
                placeholder="1"
                placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                keyboardType="numeric"
                value={priceTokenId}
                onChangeText={setPriceTokenId}
              />
            </View>
            <View className="w-[48%]">
              <Text className="text-slate-500 dark:text-slate-400 font-medium mb-2">Price (USDC)</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white border border-slate-100 dark:border-slate-700"
                placeholder="1000"
                placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
                keyboardType="numeric"
                value={assetPrice}
                onChangeText={setAssetPrice}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSetPrice}
            disabled={priceLoading}
            className={`py-4 rounded-2xl items-center ${priceLoading ? 'bg-slate-200 dark:bg-slate-800' : 'bg-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-none'}`}
          >
            {priceLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-lg">Update Price</Text>}
          </TouchableOpacity>
        </View>

        {/* Recent NFTs */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-slate-900 dark:text-white text-xl font-bold">Recent Assets</Text>
          <TouchableOpacity onPress={onRefresh}>
            <RefreshCw size={20} color={isDarkMode ? "#94a3b8" : "#64748b"} />
          </TouchableOpacity>
        </View>

        {systemNFTs.map((item) => (
          <View key={item.id} className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 mb-3 shadow-sm">
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-row items-center">
                <View className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center mr-3">
                  <Tag color={isDarkMode ? "#fff" : "#0f172a"} size={20} />
                </View>
                <View>
                  <Text className="text-slate-900 dark:text-white font-bold">RWA #{item.id}</Text>
                  <Text className="text-slate-400 dark:text-slate-500 text-xs">Owner: {item.owner.slice(0, 6)}...{item.owner.slice(-4)}</Text>
                </View>
              </View>
              <View className={`px-3 py-1 rounded-full ${item.isPriced ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                <Text className={`text-[10px] font-bold ${item.isPriced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {item.isPriced ? `$${parseFloat(item.price).toLocaleString()}` : 'UNPRICED'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default AdminScreen;
