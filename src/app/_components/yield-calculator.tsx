"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import type { YieldOpportunity } from "@/lib/types";

interface CalculationInput {
  fromProtocol: string;
  fromChain: string;
  fromAsset: string;
  fromAPY: number;
  toProtocol: string;
  toChain: string;
  toAsset: string;
  toAPY: number;
  amount: string;
  timeHorizon: number; // months
}

interface CalculationResult {
  currentEarnings: number;
  newEarnings: number;
  apyGain: number;
  grossProfit: number;
  estimatedGasCost: number;
  estimatedFees: number;
  netProfit: number;
  breakEvenTime: number; // days
  recommendation: 'execute' | 'hold' | 'monitor';
  profitabilityScore: number;
}

export function YieldCalculator() {
  const [input, setInput] = useState<CalculationInput>({
    fromProtocol: '',
    fromChain: 'ethereum',
    fromAsset: 'USDC',
    fromAPY: 0,
    toProtocol: '',
    toChain: 'ethereum',
    toAsset: 'USDC',
    toAPY: 0,
    amount: '10000',
    timeHorizon: 12,
  });

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Fetch available yield opportunities
  const { data: yields = [], isLoading } = api.yield.getOpportunities.useQuery({});

  // Load pre-filled data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPositionStr = localStorage.getItem('calculatorCurrentPosition');
      const targetPositionStr = localStorage.getItem('calculatorTargetPosition');
      
      if (currentPositionStr) {
        try {
          const currentPos: YieldOpportunity = JSON.parse(currentPositionStr);
          setInput(prev => ({
            ...prev,
            fromProtocol: currentPos.protocol,
            fromChain: currentPos.chain,
            fromAsset: currentPos.asset,
            fromAPY: currentPos.currentAPY ?? 0,
          }));
          // Clear from localStorage after loading
          localStorage.removeItem('calculatorCurrentPosition');
        } catch (error) {
          console.error('Error parsing current position:', error);
        }
      }
      
      if (targetPositionStr) {
        try {
          const targetPos: YieldOpportunity = JSON.parse(targetPositionStr);
          setInput(prev => ({
            ...prev,
            toProtocol: targetPos.protocol,
            toChain: targetPos.chain,
            toAsset: targetPos.asset,
            toAPY: targetPos.currentAPY ?? 0,
          }));
          // Clear from localStorage after loading
          localStorage.removeItem('calculatorTargetPosition');
        } catch (error) {
          console.error('Error parsing target position:', error);
        }
      }
    }
  }, []);

  const calculateProfitability = () => {
    setIsCalculating(true);
    
    try {
      const amount = parseFloat(input.amount);
      const timeHorizonYears = input.timeHorizon / 12;
      
      // Calculate earnings
      const currentEarnings = amount * (input.fromAPY / 100) * timeHorizonYears;
      const newEarnings = amount * (input.toAPY / 100) * timeHorizonYears;
      const grossProfit = newEarnings - currentEarnings;
      const apyGain = input.toAPY - input.fromAPY;
      
      // Estimate costs
      const estimatedGasCost = estimateGasCost(input.fromChain, input.toChain, amount);
      const estimatedFees = estimateFees(input.fromProtocol, input.toProtocol, amount);
      const totalCosts = estimatedGasCost + estimatedFees;
      
      const netProfit = grossProfit - totalCosts;
      
      // Calculate break-even time in days
      const dailyGain = amount * (apyGain / 100) / 365;
      const breakEvenTime = dailyGain > 0 ? totalCosts / dailyGain : Infinity;
      
      // Determine recommendation
      let recommendation: 'execute' | 'hold' | 'monitor' = 'hold';
      let profitabilityScore = 0;
      
      if (netProfit > 0 && breakEvenTime < 30) {
        recommendation = 'execute';
        profitabilityScore = Math.min(100, (netProfit / amount) * 100 * 10);
      } else if (netProfit > 0 && breakEvenTime < 90) {
        recommendation = 'monitor';
        profitabilityScore = Math.min(70, (netProfit / amount) * 100 * 5);
      } else {
        recommendation = 'hold';
        profitabilityScore = Math.max(0, (netProfit / amount) * 100 * 2);
      }
      
      setResult({
        currentEarnings,
        newEarnings,
        apyGain,
        grossProfit,
        estimatedGasCost,
        estimatedFees,
        netProfit,
        breakEvenTime,
        recommendation,
        profitabilityScore,
      });
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const estimateGasCost = (fromChain: string, toChain: string, amount: number): number => {
    // Simplified gas cost estimation
    const baseCosts = {
      ethereum: 50, // $50 base cost on Ethereum
      polygon: 2,   // $2 base cost on Polygon
    };
    
    const fromCost = baseCosts[fromChain as keyof typeof baseCosts] || 25;
    const toCost = baseCosts[toChain as keyof typeof baseCosts] || 25;
    
    // Cross-chain moves cost more
    const crossChainMultiplier = fromChain !== toChain ? 2 : 1;
    
    // Larger amounts might require more gas for approvals
    const amountMultiplier = amount > 100000 ? 1.5 : 1;
    
    return (fromCost + toCost) * crossChainMultiplier * amountMultiplier;
  };

  const estimateFees = (fromProtocol: string, toProtocol: string, amount: number): number => {
    // Protocol-specific fees
    const protocolFees = {
      aave: amount * 0.0001, // 0.01% fee
      curve: amount * 0.0004, // 0.04% fee
      compound: amount * 0.0002, // 0.02% fee
    };
    
    const fromFee = protocolFees[fromProtocol as keyof typeof protocolFees] || 0;
    const toFee = protocolFees[toProtocol as keyof typeof protocolFees] || 0;
    
    return fromFee + toFee;
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'execute': return 'text-green-400';
      case 'monitor': return 'text-yellow-400';
      case 'hold': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case 'execute': return 'Execute Move';
      case 'monitor': return 'Monitor Opportunity';
      case 'hold': return 'Hold Current Position';
      default: return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        <span className="ml-4 text-lg">Loading yield opportunities...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <a
          href="/"
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors text-white"
        >
          ← Back to Dashboard
        </a>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Yield Move Calculator</h1>
          <p className="text-gray-400">
            Calculate if switching between yield opportunities is profitable
          </p>
        </div>
        <div className="w-32"></div> {/* Spacer for centering */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Position Details</h2>
          
          <div className="space-y-6">
            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (USD)
              </label>
              <input
                type="number"
                value={input.amount}
                onChange={(e) => setInput(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400"
                placeholder="Enter amount"
              />
            </div>

            {/* Time Horizon */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time Horizon (months)
              </label>
              <select
                value={input.timeHorizon}
                onChange={(e) => setInput(prev => ({ ...prev, timeHorizon: parseInt(e.target.value) }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
              >
                <option value={1}>1 month</option>
                <option value={3}>3 months</option>
                <option value={6}>6 months</option>
                <option value={12}>12 months</option>
                <option value={24}>24 months</option>
              </select>
            </div>

            {/* Current Position */}
            <div className="border border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Current Position</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Protocol
                  </label>
                  <select
                    value={input.fromProtocol}
                    onChange={(e) => {
                      const selectedYield = yields.find(y => 
                        y.protocol === e.target.value && 
                        y.chain === input.fromChain && 
                        y.asset === input.fromAsset
                      );
                      setInput(prev => ({ 
                        ...prev, 
                        fromProtocol: e.target.value,
                        fromAPY: selectedYield?.currentAPY || 0
                      }));
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white capitalize"
                  >
                    <option value="">Select Protocol</option>
                    {[...new Set(yields.map(y => y.protocol))].map(protocol => (
                      <option key={protocol} value={protocol}>{protocol}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chain
                  </label>
                  <select
                    value={input.fromChain}
                    onChange={(e) => setInput(prev => ({ ...prev, fromChain: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white capitalize"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Asset
                  </label>
                  <select
                    value={input.fromAsset}
                    onChange={(e) => setInput(prev => ({ ...prev, fromAsset: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Current APY (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={input.fromAPY}
                    onChange={(e) => setInput(prev => ({ ...prev, fromAPY: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Target Position */}
            <div className="border border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Target Position</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Protocol
                  </label>
                  <select
                    value={input.toProtocol}
                    onChange={(e) => {
                      const selectedYield = yields.find(y => 
                        y.protocol === e.target.value && 
                        y.chain === input.toChain && 
                        y.asset === input.toAsset
                      );
                      setInput(prev => ({ 
                        ...prev, 
                        toProtocol: e.target.value,
                        toAPY: selectedYield?.currentAPY || 0
                      }));
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white capitalize"
                  >
                    <option value="">Select Protocol</option>
                    {[...new Set(yields.map(y => y.protocol))].map(protocol => (
                      <option key={protocol} value={protocol}>{protocol}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Chain
                  </label>
                  <select
                    value={input.toChain}
                    onChange={(e) => setInput(prev => ({ ...prev, toChain: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white capitalize"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Asset
                  </label>
                  <select
                    value={input.toAsset}
                    onChange={(e) => setInput(prev => ({ ...prev, toAsset: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Target APY (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={input.toAPY}
                    onChange={(e) => setInput(prev => ({ ...prev, toAPY: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={calculateProfitability}
              disabled={isCalculating || !input.fromProtocol || !input.toProtocol}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {isCalculating ? 'Calculating...' : 'Calculate Profitability'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Calculation Results</h2>
          
          {result ? (
            <div className="space-y-6">
              {/* Recommendation */}
              <div className="text-center p-4 border border-gray-600 rounded-lg">
                <div className={`text-2xl font-bold ${getRecommendationColor(result.recommendation)}`}>
                  {getRecommendationText(result.recommendation)}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Profitability Score: {result.profitabilityScore.toFixed(1)}%
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">APY Gain</div>
                  <div className={`text-lg font-bold ${result.apyGain > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {result.apyGain > 0 ? '+' : ''}{result.apyGain.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">Net Profit</div>
                  <div className={`text-lg font-bold ${result.netProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${result.netProfit.toFixed(2)}
                  </div>
                </div>

                <div className="bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">Break-even Time</div>
                  <div className="text-lg font-bold text-white">
                    {result.breakEvenTime === Infinity ? 'Never' : `${Math.ceil(result.breakEvenTime)} days`}
                  </div>
                </div>

                <div className="bg-gray-700/50 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">Total Costs</div>
                  <div className="text-lg font-bold text-white">
                    ${(result.estimatedGasCost + result.estimatedFees).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Detailed Breakdown</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Earnings ({input.timeHorizon}mo)</span>
                    <span className="text-white">${result.currentEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">New Earnings ({input.timeHorizon}mo)</span>
                    <span className="text-white">${result.newEarnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gross Profit</span>
                    <span className="text-green-400">${result.grossProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Gas Costs</span>
                    <span className="text-red-400">-${result.estimatedGasCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Protocol Fees</span>
                    <span className="text-red-400">-${result.estimatedFees.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-2 flex justify-between font-semibold">
                    <span className="text-white">Net Profit</span>
                    <span className={result.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                      ${result.netProfit.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <div className="text-4xl mb-4">📊</div>
              <p>Enter position details and click calculate to see profitability analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}