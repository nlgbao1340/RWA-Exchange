import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, Alert, ActivityIndicator, useColorScheme } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { X, Key, ShieldAlert } from 'lucide-react-native';

interface ConnectWalletModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ConnectWalletModal({ visible, onClose }: ConnectWalletModalProps) {
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { connect } = useWallet();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const handleConnect = async () => {
    let pk = privateKey.trim();
    if (!pk.startsWith('0x') && pk.length === 64) {
      pk = '0x' + pk;
    }

    if (pk.length < 64) {
      Alert.alert("Error", "Invalid private key length");
      return;
    }

    setLoading(true);
    try {
      await connect(pk);
      onClose();
      setPrivateKey('');
    } catch (error) {
      Alert.alert("Error", "Failed to connect. Check your private key.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-slate-900 rounded-t-[40px] p-8 pb-12">
          <View className="flex-row justify-between items-center mb-8">
            <Text className="text-slate-900 dark:text-white text-2xl font-bold">Connect Wallet</Text>
            <TouchableOpacity onPress={onClose} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full">
              <X color={isDarkMode ? "#fff" : "#64748b"} size={20} />
            </TouchableOpacity>
          </View>

          <View className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20 flex-row items-center mb-8">
            <ShieldAlert color="#d97706" size={20} className="mr-3" />
            <Text className="text-amber-800 dark:text-amber-200 flex-1 text-xs font-medium">
              Warning: Never share your private key. This is for development purposes only.
            </Text>
          </View>

          <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mb-3 ml-1">Private Key</Text>
          <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 mb-8 border border-slate-100 dark:border-slate-700">
            <Key color="#94a3b8" size={20} />
            <TextInput
              className="flex-1 p-4 text-slate-900 dark:text-white font-medium"
              placeholder="0x..."
              placeholderTextColor={isDarkMode ? "#64748b" : "#94a3b8"}
              value={privateKey}
              onChangeText={setPrivateKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity 
            onPress={handleConnect}
            disabled={loading}
            activeOpacity={0.8}
            className={`py-4 rounded-2xl items-center ${loading ? 'bg-slate-200 dark:bg-slate-800' : 'bg-indigo-600 shadow-lg shadow-indigo-200 dark:shadow-none'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Connect Securely</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
