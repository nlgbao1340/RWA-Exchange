import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { ethers } from 'ethers';
import { CONTRACTS, NETWORK } from '../config/contracts';
import LiquidationManagerABI from '../abis/LiquidationManager.json';
import RWA_NFT_ABI from '../abis/RWA_NFT.json';
import MockUSDC_ABI from '../abis/MockUSDC.json';
import { Gavel, Clock, User } from 'lucide-react-native';
import { useWallet } from '../context/WalletContext';

export default function AuctionsScreen() {
  const { account, signer, isConnected } = useWallet();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
      const liquidationManager = new ethers.Contract(CONTRACTS.LiquidationManager, LiquidationManagerABI.abi, provider);
      const rwaNft = new ethers.Contract(CONTRACTS.RWA_NFT, RWA_NFT_ABI.abi, provider);

      const totalSupply = await rwaNft.totalSupply();
      const auctionList = [];

      for (let i = 1; i <= Number(totalSupply); i++) {
        try {
          const auction = await liquidationManager.getAuction(i);
          if (auction.active) {
            auctionList.push({
              tokenId: i,
              highestBidder: auction.highestBidder,
              highestBid: ethers.formatUnits(auction.highestBid, 6),
              endTime: Number(auction.endTime),
              originalOwner: auction.originalOwner,
              originalDebt: ethers.formatUnits(auction.originalDebt, 6)
            });
          }
        } catch (e) {
          // Token might not exist or other error
        }
      }

      setAuctions(auctionList);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData().then(() => setRefreshing(false));
  }, []);

  const handleBid = async (tokenId: number) => {
    if (!isConnected || !signer) {
      Alert.alert("Error", "Please connect your wallet first");
      return;
    }

    try {
      const liquidationManager = new ethers.Contract(CONTRACTS.LiquidationManager, LiquidationManagerABI.abi, signer);
      const usdc = new ethers.Contract(CONTRACTS.MockUSDC, MockUSDC_ABI.abi, signer);

      const auction = await liquidationManager.getAuction(tokenId);
      const minBid = Number(ethers.formatUnits(auction.highestBid, 6)) + 10; // Bid 10 USDC more

      Alert.alert(
        "Place Bid",
        `Do you want to bid $${minBid} for Token #${tokenId}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Confirm Bid", 
            onPress: async () => {
              try {
                setLoading(true);
                const amount = ethers.parseUnits(minBid.toString(), 6);
                
                // Check allowance
                const allowance = await usdc.allowance(account, CONTRACTS.LiquidationManager);
                if (allowance < amount) {
                  const txApprove = await usdc.approve(CONTRACTS.LiquidationManager, ethers.MaxUint256);
                  await txApprove.wait();
                }

                const tx = await liquidationManager.bid(tokenId, amount);
                await tx.wait();
                
                Alert.alert("Success", "Your bid has been placed!");
                loadData();
              } catch (err: any) {
                Alert.alert("Error", err.message || "Failed to place bid");
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
      <View className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-slate-50"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="p-6">
        <View className="flex-row justify-between items-center mb-8">
          <Text className="text-3xl font-bold text-slate-900">Auctions</Text>
          <View className="bg-indigo-100 px-4 py-2 rounded-2xl">
            <Text className="text-indigo-600 font-bold">{auctions.length} Active</Text>
          </View>
        </View>

        {auctions.length === 0 ? (
          <View className="bg-white p-12 rounded-[40px] items-center border border-slate-100 shadow-sm">
            <View className="h-20 w-20 bg-slate-50 rounded-full items-center justify-center mb-6">
              <Gavel color="#cbd5e1" size={40} />
            </View>
            <Text className="text-slate-900 text-xl font-bold mb-2">No Auctions</Text>
            <Text className="text-slate-400 text-center leading-5">
              There are no active liquidations at the moment. Check back later.
            </Text>
          </View>
        ) : (
          auctions.map((auction) => (
            <View key={auction.tokenId} className="bg-white rounded-[32px] shadow-md mb-8 overflow-hidden border border-slate-100">
              <View className="bg-slate-900 p-5 flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <View className="h-8 w-8 bg-white/10 rounded-lg items-center justify-center mr-3">
                    <Text className="text-white font-bold">#</Text>
                  </View>
                  <Text className="text-white font-bold text-xl">Token {auction.tokenId}</Text>
                </View>
                <View className="bg-orange-500 px-4 py-1.5 rounded-full">
                  <Text className="text-white text-xs font-black uppercase tracking-widest">Live</Text>
                </View>
              </View>

              <View className="p-6">
                <View className="flex-row items-center bg-slate-50 self-start px-4 py-2 rounded-xl mb-6">
                  <Clock color="#64748b" size={14} />
                  <Text className="text-slate-500 font-medium text-xs ml-2">
                    Ends: {new Date(auction.endTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-8">
                  <View>
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Highest Bid</Text>
                    <Text className="text-3xl font-black text-slate-900">${auction.highestBid}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Original Debt</Text>
                    <Text className="text-xl font-bold text-slate-400">${auction.originalDebt}</Text>
                  </View>
                </View>

                <View className="bg-slate-50 p-5 rounded-2xl mb-8 border border-slate-100">
                  <View className="flex-row items-center mb-2">
                    <User color="#94a3b8" size={14} />
                    <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-2">Highest Bidder</Text>
                  </View>
                  <Text className="text-slate-900 text-xs font-mono bg-white p-2 rounded-lg border border-slate-100" numberOfLines={1}>
                    {auction.highestBidder === ethers.ZeroAddress ? "No bids yet" : auction.highestBidder}
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={() => handleBid(auction.tokenId)}
                  activeOpacity={0.8}
                  className="bg-indigo-600 p-5 rounded-2xl items-center shadow-lg shadow-indigo-200"
                >
                  <Text className="text-white font-black text-lg uppercase tracking-widest">Place Bid</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
