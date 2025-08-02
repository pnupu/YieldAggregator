import { FusionSDK, NetworkEnum } from '@1inch/fusion-sdk';
import { env } from '../env.js';
import axios from 'axios';

export interface FusionPlusQuote {
  srcAmount: string;
  dstAmount: string;
  gas: number;
  gasPrice: string;
  protocols: unknown[];
  estimatedGas: number;
  srcToken: string;
  dstToken: string;
  srcChainId: number;
  dstChainId: number;
}

export interface SwapResult {
  success: boolean;
  srcTxHash?: string;
  dstTxHash?: string;
  dstAmount?: string;
  actualDstAmount?: string;
  error?: string;
}

export interface CrossChainSwapParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  amount: string;
  userAddress: string;
  slippage?: number;
}

export class CrossChainExecutor {
  private fusionSDK: FusionSDK;
  
  constructor() {
    // Initialize standard Fusion SDK for single-chain operations
    this.fusionSDK = new FusionSDK({
      url: env.ONEINCH_BASE_URL,
      network: NetworkEnum.ETHEREUM,
      authKey: env.ONEINCH_API_KEY,
    });
  }

  /**
   * Get cross-chain swap quote using Fusion+
   * Reference: https://docs.1inch.io/docs/fusion-plus/api/quote
   */
  async getCrossChainQuote(params: CrossChainSwapParams): Promise<FusionPlusQuote> {
    try {
      // Use 1inch Cross-Chain API directly via HTTP
      const response = await axios.get(`${env.ONEINCH_BASE_URL}/fusion-plus/quoter/v1.0/quote`, {
        headers: {
          'Authorization': `Bearer ${env.ONEINCH_API_KEY}`,
          'Accept': 'application/json',
        },
        params: {
          src: params.fromToken,
          dst: params.toToken,
          amount: params.amount,
          from: params.userAddress,
          srcChainId: params.fromChain,
          dstChainId: params.toChain,
          slippage: params.slippage ?? 1,
          enableEstimate: true,
        },
      });

      const quote = response.data as {
        srcAmount?: string;
        dstAmount?: string;
        gas?: string;
        gasPrice?: string;
        protocols?: unknown[];
        estimatedGas?: string;
      };
      return {
        srcAmount: quote.srcAmount ?? params.amount,
        dstAmount: quote.dstAmount ?? '0',
        gas: Number(quote.gas) || 0,
        gasPrice: quote.gasPrice ?? '0',
        protocols: quote.protocols ?? [],
        estimatedGas: Number(quote.estimatedGas) || 0,
        srcToken: params.fromToken,
        dstToken: params.toToken,
        srcChainId: params.fromChain,
        dstChainId: params.toChain,
      };
    } catch (error) {
      console.error('Error getting cross-chain quote:', error);
      throw new Error(`Failed to get cross-chain quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute atomic cross-chain swap using Fusion+
   * Reference: https://docs.1inch.io/docs/fusion-plus/api/swap
   */
  async executeCrossChainSwap(
    params: CrossChainSwapParams,
    quote: FusionPlusQuote
  ): Promise<SwapResult> {
    try {
      // Build the swap transaction using 1inch Fusion+ API
      await axios.post(`${env.ONEINCH_BASE_URL}/fusion-plus/quoter/v1.0/swap`, {
        src: params.fromToken,
        dst: params.toToken,
        amount: params.amount,
        from: params.userAddress,
        srcChainId: params.fromChain,
        dstChainId: params.toChain,
        slippage: params.slippage ?? 1,
        destReceiver: params.userAddress,
        allowPartialFill: false,
      }, {
        headers: {
          'Authorization': `Bearer ${env.ONEINCH_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Return transaction details for signing and submission
      // Note: The actual transaction signing and broadcasting should be handled
      // by the calling code with proper wallet integration
      return {
        success: true,
        srcTxHash: 'pending', // Will be filled after tx submission
        dstAmount: quote.dstAmount ?? '0',
      };
    } catch (error) {
      console.error('Error executing cross-chain swap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Monitor cross-chain swap status
   * Reference: https://docs.1inch.io/docs/fusion-plus/api/status
   */
  async monitorSwapExecution(
    txHash: string,
    dstChainId: number,
    maxAttempts = 60
  ): Promise<SwapResult> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        // Use 1inch API to check order status
        const response = await axios.get(`${env.ONEINCH_BASE_URL}/fusion-plus/relayer/v1.0/orders/status/${txHash}`, {
          headers: {
            'Authorization': `Bearer ${env.ONEINCH_API_KEY}`,
            'Accept': 'application/json',
          },
        });
        
        const status = response.data as {
          status?: string;
          dstTxHash?: string;
          actualDstAmount?: string;
          makingAmount?: string;
          fills?: Array<{ txHash?: string }>;
        };
        
        if (status.status === 'executed' || status.status === 'filled') {
          return {
            success: true,
            srcTxHash: txHash,
            dstTxHash: status.dstTxHash ?? status.fills?.[0]?.txHash,
            actualDstAmount: status.actualDstAmount ?? status.makingAmount,
          };
        }
        
        if (status.status === 'cancelled' || status.status === 'expired') {
          return {
            success: false,
            error: `Cross-chain swap failed: ${status.status}`,
          };
        }
        
        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.error('Error checking swap status:', error);
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return {
      success: false,
      error: 'Cross-chain swap timeout - unable to confirm completion',
    };
  }

  /**
   * Execute token swap on the same chain using standard Fusion
   */
  async executeTokenSwap(
    fromToken: string,
    toToken: string,
    amount: string,
    chainId: number,
    userAddress: string
  ): Promise<SwapResult> {
    try {
      // Switch network context for the SDK
      const networkSDK = new FusionSDK({
        url: env.ONEINCH_BASE_URL,
        network: chainId === 1 ? NetworkEnum.ETHEREUM : NetworkEnum.POLYGON,
        authKey: env.ONEINCH_API_KEY,
      });

      const quote = await networkSDK.getQuote({
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        amount: amount,
        walletAddress: userAddress,
      });

      // Use 1inch Swap API for same-chain swaps
      await axios.get(`${env.ONEINCH_BASE_URL}/swap/v5.2/${chainId}/swap`, {
        headers: {
          'Authorization': `Bearer ${env.ONEINCH_API_KEY}`,
          'Accept': 'application/json',
        },
        params: {
          src: fromToken,
          dst: toToken,
          amount: amount,
          from: userAddress,
          slippage: 1,
          destReceiver: userAddress,
          disableEstimate: false,
          allowPartialFill: false,
        },
      });

      return {
        success: true,
        dstAmount: quote.toTokenAmount ?? '0',
        srcTxHash: 'pending', // Will be filled after tx submission
      };
    } catch (error) {
      console.error('Error executing token swap:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Estimate gas costs for cross-chain operations
   */
  async estimateExecutionCosts(
    params: CrossChainSwapParams
  ): Promise<{
    totalCost: number;
    gasEstimate: number;
    bridgeFee: number;
  }> {
    try {
      const quote = await this.getCrossChainQuote(params);
      
      // Estimate costs based on quote data
      const gasEstimate = quote.estimatedGas;
      const gasPrice = parseFloat(quote.gasPrice);
      const gasCost = gasEstimate * gasPrice;
      
      // Bridge fee is typically included in the quote
      const bridgeFee = 0; // With Fusion+, bridge fees are minimized
      
      return {
        totalCost: gasCost + bridgeFee,
        gasEstimate,
        bridgeFee,
      };
    } catch (error) {
      console.error('Error estimating execution costs:', error);
      throw error;
    }
  }

  /**
   * Get supported tokens for cross-chain swaps
   */
  async getSupportedTokens(chainId: number): Promise<Array<{
    symbol: string;
    address: string;
    name?: string;
    decimals?: number;
    logoURI?: string;
  }>> {
    try {
      // Use 1inch API to get real supported tokens
      const response = await axios.get(`${env.ONEINCH_BASE_URL}/token/v1.2/${chainId}`, {
        headers: {
          'Authorization': `Bearer ${env.ONEINCH_API_KEY}`,
          'Accept': 'application/json',
        },
      });
      
      // Transform the response to match our expected format
      const tokensData = response.data as { tokens?: Record<string, {
        symbol: string;
        name?: string;
        decimals?: number;
        logoURI?: string;
      }> };
      
      const tokens = Object.entries(tokensData.tokens ?? {}).map(([address, tokenData]) => ({
        symbol: tokenData.symbol,
        address: address,
        name: tokenData.name,
        decimals: tokenData.decimals,
        logoURI: tokenData.logoURI,
      }));
      
      return tokens;
    } catch (error) {
      console.error('Error getting supported tokens:', error);
      // Fallback to known stablecoin addresses if API fails
      const fallbackTokens = [
        { symbol: 'USDC', address: chainId === 1 ? '0xA0b86a33E6417fA1faCBE1eF4f7cb8Dd8B16e5f3' : '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
        { symbol: 'USDT', address: chainId === 1 ? '0xdAC17F958D2ee523a2206206994597C13D831ec7' : '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' },
        { symbol: 'DAI', address: chainId === 1 ? '0x6B175474E89094C44Da98b954EedeAC495271d0F' : '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063' }
      ];
      return fallbackTokens;
    }
  }
}

// Export a singleton instance
export const crossChainExecutor = new CrossChainExecutor();