import { ethers } from 'ethers';
import { create } from 'zustand';

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
}

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  walletType: string | null;
  connect: (walletId?: string, customProvider?: EthereumProvider) => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  getAvailableWallets: () => string[];
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  chainId: null,
  provider: null,
  signer: null,
  walletType: null,

  getAvailableWallets: () => {
    if (typeof window === 'undefined') return [];
    
    const wallets: string[] = [];
    
    if (window.ethereum?.isMetaMask) {
      wallets.push('MetaMask');
    }
    
    return wallets;
  },

  connect: async (walletId?: string, customProvider?: EthereumProvider) => {
    if (typeof window === 'undefined') {
      throw new Error('Window not available');
    }

    let targetProvider = customProvider;
    let walletName = walletId ?? 'Unknown';

    // If no custom provider specified, try to auto-detect or use default
    if (!targetProvider) {
      if (!window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask.');
      }
      if (!window.ethereum.isMetaMask) {
        throw new Error('Please use MetaMask wallet.');
      }
      targetProvider = window.ethereum;
      walletName = 'MetaMask';
    }

    try {
      // Request account access
      await targetProvider.request({ method: 'eth_requestAccounts' });
      
      const provider = new ethers.BrowserProvider(targetProvider as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      set({
        address,
        isConnected: true,
        chainId: Number(network.chainId),
        provider,
        signer,
        walletType: walletName,
      });
    } catch (error) {
      console.error(`Failed to connect to ${walletName}:`, error);
      throw error;
    }
  },

  disconnect: () => {
    set({
      address: null,
      isConnected: false,
      chainId: null,
      provider: null,
      signer: null,
      walletType: null,
    });
  },

  switchChain: async (chainId: number) => {
    const { provider } = get();
    if (!provider) throw new Error('No provider connected');

    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${chainId.toString(16)}` },
      ]);
      
      const network = await provider.getNetwork();
      set({ chainId: Number(network.chainId) });
    } catch (error) {
      console.error('Failed to switch chain:', error);
      throw error;
    }
  },
})); 