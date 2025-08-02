"use client";

import { useState, useEffect, useCallback } from "react";
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

  // Don't show if no positions selected
  if (!currentPosition && !targetPosition) {
    return null;
  }



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
              Select both current and target positions for analysis
            </div>
          )}
        </div>
      </div>
    </div>
  );
}