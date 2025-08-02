import { ethers } from 'ethers';
import { create } from 'zustand';

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  isConnected: false,
  chainId: null,
  provider: null,
  signer: null,

  connect: async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not found');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      
      set({
        address,
        isConnected: true,
        chainId: Number(network.chainId),
        provider,
        signer,
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
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