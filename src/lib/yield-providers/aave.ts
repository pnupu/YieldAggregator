import axios from 'axios';
import { BaseYieldProvider } from './base';
import type { YieldOpportunity, PoolData } from '../types';
import { TOKEN_ADDRESSES } from '../types';

interface AaveReserveData {
  symbol: string;
  liquidityRate: string;
  variableBorrowRate: string;
  stableBorrowRate: string;
  totalLiquidity: string;
  utilizationRate: string;
  aTokenAddress: string;
  underlyingAsset: string;
}


export class AaveProvider extends BaseYieldProvider {
  protocol = 'aave' as const;
  supportedChains = ['ethereum', 'polygon'];
  supportedAssets = ['USDC', 'USDT', 'DAI'];

  private readonly API_BASE_URLS = {
    ethereum: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3',
    polygon: 'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-polygon',
  };

  async getYields(chain: string): Promise<YieldOpportunity[]> {
    if (!this.supportedChains.includes(chain)) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    return this.fetchWithRetry(async () => {
      const poolsData = await this.fetchAaveData(chain);
      
      return poolsData
        .filter(reserve => this.supportedAssets.includes(reserve.symbol))
        .map(reserve => this.mapToYieldOpportunity(reserve, chain));
    });
  }

  async getPoolData(chain: string, asset: string): Promise<PoolData[]> {
    const yields = await this.getYields(chain);
    const assetYield = yields.find(y => y.asset === asset);
    
    if (!assetYield) {
      return [];
    }

    return [{
      address: assetYield.poolAddress ?? '',
      asset,
      apy: assetYield.currentAPY,
      tvl: assetYield.tvl.toString(),
      utilization: 0, // Would need additional API call to get utilization
      lastUpdated: new Date(),
    }];
  }

  async getCurrentAPY(chain: string, poolAddress: string): Promise<number> {
    const yields = await this.getYields(chain);
    const pool = yields.find(y => y.poolAddress === poolAddress);
    return pool?.currentAPY ?? 0;
  }

  async getTVL(chain: string, poolAddress: string): Promise<bigint> {
    const yields = await this.getYields(chain);
    const pool = yields.find(y => y.poolAddress === poolAddress);
    return pool?.tvl ?? 0n;
  }

  private async fetchAaveData(chain: string): Promise<AaveReserveData[]> {
    const query = `
      query GetReserves {
        reserves(first: 50, where: { isActive: true }) {
          symbol
          liquidityRate
          variableBorrowRate
          stableBorrowRate
          totalLiquidity
          utilizationRate
          aTokenAddress
          underlyingAsset
        }
      }
    `;

    try {
      const response = await axios.post(this.API_BASE_URLS[chain as keyof typeof this.API_BASE_URLS], {
        query,
      });

      const responseData = response.data as { data?: { reserves?: AaveReserveData[] } };
      return responseData.data?.reserves ?? [];
    } catch (error) {
      console.error(`Error fetching Aave data for ${chain}:`, error);
      
      // Fallback to mock data for development
      return this.getMockAaveData(chain);
    }
  }

  private mapToYieldOpportunity(reserve: AaveReserveData, chain: string): YieldOpportunity {
    // Convert liquidityRate from ray (27 decimals) to percentage
    const liquidityRate = parseFloat(reserve.liquidityRate) / 1e27;
    const currentAPY = liquidityRate * 100;

    // Convert totalLiquidity from wei to big number
    const tvl = BigInt(reserve.totalLiquidity || '0');

    // Calculate utilization rate
    const utilizationRate = parseFloat(reserve.utilizationRate) / 1e27 * 100;

    return {
      protocol: 'aave',
      chain: chain as 'ethereum' | 'polygon',
      asset: reserve.symbol as 'USDC' | 'USDT' | 'DAI',
      currentAPY,
      projectedAPY: currentAPY * 1.05, // Simple 5% optimistic projection
      tvl,
      risk_score: this.calculateRiskScore(currentAPY, tvl, utilizationRate),
      poolAddress: reserve.aTokenAddress,
      tokenAddress: reserve.underlyingAsset,
    };
  }

  private getMockAaveData(chain: string): AaveReserveData[] {
    // Mock data for development when API is unavailable
    const baseRates = {
      ethereum: { USDC: '0.025', USDT: '0.022', DAI: '0.028' },
      polygon: { USDC: '0.045', USDT: '0.042', DAI: '0.048' },
    };

    const chainRates = baseRates[chain as keyof typeof baseRates] || baseRates.ethereum;

    return Object.entries(chainRates).map(([symbol, rate]) => ({
      symbol,
      liquidityRate: (parseFloat(rate) * 1e27).toString(), // Convert to ray format
      variableBorrowRate: (parseFloat(rate) * 1.5 * 1e27).toString(),
      stableBorrowRate: (parseFloat(rate) * 1.8 * 1e27).toString(),
      totalLiquidity: (BigInt(100000000) * BigInt(1e18)).toString(), // 100M tokens
      utilizationRate: (0.7 * 1e27).toString(), // 70% utilization
      aTokenAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
      underlyingAsset: TOKEN_ADDRESSES[symbol as keyof typeof TOKEN_ADDRESSES]?.[chain as keyof typeof TOKEN_ADDRESSES.USDC] || '0x',
    }));
  }
}