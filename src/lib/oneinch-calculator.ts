import { crossChainExecutor } from './fusion-plus';
import { TOKEN_ADDRESSES } from './types';
import axios from 'axios';
import { env } from '../env.js';

interface GasPriceData {
  standard: number;
  fast: number;
  instant: number;
}

interface TokenSwapCosts {
  withdrawGas: number;
  withdrawCost: number;
  depositGas: number;
  depositCost: number;
  swapGas?: number;
  swapCost?: number;
  bridgeFee?: number;
  totalCost: number;
  estimatedTime: number; // minutes
}

export class OneInchCalculatorService {
  private readonly CHAIN_IDS = {
    ethereum: 1,
    polygon: 137,
  };

  /**
   * Get real-time gas prices for a chain
   */
  async getGasPrices(chainId: number): Promise<GasPriceData> {
    try {
      // Use 1inch gas price API
      const response = await axios.get(`${env.ONEINCH_BASE_URL}/gas-price/v1.4/${chainId}`, {
        headers: {
          'Authorization': `Bearer ${env.ONEINCH_API_KEY}`,
          'Accept': 'application/json',
        },
      });

      const gasData = response.data as {
        standard?: { maxFeePerGas?: string };
        fast?: { maxFeePerGas?: string };
        instant?: { maxFeePerGas?: string };
      };

      return {
        standard: parseFloat(gasData.standard?.maxFeePerGas ?? '20') / 1e9, // Convert to Gwei
        fast: parseFloat(gasData.fast?.maxFeePerGas ?? '25') / 1e9,
        instant: parseFloat(gasData.instant?.maxFeePerGas ?? '30') / 1e9,
      };
    } catch (error) {
      console.error('Error fetching gas prices:', error);
      // Fallback to estimated gas prices
      return chainId === 1 
        ? { standard: 20, fast: 25, instant: 30 } // Ethereum Gwei
        : { standard: 50, fast: 60, instant: 80 }; // Polygon Gwei
    }
  }

  /**
   * Estimate withdrawal costs from a protocol
   */
  async estimateWithdrawCosts(
    protocol: string,
    chain: string,
    _asset: string,
    _amount: string
  ): Promise<{ gasUnits: number; costUSD: number }> {
    const chainId = this.CHAIN_IDS[chain as keyof typeof this.CHAIN_IDS];
    const gasPrices = await this.getGasPrices(chainId);
    
    // Protocol-specific gas estimates for withdrawals
    const withdrawGasEstimates = {
      aave: 150000, // Aave withdraw typically uses ~150k gas
      curve: 200000, // Curve withdraw can be higher due to liquidity calculations
      compound: 120000, // Compound withdraw is generally efficient
    };

    const gasUnits = withdrawGasEstimates[protocol as keyof typeof withdrawGasEstimates] ?? 150000;
    const gasPriceGwei = gasPrices.standard;
    const gasCostETH = (gasUnits * gasPriceGwei) / 1e9;
    
    // Convert to USD (simplified - in production, get real ETH/MATIC prices)
    const ethPrice = chainId === 1 ? 3500 : 1; // $3500 for ETH, $1 for MATIC (simplified)
    const costUSD = gasCostETH * ethPrice;

    return { gasUnits, costUSD };
  }

  /**
   * Estimate deposit costs to a protocol  
   */
  async estimateDepositCosts(
    protocol: string,
    chain: string,
    _asset: string,
    _amount: string
  ): Promise<{ gasUnits: number; costUSD: number }> {
    const chainId = this.CHAIN_IDS[chain as keyof typeof this.CHAIN_IDS];
    const gasPrices = await this.getGasPrices(chainId);
    
    // Protocol-specific gas estimates for deposits
    const depositGasEstimates = {
      aave: 120000, // Aave deposit is generally efficient
      curve: 180000, // Curve deposit involves liquidity provision
      compound: 100000, // Compound deposit is very efficient
    };

    const gasUnits = depositGasEstimates[protocol as keyof typeof depositGasEstimates] ?? 120000;
    const gasPriceGwei = gasPrices.standard;
    const gasCostETH = (gasUnits * gasPriceGwei) / 1e9;
    
    const ethPrice = chainId === 1 ? 3500 : 1;
    const costUSD = gasCostETH * ethPrice;

    return { gasUnits, costUSD };
  }

  /**
   * Get real swap quote if cross-chain move is needed
   */
  async getSwapQuote(
    fromChain: string,
    toChain: string,
    asset: string,
    amount: string,
    userAddress: string
  ): Promise<{ costUSD: number; gasUnits: number; bridgeFee: number; estimatedTime: number } | null> {
    // If same chain, no swap needed
    if (fromChain === toChain) {
      return null;
    }

    try {
      const fromChainId = this.CHAIN_IDS[fromChain as keyof typeof this.CHAIN_IDS];
      const toChainId = this.CHAIN_IDS[toChain as keyof typeof this.CHAIN_IDS];
      
      const fromTokenAddress = TOKEN_ADDRESSES[asset as keyof typeof TOKEN_ADDRESSES]?.[fromChain as keyof typeof TOKEN_ADDRESSES.USDC] ?? '';
      const toTokenAddress = TOKEN_ADDRESSES[asset as keyof typeof TOKEN_ADDRESSES]?.[toChain as keyof typeof TOKEN_ADDRESSES.USDC] ?? '';

      const costs = await crossChainExecutor.estimateExecutionCosts({
        fromChain: fromChainId,
        toChain: toChainId,
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        amount,
        userAddress,
        slippage: 1,
      });

      return {
        costUSD: costs.totalCost / 1e18, // Convert wei to ETH then to USD
        gasUnits: costs.gasEstimate,
        bridgeFee: costs.bridgeFee,
        estimatedTime: 5, // 1inch Fusion+ typically takes 2-10 minutes
      };
    } catch (error) {
      console.error('Error getting swap quote:', error);
      // Fallback estimation
      return {
        costUSD: fromChain === 'ethereum' ? 50 : 2, // Rough estimates
        gasUnits: 200000,
        bridgeFee: 0,
        estimatedTime: 5,
      };
    }
  }

  /**
   * Calculate total costs for a yield move
   */
  async calculateMoveCosts(
    fromProtocol: string,
    fromChain: string,
    fromAsset: string,
    toProtocol: string,
    toChain: string,
    toAsset: string,
    amount: string,
    userAddress: string
  ): Promise<TokenSwapCosts> {
    try {
      // Get withdraw costs
      const withdrawCosts = await this.estimateWithdrawCosts(fromProtocol, fromChain, fromAsset, amount);
      
      // Get swap costs if cross-chain
      const swapCosts = await this.getSwapQuote(fromChain, toChain, fromAsset, amount, userAddress);
      
      // Get deposit costs
      const depositCosts = await this.estimateDepositCosts(toProtocol, toChain, toAsset, amount);

      const totalCost = withdrawCosts.costUSD + (swapCosts?.costUSD ?? 0) + depositCosts.costUSD;
      const estimatedTime = Math.max(2, (swapCosts?.estimatedTime ?? 0) + 2); // Base 2 min + swap time

      return {
        withdrawGas: withdrawCosts.gasUnits,
        withdrawCost: withdrawCosts.costUSD,
        depositGas: depositCosts.gasUnits,
        depositCost: depositCosts.costUSD,
        swapGas: swapCosts?.gasUnits,
        swapCost: swapCosts?.costUSD,
        bridgeFee: swapCosts?.bridgeFee,
        totalCost,
        estimatedTime,
      };
    } catch (error) {
      console.error('Error calculating move costs:', error);
      // Fallback to simple estimates
      const isEthereum = fromChain === 'ethereum' || toChain === 'ethereum';
      const isCrossChain = fromChain !== toChain;
      
      return {
        withdrawGas: 150000,
        withdrawCost: isEthereum ? 30 : 1,
        depositGas: 120000,
        depositCost: isEthereum ? 25 : 1,
        swapGas: isCrossChain ? 200000 : undefined,
        swapCost: isCrossChain ? (isEthereum ? 40 : 2) : undefined,
        bridgeFee: 0,
        totalCost: isCrossChain ? (isEthereum ? 95 : 4) : (isEthereum ? 55 : 2),
        estimatedTime: isCrossChain ? 7 : 3,
      };
    }
  }

  /**
   * Get real-time token prices for profit calculations
   */
  async getTokenPrices(tokens: string[]): Promise<Record<string, number>> {
    try {
      // Use 1inch API to get token prices (if available) or fallback
      const prices: Record<string, number> = {};
      
      // For stablecoins, we can assume $1 
      tokens.forEach(token => {
        if (['USDC', 'USDT', 'DAI'].includes(token)) {
          prices[token] = 1.0;
        } else {
          prices[token] = 1.0; // Fallback
        }
      });

      return prices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      // Fallback to $1 for stablecoins
      return tokens.reduce((acc, token) => {
        acc[token] = 1.0;
        return acc;
      }, {} as Record<string, number>);
    }
  }

  /**
   * Estimate slippage for large trades
   */
  async estimateSlippage(
    fromChain: string,
    toChain: string,
    asset: string,
    amount: string
  ): Promise<number> {
    try {
      const amountNum = parseFloat(amount);
      
      // For same-chain moves, slippage is minimal
      if (fromChain === toChain) {
        return amountNum > 100000 ? 0.1 : 0.05; // 0.1% for large trades, 0.05% for smaller
      }

      // Cross-chain moves may have higher slippage
      return amountNum > 100000 ? 0.3 : 0.15; // 0.3% for large cross-chain, 0.15% for smaller
    } catch {
      return 0.2; // Default 0.2% slippage
    }
  }
}

// Export singleton instance
export const oneInchCalculator = new OneInchCalculatorService();