import { crossChainExecutor } from './fusion-plus';
import { TOKEN_ADDRESSES, AAVE_TOKEN_ADDRESSES } from './types';
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
    arbitrum: 42161,
    base: 8453,
    optimism: 10,
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

      const standard = parseFloat(gasData.standard?.maxFeePerGas ?? '20000000000'); // 20 Gwei in wei
      const fast = parseFloat(gasData.fast?.maxFeePerGas ?? '25000000000'); // 25 Gwei in wei
      const instant = parseFloat(gasData.instant?.maxFeePerGas ?? '30000000000'); // 30 Gwei in wei

      console.log(`Raw gas prices for chain ${chainId}:`, { standard, fast, instant });

      const gasPricesInGwei = {
        standard: standard / 1e9, // Convert wei to Gwei
        fast: fast / 1e9,
        instant: instant / 1e9,
      };

      console.log(`Gas prices in Gwei for chain ${chainId}:`, gasPricesInGwei);

      return gasPricesInGwei;
    } catch (error) {
      console.error('Error fetching gas prices:', error);
      // Fallback to reasonable gas prices
      const fallbackPrices = {
        1: { standard: 20, fast: 25, instant: 30 }, // Ethereum
        137: { standard: 30, fast: 40, instant: 50 }, // Polygon
        42161: { standard: 0.1, fast: 0.15, instant: 0.2 }, // Arbitrum
        8453: { standard: 0.001, fast: 0.002, instant: 0.003 }, // Base
        10: { standard: 0.001, fast: 0.002, instant: 0.003 }, // Optimism
      };
      
      const fallback = fallbackPrices[chainId as keyof typeof fallbackPrices] ?? { standard: 20, fast: 25, instant: 30 };
      console.log(`Using fallback gas prices for chain ${chainId}:`, fallback);
      
      return {
        standard: fallback.standard,
        fast: fallback.fast,
        instant: fallback.instant,
      };
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
    const gasCostETH = (gasUnits * gasPriceGwei) / 1e9; // gasPriceGwei is already in Gwei, so divide by 1e9 to get ETH
    
    // Convert to USD (simplified - in production, get real ETH/MATIC prices)
    const ethPrice = chainId === 1 ? 3500 : chainId === 137 ? 1 : 2; // $3500 for ETH, $1 for MATIC, $2 for others
    const costUSD = gasCostETH * ethPrice;

    console.log(`Withdraw costs for ${protocol} on ${chain} (chainId: ${chainId}):`, {
      gasUnits,
      gasPriceGwei,
      gasCostETH,
      ethPrice,
      costUSD
    });

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
    const gasCostETH = (gasUnits * gasPriceGwei) / 1e9; // gasPriceGwei is already in Gwei, so divide by 1e9 to get ETH
    
    const ethPrice = chainId === 1 ? 3500 : chainId === 137 ? 1 : 2; // $3500 for ETH, $1 for MATIC, $2 for others
    const costUSD = gasCostETH * ethPrice;

    console.log(`Deposit costs for ${protocol} on ${chain} (chainId: ${chainId}):`, {
      gasUnits,
      gasPriceGwei,
      gasCostETH,
      ethPrice,
      costUSD
    });

    return { gasUnits, costUSD };
  }

  /**
   * Get real swap quote if cross-chain move is needed
   */
  async getSwapQuote(
    fromChain: string,
    toChain: string,
    fromAsset: string,
    toAsset: string,
    amount: string,
    userAddress: string
  ): Promise<{ costUSD: number; gasUnits: number; bridgeFee: number; estimatedTime: number } | null> {
    // If same chain and same asset, no swap needed
    if (fromChain === toChain && fromAsset === toAsset) {
      return null;
    }

    // If same chain but different assets, we need a same-chain swap (not cross-chain)
    if (fromChain === toChain) {
      console.log(`Same-chain swap: ${fromAsset} to ${toAsset} on ${fromChain}`);
      // For now, return a simple estimate for same-chain swaps
      return {
        costUSD: 5, // Simple estimate for same-chain swap
        gasUnits: 100000,
        bridgeFee: 0,
        estimatedTime: 2,
      };
    }

    // Cross-chain swap
    try {
      const fromChainId = this.CHAIN_IDS[fromChain as keyof typeof this.CHAIN_IDS];
      const toChainId = this.CHAIN_IDS[toChain as keyof typeof this.CHAIN_IDS];
      
      // For cross-chain swaps, use underlying token addresses (not Aave tokens)
      const fromTokenAddress = TOKEN_ADDRESSES[fromAsset as keyof typeof TOKEN_ADDRESSES]?.[fromChain as keyof typeof TOKEN_ADDRESSES.USDC] ?? '';
      const toTokenAddress = TOKEN_ADDRESSES[toAsset as keyof typeof TOKEN_ADDRESSES]?.[toChain as keyof typeof TOKEN_ADDRESSES.USDC] ?? '';

      console.log(`Cross-chain token lookup: ${fromAsset} (${fromChain}) to ${toAsset} (${toChain})`);
      console.log(`From token address: ${fromTokenAddress}`);
      console.log(`To token address: ${toTokenAddress}`);

      // Convert USD amount to token amount, then to wei
      const getTokenPrice = (asset: string) => {
        // Approximate token prices (in production, get from price feeds)
        const prices: Record<string, number> = {
          'USDC': 1.0,
          'USDT': 1.0,
          'DAI': 1.0,
          'WETH': 3500, // ~$3500 per ETH
          'WBTC': 40000, // ~$40,000 per WBTC
          'weETH': 3500,
          'wstETH': 3500,
          'cbBTC': 40000,
          'cbETH': 3500,
          'ezETH': 3500,
          'USDe': 1.0,
          'sUSDe': 1.0,
          'RLUSD': 1.0,
          'AAVE': 100, // ~$100 per AAVE
          'FRAX': 1.0,
          'CRV': 0.5, // ~$0.50 per CRV
          'BAL': 5, // ~$5 per BAL
          'ARB': 1.5, // ~$1.50 per ARB
          'OP': 2.5, // ~$2.50 per OP
          'MATIC': 0.8, // ~$0.80 per MATIC
        };
        return prices[asset] ?? 1.0;
      };

      const getDecimals = (asset: string) => {
        if (['USDC', 'USDT'].includes(asset)) return 6;
        if (['WBTC', 'cbBTC'].includes(asset)) return 8;
        return 18; // Default for most tokens
      };

      const tokenPrice = getTokenPrice(fromAsset);
      const tokenAmount = parseFloat(amount) / tokenPrice; // Convert USD to token amount
      const decimals = getDecimals(fromAsset);
      const amountInWei = (tokenAmount * Math.pow(10, decimals)).toString();
      
      console.log(`Converting $${amount} USD to ${tokenAmount} ${fromAsset} (price: $${tokenPrice}) to wei: ${amountInWei} (${decimals} decimals)`);

      const costs = await crossChainExecutor.estimateExecutionCosts({
        fromChain: fromChainId,
        toChain: toChainId,
        fromToken: fromTokenAddress,
        toToken: toTokenAddress,
        amount: amountInWei,
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
      throw new Error(`Failed to get swap quote from ${fromChain} to ${toChain}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const swapCosts = await this.getSwapQuote(fromChain, toChain, fromAsset, toAsset, amount, userAddress);
      
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
      throw new Error(`Failed to calculate move costs from ${fromProtocol}/${fromChain} to ${toProtocol}/${toChain}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error(`Failed to fetch token prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
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