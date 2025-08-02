"use client";

import { useState } from "react";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
}

interface WalletOption {
  id: string;
  name: string;
  icon: string;
  isInstalled: boolean;
  provider?: EthereumProvider;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (walletId: string, provider: EthereumProvider) => Promise<void>;
}

export function WalletModal({ isOpen, onClose, onConnect }: WalletModalProps) {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  const getWalletOptions = (): WalletOption[] => {
    if (typeof window === 'undefined') return [];

    const options: WalletOption[] = [];

    // Only MetaMask support
    if (window.ethereum?.isMetaMask) {
      options.push({
        id: 'metamask',
        name: 'MetaMask',
        icon: '🦊',
        isInstalled: true,
        provider: window.ethereum,
      });
    } else {
      // Show MetaMask as not installed if not detected
      options.push({
        id: 'metamask',
        name: 'MetaMask',
        icon: '🦊',
        isInstalled: false,
      });
    }

    return options;
  };

  const handleConnect = async (wallet: WalletOption) => {
    if (!wallet.isInstalled) {
      // Open MetaMask installation page
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    if (!wallet.provider) {
      console.error(`No provider available for ${wallet.name}`);
      return;
    }

    setIsConnecting(wallet.id);
    try {
      await onConnect(wallet.id, wallet.provider);
      onClose();
    } catch (error) {
      console.error(`Failed to connect to ${wallet.name}:`, error);
    } finally {
      setIsConnecting(null);
    }
  };

  if (!isOpen) return null;

  const walletOptions = getWalletOptions();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Connect Wallet</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {walletOptions.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => handleConnect(wallet)}
              disabled={isConnecting === wallet.id}
              className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                wallet.isInstalled
                  ? 'border-gray-600 hover:border-purple-500 hover:bg-gray-700/50'
                  : 'border-gray-700 opacity-60'
              } ${isConnecting === wallet.id ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{wallet.icon}</span>
                <div className="text-left">
                  <div className="text-white font-medium">{wallet.name}</div>
                  {!wallet.isInstalled && (
                    <div className="text-xs text-gray-400">Not installed</div>
                  )}
                </div>
              </div>
              
              {isConnecting === wallet.id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
              ) : wallet.isInstalled ? (
                <span className="text-gray-400">→</span>
              ) : (
                <span className="text-xs text-blue-400">Install</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-6 text-xs text-gray-400 text-center">
          By connecting a wallet, you agree to the Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
}

// Extend Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}