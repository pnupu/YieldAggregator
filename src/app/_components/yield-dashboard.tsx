"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useWalletStore } from "@/lib/web3";
import { WalletModal } from "./wallet-modal";

const getProtocolLink = (protocol: string, chain: string, poolAddress?: string, tokenAddress?: string) => {
  // Generate links to specific yield opportunities
  switch (protocol) {
    case 'aave':
      if (chain === 'ethereum') {
        return tokenAddress 
          ? `https://app.aave.com/reserve-overview/?underlyingAsset=${tokenAddress}&marketName=proto_mainnet_v3`
          : "https://app.aave.com/?marketName=proto_mainnet_v3";
      } else if (chain === 'polygon') {
        return tokenAddress 
          ? `https://app.aave.com/reserve-overview/?underlyingAsset=${tokenAddress}&marketName=proto_polygon_v3`
          : "https://app.aave.com/?marketName=proto_polygon_v3";
      }
      break;
    
    case 'curve':
      if (poolAddress && poolAddress !== '0x') {
        if (chain === 'ethereum') {
          // For Ethereum, use the known pool names or addresses
          if (poolAddress === '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7') {
            return 'https://curve.fi/3pool'; // 3Pool
          }
          return `https://curve.fi/#/ethereum/pools/${poolAddress}/deposit`;
        } else if (chain === 'polygon') {
          if (poolAddress === '0x445FE580eF8d70FF569aB36e80c647af338db351') {
            return 'https://polygon.curve.fi/aave'; // Aave pool
          }
          return `https://polygon.curve.fi/#/polygon/pools/${poolAddress}/deposit`;
        }
      }
      // Fallback to main Curve pages
      return chain === 'polygon' ? "https://polygon.curve.fi/" : "https://curve.fi/";
    
    case 'compound':
      return "https://app.compound.finance/";
    
    default:
      return '#';
  }
  
  return '#';
};

export function YieldDashboard() {
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  const { address, isConnected, connect, disconnect, walletType } = useWalletStore();
  
  // Fetch real yield data
  const { data: yields = [], isLoading } = api.yield.getOpportunities.useQuery({
    asset: selectedAsset === "all" ? undefined : selectedAsset as "USDC" | "USDT" | "DAI",
    chain: selectedChain === "all" ? undefined : selectedChain as "ethereum" | "polygon",
  });
  
  // Fetch yield statistics
  const { data: stats } = api.yield.getStats.useQuery();

  const filteredYields = yields.filter((yield_) => {
    if (selectedAsset !== "all" && yield_.asset !== selectedAsset) return false;
    if (selectedChain !== "all" && yield_.chain !== selectedChain) return false;
    return true;
  });

  const bestYield = filteredYields.length > 0 ? filteredYields.reduce(
    (best, current) => ((current.currentAPY ?? 0) > (best.currentAPY ?? 0) ? current : best)
  ) : null;

  const formatTVL = (tvl: bigint) => {
    const million = BigInt(1000000);
    const billion = BigInt(1000000000);
    
    if (tvl >= billion) {
      return `$${(Number(tvl) / Number(billion)).toFixed(1)}B`;
    } else if (tvl >= million) {
      return `$${(Number(tvl) / Number(million)).toFixed(0)}M`;
    } else {
      return `$${Number(tvl).toLocaleString()}`;
    }
  };

  const getRiskColor = (score: number) => {
    if (score <= 2) return "text-green-400";
    if (score <= 4) return "text-yellow-400";
    return "text-red-400";
  };

  const getRiskLabel = (score: number) => {
    if (score <= 2) return "Low";
    if (score <= 4) return "Medium";
    return "High";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <span className="ml-4 text-lg">Scanning yield opportunities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <select
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Assets</option>
          <option value="USDC">USDC</option>
          <option value="USDT">USDT</option>
          <option value="DAI">DAI</option>
        </select>

        <select
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Chains</option>
          <option value="ethereum">Ethereum</option>
          <option value="polygon">Polygon</option>
        </select>

        {isConnected ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {walletType && (
                <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                  {walletType}
                </span>
              )}
              <span className="text-sm text-gray-400">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <button 
              onClick={disconnect}
              className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button 
            onClick={async () => {
              const availableWallets = ['MetaMask']; // Since we only support MetaMask
              if (availableWallets.length === 1) {
                // Directly connect to MetaMask if it's the only option
                try {
                  await connect();
                } catch (error) {
                  console.error('Failed to connect to MetaMask:', error);
                }
              } else {
                setShowWalletModal(true);
              }
            }}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Connect MetaMask
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Best APY</h3>
          <div className="text-3xl font-bold text-green-400">
            {stats?.bestAPY ? `${stats.bestAPY.toFixed(2)}%` : "N/A"}
          </div>
          {bestYield && (
            <p className="text-sm text-gray-400 mt-1">
              {bestYield.protocol.toUpperCase()} on {bestYield.chain}
            </p>
          )}
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Opportunities</h3>
          <div className="text-3xl font-bold text-blue-400">
            {stats?.totalOpportunities ?? 0}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Across {stats?.uniqueChains ?? 0} chains
          </p>
        </div>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Gas Savings</h3>
          <div className="text-3xl font-bold text-purple-400">90%+</div>
          <p className="text-sm text-gray-400 mt-1">
            Via 1inch Fusion+
          </p>
        </div>
      </div>

      {/* Yield Opportunities Table */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Yield Opportunities</h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time data from Aave and Curve protocols
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Protocol</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Chain</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Asset</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Current APY</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Projected APY</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">TVL</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Risk</th>
                <th className="text-left py-4 px-6 font-medium text-gray-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredYields.map((opportunity, index) => (
                <tr key={`${opportunity.protocol}-${opportunity.chain}-${opportunity.asset}-${index}`} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                        {opportunity.protocol?.[0]?.toUpperCase() ?? 'P'}
                      </div>
                      <a 
                        href={getProtocolLink(opportunity.protocol, opportunity.chain, opportunity.poolAddress, opportunity.tokenAddress)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium capitalize text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {opportunity.protocol}
                      </a>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 capitalize">
                      {opportunity.chain}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-medium">{opportunity.asset}</td>
                  <td className="py-4 px-6">
                    <span className="text-green-400 font-bold">
                      {opportunity.currentAPY ? opportunity.currentAPY.toFixed(2) : '0.00'}%
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-blue-400">
                      {opportunity.projectedAPY ? opportunity.projectedAPY.toFixed(2) : '0.00'}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-300">
                    {formatTVL(opportunity.tvl)}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-medium ${getRiskColor(opportunity.risk_score ?? 0)}`}>
                      {getRiskLabel(opportunity.risk_score ?? 0)}
                    </span>
                    <div className="text-xs text-gray-500">
                      {(opportunity.risk_score ?? 0).toFixed(1)}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Move Funds
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mr-2"></div>
          AI Insights
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start">
            <span className="text-green-400 mr-2">💡</span>
            <span>
              {bestYield ? `Polygon Curve offers the highest yield at ${(bestYield.currentAPY ?? 0).toFixed(2)}% APY for ${bestYield.asset}` : "Analyzing yield opportunities..."}
            </span>
          </div>
          <div className="flex items-start">
            <span className="text-blue-400 mr-2">⚡</span>
            <span>
              Cross-chain moves from Ethereum to Polygon can save up to 90% in gas fees using 1inch Fusion+
            </span>
          </div>
          <div className="flex items-start">
            <span className="text-yellow-400 mr-2">⚠️</span>
            <span>
              Higher APY opportunities on Polygon come with increased smart contract risk
            </span>
          </div>
        </div>
      </div>

      {/* Wallet Selection Modal */}
      <WalletModal 
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={connect}
      />
    </div>
  );
}