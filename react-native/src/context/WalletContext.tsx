import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { NETWORK, CONTRACTS } from '../config/contracts';

interface WalletContextType {
  account: string | null;
  signer: ethers.Signer | null;
  provider: ethers.JsonRpcProvider | null;
  isAdmin: boolean;
  connect: (privateKey: string) => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = async (address: string, rpcProvider: ethers.JsonRpcProvider) => {
    try {
      // Simple check: is the account the owner of RWA_NFT?
      const nftContract = new ethers.Contract(
        CONTRACTS.RWA_NFT,
        ['function owner() view returns (address)'],
        rpcProvider
      );
      const owner = await nftContract.owner();
      setIsAdmin(owner.toLowerCase() === address.toLowerCase());
    } catch (error) {
      console.error("Failed to check admin status:", error);
      setIsAdmin(false);
    }
  };

  const connect = async (privateKey: string) => {
    try {
      const rpcProvider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
      const wallet = new ethers.Wallet(privateKey, rpcProvider);
      setAccount(wallet.address);
      setSigner(wallet);
      setProvider(rpcProvider);
      await checkAdmin(wallet.address, rpcProvider);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  };

  const disconnect = () => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
    setIsAdmin(false);
  };

  return (
    <WalletContext.Provider value={{ 
      account, 
      signer, 
      provider,
      isAdmin,
      connect, 
      disconnect, 
      isConnected: !!account 
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
