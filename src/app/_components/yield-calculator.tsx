"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import Link from "next/link";

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
  realCosts?: {
    totalCost: number;
    breakdown: {
      withdrawCost: number;
      swapCost: number;
      depositCost: number;
      bridgeFee: number;
    };
    estimatedTime: number;
    gasDetails: {
      withdrawGas: number;
      swapGas: number;
      depositGas: number;
    };
  };
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
  
  // tRPC mutation for 1inch cost estimation
  const calculateCostsMutation = api.oneinch.calculateMoveCosts.useMutation();

  // Real 1inch cost estimation
  const estimateRealCosts = useCallback(async (
    fromProtocol: string,
    fromChain: string,
    fromAsset: string,
    toProtocol: string,
    toChain: string,
    toAsset: string,
    amount: number
  ) => {
    try {
      // Use a dummy address for estimation (in production, use connected wallet)
      const dummyAddress = '0x1234567890123456789012345678901234567890';
      
      const costs = await calculateCostsMutation.mutateAsync({
        fromProtocol,
        fromChain,
        fromAsset,
        toProtocol,
        toChain,
        toAsset,
        amount: amount.toString(),
        userAddress: dummyAddress,
      });

      return {
        totalCost: costs.totalCost,
        breakdown: {
          withdrawCost: costs.withdrawCost,
          swapCost: costs.swapCost ?? 0,
          depositCost: costs.depositCost,
          bridgeFee: costs.bridgeFee ?? 0,
        },
        estimatedTime: costs.estimatedTime,
        gasDetails: {
          withdrawGas: costs.withdrawGas,
          swapGas: costs.swapGas ?? 0,
          depositGas: costs.depositGas,
        }
      };
    } catch (error) {
      console.error('Error getting real costs:', error);
      throw error; // Re-throw the error to surface API issues
    }
  }, [calculateCostsMutation]);

  const calculateProfitability = useCallback(async () => {
    setIsCalculating(true);
    
    try {
      const amount = parseFloat(input.amount);
      const timeHorizonYears = input.timeHorizon / 12;
      
      console.log('Calculation inputs:', {
        amount,
        timeHorizonYears,
        fromAPY: input.fromAPY,
        toAPY: input.toAPY,
        fromAPYType: typeof input.fromAPY,
        toAPYType: typeof input.toAPY
      });
      
      // Calculate earnings
      const currentEarnings = amount * (input.fromAPY / 100) * timeHorizonYears;
      const newEarnings = amount * (input.toAPY / 100) * timeHorizonYears;
      const grossProfit = newEarnings - currentEarnings;
      const apyGain = input.toAPY - input.fromAPY;
      
      console.log('Calculation results:', {
        currentEarnings,
        newEarnings,
        grossProfit,
        apyGain
      });
      
      // Get real 1inch cost estimates
      const realCosts = await estimateRealCosts(
        input.fromProtocol,
        input.fromChain,
        input.fromAsset,
        input.toProtocol,
        input.toChain,
        input.toAsset,
        amount
      );
      
      const totalCosts = realCosts.totalCost;
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
        estimatedGasCost: realCosts.breakdown.withdrawCost + realCosts.breakdown.depositCost,
        estimatedFees: realCosts.breakdown.swapCost + realCosts.breakdown.bridgeFee,
        netProfit,
        breakEvenTime,
        recommendation,
        profitabilityScore,
        // Add new 1inch-specific data
        realCosts: realCosts,
      });
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [input, estimateRealCosts]);

  // Load pre-filled data from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPositionStr = localStorage.getItem('calculatorCurrentPosition');
      const targetPositionStr = localStorage.getItem('calculatorTargetPosition');
      let shouldAutoCalculate = false;
      
      if (currentPositionStr) {
        try {
          const currentPos = JSON.parse(currentPositionStr) as { protocol: string; chain: string; asset: string; currentAPY?: number };
          setInput(prev => ({
            ...prev,
            fromProtocol: currentPos.protocol,
            fromChain: currentPos.chain,
            fromAsset: currentPos.asset,
            fromAPY: currentPos.currentAPY ?? 0,
          }));
          // Clear from localStorage after loading
          localStorage.removeItem('calculatorCurrentPosition');
          shouldAutoCalculate = true;
        } catch (error) {
          console.error('Error parsing current position:', error);
        }
      }
      
      if (targetPositionStr) {
        try {
          const targetPos = JSON.parse(targetPositionStr) as { protocol: string; chain: string; asset: string; currentAPY?: number };
          setInput(prev => ({
            ...prev,
            toProtocol: targetPos.protocol,
            toChain: targetPos.chain,
            toAsset: targetPos.asset,
            toAPY: targetPos.currentAPY ?? 0,
          }));
          // Clear from localStorage after loading
          localStorage.removeItem('calculatorTargetPosition');
          shouldAutoCalculate = true;
        } catch (error) {
          console.error('Error parsing target position:', error);
        }
      }

      // Auto-calculate if we loaded positions from floating calculator
      if (shouldAutoCalculate && currentPositionStr && targetPositionStr) {
        // Use setTimeout to ensure state has been updated
        setTimeout(() => {
          void calculateProfitability();
        }, 100);
      }
    }
  }, [calculateProfitability]);

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
        <Link
          href="/"
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors text-white"
        >
          ← Back to Dashboard
        </Link>
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
                        fromAPY: selectedYield?.currentAPY ?? 0
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
                    <option value="arbitrum">Arbitrum</option>
                    <option value="base">Base</option>
                    <option value="optimism">Optimism</option>
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
                    <optgroup label="Stablecoins">
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                      <option value="DAI">DAI</option>
                      <option value="FRAX">FRAX</option>
                      <option value="RLUSD">RLUSD</option>
                      <option value="USDe">USDe</option>
                      <option value="sUSDe">sUSDe</option>
                    </optgroup>
                    <optgroup label="ETH & Variants">
                      <option value="WETH">WETH</option>
                      <option value="weETH">weETH</option>
                      <option value="wstETH">wstETH</option>
                      <option value="cbETH">cbETH</option>
                      <option value="ezETH">ezETH</option>
                    </optgroup>
                    <optgroup label="BTC & Variants">
                      <option value="WBTC">WBTC</option>
                      <option value="cbBTC">cbBTC</option>
                    </optgroup>
                    <optgroup label="DeFi Tokens">
                      <option value="AAVE">AAVE</option>
                      <option value="CRV">CRV</option>
                      <option value="BAL">BAL</option>
                      <option value="ARB">ARB</option>
                      <option value="OP">OP</option>
                      <option value="MATIC">MATIC</option>
                    </optgroup>
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
                    onChange={(e) => {
                      // Handle both comma and dot decimal separators
                      const value = e.target.value.replace(',', '.');
                      const parsedValue = parseFloat(value) || 0;
                      console.log('fromAPY input:', { original: e.target.value, processed: value, parsed: parsedValue });
                      setInput(prev => ({ ...prev, fromAPY: parsedValue }));
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Switch Button */}
            {input.fromProtocol && input.toProtocol && (
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setInput(prev => ({
                      ...prev,
                      fromProtocol: prev.toProtocol,
                      fromChain: prev.toChain,
                      fromAsset: prev.toAsset,
                      fromAPY: prev.toAPY,
                      toProtocol: prev.fromProtocol,
                      toChain: prev.fromChain,
                      toAsset: prev.fromAsset,
                      toAPY: prev.fromAPY,
                    }));
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  title="Switch current and target positions"
                >
                  <span className="rotate-90 text-lg">⇄</span>
                  Switch Positions
                </button>
              </div>
            )}

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
                        toAPY: selectedYield?.currentAPY ?? 0
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
                    <option value="arbitrum">Arbitrum</option>
                    <option value="base">Base</option>
                    <option value="optimism">Optimism</option>
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
                    <optgroup label="Stablecoins">
                      <option value="USDC">USDC</option>
                      <option value="USDT">USDT</option>
                      <option value="DAI">DAI</option>
                      <option value="FRAX">FRAX</option>
                      <option value="RLUSD">RLUSD</option>
                      <option value="USDe">USDe</option>
                      <option value="sUSDe">sUSDe</option>
                    </optgroup>
                    <optgroup label="ETH & Variants">
                      <option value="WETH">WETH</option>
                      <option value="weETH">weETH</option>
                      <option value="wstETH">wstETH</option>
                      <option value="cbETH">cbETH</option>
                      <option value="ezETH">ezETH</option>
                    </optgroup>
                    <optgroup label="BTC & Variants">
                      <option value="WBTC">WBTC</option>
                      <option value="cbBTC">cbBTC</option>
                    </optgroup>
                    <optgroup label="DeFi Tokens">
                      <option value="AAVE">AAVE</option>
                      <option value="CRV">CRV</option>
                      <option value="BAL">BAL</option>
                      <option value="ARB">ARB</option>
                      <option value="OP">OP</option>
                      <option value="MATIC">MATIC</option>
                    </optgroup>
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
                    onChange={(e) => {
                      // Handle both comma and dot decimal separators
                      const value = e.target.value.replace(',', '.');
                      const parsedValue = parseFloat(value) || 0;
                      console.log('toAPY input:', { original: e.target.value, processed: value, parsed: parsedValue });
                      setInput(prev => ({ ...prev, toAPY: parsedValue }));
                    }}
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
                  
                  {/* 1inch Cost Breakdown */}
                  {result.realCosts && (
                    <>
                      <div className="pt-2 border-t border-gray-600">
                        <div className="text-gray-300 font-medium mb-2">1inch Cost Analysis</div>
                        <div className="pl-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Withdraw from {input.fromProtocol}</span>
                            <span className="text-red-400">-${result.realCosts.breakdown.withdrawCost.toFixed(2)}</span>
                          </div>
                          {result.realCosts.breakdown.swapCost > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Cross-chain Swap</span>
                              <span className="text-red-400">-${result.realCosts.breakdown.swapCost.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-400">Deposit to {input.toProtocol}</span>
                            <span className="text-red-400">-${result.realCosts.breakdown.depositCost.toFixed(2)}</span>
                          </div>
                          {result.realCosts.breakdown.bridgeFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Bridge Fee</span>
                              <span className="text-red-400">-${result.realCosts.breakdown.bridgeFee.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-400">Estimated Time</span>
                        <span className="text-blue-400">{result.realCosts.estimatedTime} minutes</span>
                      </div>
                    </>
                  )}
                  
                  <div className="border-t border-gray-600 pt-2 flex justify-between font-semibold">
                    <span className="text-white">Net Profit</span>
                    <span className={result.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                      ${result.netProfit.toFixed(2)}
                    </span>
                  </div>
                  
                  {result.realCosts && (
                    <div className="text-xs text-gray-500 mt-2">
                      Powered by 1inch Fusion+ • Gas estimates: {(result.realCosts.gasDetails.withdrawGas + result.realCosts.gasDetails.swapGas + result.realCosts.gasDetails.depositGas).toLocaleString()} units
                    </div>
                  )}
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