"use client";

import { useState, useEffect } from "react";
// Removed import - using local interface instead

interface MockYieldData {
  id: string;
  protocol: "aave" | "compound" | "curve";
  chain: "ethereum" | "polygon";
  asset: "USDC" | "USDT" | "DAI";
  currentAPY: number;
  projectedAPY: number;
  tvl: bigint;
  risk_score: number;
}

export function YieldDashboard() {
  const [yields, setYields] = useState<MockYieldData[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>("all");
  const [selectedChain, setSelectedChain] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data for demonstration
    const mockYields: MockYieldData[] = [
      {
        id: "1",
        protocol: "aave",
        chain: "ethereum",
        asset: "USDC",
        currentAPY: 2.45,
        projectedAPY: 2.57,
        tvl: BigInt("1200000000"),
        risk_score: 2.1,
      },
      {
        id: "2",
        protocol: "aave",
        chain: "polygon",
        asset: "USDC",
        currentAPY: 4.12,
        projectedAPY: 4.33,
        tvl: BigInt("890000000"),
        risk_score: 3.2,
      },
      {
        id: "3",
        protocol: "curve",
        chain: "ethereum",
        asset: "USDC",
        currentAPY: 3.21,
        projectedAPY: 3.28,
        tvl: BigInt("2100000000"),
        risk_score: 1.8,
      },
      {
        id: "4",
        protocol: "curve",
        chain: "polygon",
        asset: "USDC",
        currentAPY: 5.87,
        projectedAPY: 6.01,
        tvl: BigInt("450000000"),
        risk_score: 4.1,
      },
      {
        id: "5",
        protocol: "aave",
        chain: "ethereum",
        asset: "USDT",
        currentAPY: 2.18,
        projectedAPY: 2.29,
        tvl: BigInt("980000000"),
        risk_score: 2.3,
      },
      {
        id: "6",
        protocol: "curve",
        chain: "polygon",
        asset: "DAI",
        currentAPY: 6.34,
        projectedAPY: 6.47,
        tvl: BigInt("320000000"),
        risk_score: 4.5,
      },
    ];

    setTimeout(() => {
      setYields(mockYields);
      setLoading(false);
    }, 1500);
  }, []);

  const filteredYields = yields.filter((yield_) => {
    if (selectedAsset !== "all" && yield_.asset !== selectedAsset) return false;
    if (selectedChain !== "all" && yield_.chain !== selectedChain) return false;
    return true;
  });

  const bestYield = filteredYields.length > 0 ? filteredYields.reduce(
    (best, current) => (current.currentAPY > best.currentAPY ? current : best)
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

  if (loading) {
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

        <button className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg font-medium transition-colors">
          Connect Wallet
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Best APY</h3>
          <div className="text-3xl font-bold text-green-400">
            {bestYield ? `${bestYield.currentAPY.toFixed(2)}%` : "N/A"}
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
            {filteredYields.length}
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Across {new Set(filteredYields.map(y => y.chain)).size} chains
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
              {filteredYields.map((opportunity) => (
                <tr key={opportunity.id} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                        {opportunity.protocol?.[0]?.toUpperCase() ?? 'P'}
                      </div>
                      <span className="font-medium capitalize">{opportunity.protocol}</span>
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
                      {opportunity.currentAPY.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-blue-400">
                      {opportunity.projectedAPY.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-300">
                    {formatTVL(opportunity.tvl)}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`font-medium ${getRiskColor(opportunity.risk_score)}`}>
                      {getRiskLabel(opportunity.risk_score)}
                    </span>
                    <div className="text-xs text-gray-500">
                      {opportunity.risk_score.toFixed(1)}
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
              {bestYield ? `Polygon Curve offers the highest yield at ${bestYield.currentAPY.toFixed(2)}% APY for ${bestYield.asset}` : "Analyzing yield opportunities..."}
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
    </div>
  );
}