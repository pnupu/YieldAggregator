"use client";

import { useState, useEffect } from "react";
import type { YieldOpportunity } from "@/lib/types";
import { api } from "@/trpc/react";

interface FloatingCalculatorProps {
  currentPosition: YieldOpportunity | null;
  targetPosition: YieldOpportunity | null;
  onClearCurrent: () => void;
  onClearTarget: () => void;
  onCalculate: () => void;
  onSwitch: () => void;
}

interface PreliminaryCalc {
  apyGain: number;
  estimatedAnnualGain: number;
  estimatedMonthlyCost: number;
  worthIt: boolean;
}

export function FloatingCalculator({
  currentPosition,
  targetPosition,
  onClearCurrent,
  onClearTarget,
  onCalculate,
  onSwitch,
}: FloatingCalculatorProps) {
  const [amount, setAmount] = useState<string>("10000");
  const [isMinimized, setIsMinimized] = useState(false);
  const [realCosts, setRealCosts] = useState<{ totalCost: number; estimatedTime: number } | null>(null);

  // tRPC mutation for getting real 1inch estimates
  const calculateCostsMutation = api.oneinch.calculateMoveCosts.useMutation();

  // Get real 1inch estimates when positions change
  useEffect(() => {
    if (currentPosition && targetPosition) {
      const getRealEstimates = async () => {
        try {
          const dummyAddress = '0x1234567890123456789012345678901234567890';
          const costs = await calculateCostsMutation.mutateAsync({
            fromProtocol: currentPosition.protocol,
            fromChain: currentPosition.chain,
            fromAsset: currentPosition.asset,
            toProtocol: targetPosition.protocol,
            toChain: targetPosition.chain,
            toAsset: targetPosition.asset,
            amount,
            userAddress: dummyAddress,
          });
          setRealCosts({
            totalCost: costs.totalCost,
            estimatedTime: costs.estimatedTime,
          });
        } catch (error) {
          console.error('Error getting real costs for floating calculator:', error);
          setRealCosts(null);
        }
      };
      void getRealEstimates();
    } else {
      setRealCosts(null);
    }
  }, [currentPosition, targetPosition, amount, calculateCostsMutation]);

  // Don't show if no positions selected
  if (!currentPosition && !targetPosition) {
    return null;
  }

  const calculatePreliminary = (): PreliminaryCalc | null => {
    if (!currentPosition || !targetPosition) return null;

    const amountNum = parseFloat(amount) || 10000;
    const apyGain = (targetPosition.currentAPY ?? 0) - (currentPosition.currentAPY ?? 0);
    const estimatedAnnualGain = amountNum * (apyGain / 100);
    
    // Only use real 1inch costs - no fallbacks
    const estimatedMonthlyCost = realCosts?.totalCost;

    // Only show analysis if we have real cost data
    if (!estimatedMonthlyCost) return null;

    const worthIt = estimatedAnnualGain > estimatedMonthlyCost * 12 && apyGain > 0;

    return {
      apyGain,
      estimatedAnnualGain,
      estimatedMonthlyCost,
      worthIt,
    };
  };

  const preliminary = calculatePreliminary();

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
        >
          📊 Calculator ({currentPosition ? '1' : '0'}/{targetPosition ? '1' : '0'})
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl w-80 max-h-[600px] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-600">
        <h3 className="text-lg font-semibold text-white">Quick Calculator</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white text-sm"
          >
            −
          </button>
          <button
            onClick={() => {
              onClearCurrent();
              onClearTarget();
            }}
            className="text-gray-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount (USD)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
            placeholder="10000"
          />
        </div>

        {/* Current Position */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Current Position</span>
            {currentPosition && (
              <button
                onClick={onClearCurrent}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>
          
          {currentPosition ? (
            <div className="bg-gray-700/50 p-3 rounded-lg text-sm">
              <div className="font-medium text-white capitalize">
                {currentPosition.protocol} on {currentPosition.chain}
              </div>
              <div className="text-gray-300">
                {currentPosition.asset} - {(currentPosition.currentAPY ?? 0).toFixed(2)}% APY
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/30 border-2 border-dashed border-gray-600 p-3 rounded-lg text-center">
              <div className="text-gray-400 text-sm">Click &quot;Add to Calculator&quot; on a yield opportunity</div>
            </div>
          )}
        </div>

        {/* Switch Button */}
        {currentPosition && targetPosition && (
          <div className="flex justify-center">
            <button
              onClick={onSwitch}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              title="Switch positions"
            >
              <span className="rotate-90">⇄</span>
              Switch
            </button>
          </div>
        )}

        {/* Target Position */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Target Position</span>
            {targetPosition && (
              <button
                onClick={onClearTarget}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            )}
          </div>
          
          {targetPosition ? (
            <div className="bg-gray-700/50 p-3 rounded-lg text-sm">
              <div className="font-medium text-white capitalize">
                {targetPosition.protocol} on {targetPosition.chain}
              </div>
              <div className="text-gray-300">
                {targetPosition.asset} - {(targetPosition.currentAPY ?? 0).toFixed(2)}% APY
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/30 border-2 border-dashed border-gray-600 p-3 rounded-lg text-center">
              <div className="text-gray-400 text-sm">Click &quot;Add to Calculator&quot; on another opportunity</div>
            </div>
          )}
        </div>

        {/* Preliminary Calculation */}
        {preliminary && (
          <div className="space-y-3 pt-2 border-t border-gray-600">
            <div className="text-sm font-medium text-gray-300">Quick Analysis</div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-700/30 p-2 rounded">
                <div className="text-gray-400">APY Gain</div>
                <div className={`font-bold ${preliminary.apyGain > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {preliminary.apyGain > 0 ? '+' : ''}{preliminary.apyGain.toFixed(2)}%
                </div>
              </div>
              
              <div className="bg-gray-700/30 p-2 rounded">
                <div className="text-gray-400">Annual Gain</div>
                <div className={`font-bold ${preliminary.estimatedAnnualGain > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${preliminary.estimatedAnnualGain.toFixed(0)}
                </div>
              </div>
            </div>

            <div className="text-xs text-center">
              <div className={`font-medium ${preliminary.worthIt ? 'text-green-400' : 'text-yellow-400'}`}>
                {preliminary.worthIt ? '✅ Potentially Profitable' : '⚠️ Review Carefully'}
              </div>
              <div className="text-gray-400 mt-1">
                Est. costs: ~${preliminary.estimatedMonthlyCost.toFixed(0)}/move
                {realCosts && (
                  <span className="text-blue-400 text-xs ml-1">• 1inch</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onCalculate}
            disabled={!currentPosition || !targetPosition}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Full Analysis
          </button>
          
          {(!currentPosition || !targetPosition) && (
            <div className="text-xs text-gray-400 text-center">
              Select both current and target positions for full analysis
            </div>
          )}
        </div>
      </div>
    </div>
  );
}