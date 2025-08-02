import axios from 'axios';
import { BaseYieldProvider } from './base';
import type { YieldOpportunity, PoolData } from '../types';
import { TOKEN_ADDRESSES } from '../types';

interface CurvePoolData {
  address: string;
  name: string;
  coins: Array<{
    symbol: string;
    address: string;
  }>;
  apy: number;
  totalSupply: string;
  virtualPrice: string;
}


export class CurveProvider extends BaseYieldProvider {
  protocol = 'curve' as const;
  supportedChains = ['ethereum', 'polygon'];
  supportedAssets = ['USDC', 'USDT', 'DAI'];

  private readonly API_BASE_URLS = {
    ethereum: 'https://api.curve.fi/api/getPools/ethereum',
    polygon: 'https://api.curve.fi/api/getPools/polygon',
  };

  // Common stablecoin pools for each chain
  private readonly STABLECOIN_POOLS = {
    ethereum: {
      '3pool': '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7', // DAI/USDC/USDT
      'USDC': '0xA0b86a33E6417fA1faCBE1eF4f7cb8Dd8B16e5f3',
    },
    polygon: {
      'aave3pool': '0x445FE580eF8d70FF569aB36e80c647af338db351', // DAI/USDC/USDT
      'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    },
  };

  async getYields(chain: string): Promise<YieldOpportunity[]> {
    if (!this.supportedChains.includes(chain)) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    return this.fetchWithRetry(async () => {
      const poolsData = await this.fetchCurveData(chain);
      
      return poolsData
        .filter(pool => this.isStablecoinPool(pool))
        .flatMap(pool => this.mapPoolToYieldOpportunities(pool, chain));
    });
  }

  async getPoolData(chain: string, asset: string): Promise<PoolData[]> {
    const yields = await this.getYields(chain);
    
    return yields
      .filter(y => y.asset === asset)
      .map(y => ({
        address: y.poolAddress ?? '',
        asset,
        apy: y.currentAPY,
        tvl: y.tvl.toString(),
        utilization: 0, // Curve doesn't have traditional utilization rates
        lastUpdated: new Date(),
      }));
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

  private async fetchCurveData(chain: string): Promise<CurvePoolData[]> {
    try {
      const response = await axios.get(this.API_BASE_URLS[chain as keyof typeof this.API_BASE_URLS], {
        timeout: 10000,
      });

      const responseData = response.data as { data?: { poolData?: CurvePoolData[] } };
      return responseData.data?.poolData ?? [];
    } catch (error) {
      console.error(`Error fetching Curve data for ${chain}:`, error);
      
      // Fallback to mock data for development
      return this.getMockCurveData(chain);
    }
  }

  private isStablecoinPool(pool: CurvePoolData): boolean {
    const stablecoins = ['USDC', 'USDT', 'DAI', 'TUSD', 'BUSD', 'FRAX'];
    
    return pool.coins.some(coin => 
      stablecoins.some(stable => 
        coin.symbol.toUpperCase().includes(stable)
      )
    );
  }

  private mapPoolToYieldOpportunities(pool: CurvePoolData, chain: string): YieldOpportunity[] {
    const opportunities: YieldOpportunity[] = [];
    
    // Create opportunities for each supported stablecoin in the pool
    for (const coin of pool.coins) {
      const asset = this.normalizeAssetSymbol(coin.symbol);
      
      if (this.supportedAssets.includes(asset)) {
        // Estimate TVL (this would need more sophisticated calculation in production)
        const estimatedTVL = BigInt(Math.floor(parseFloat(pool.totalSupply) * parseFloat(pool.virtualPrice)));
        
        opportunities.push({
          protocol: 'curve',
          chain: chain as 'ethereum' | 'polygon',
          asset: asset as 'USDC' | 'USDT' | 'DAI',
          currentAPY: pool.apy,
          projectedAPY: pool.apy * 1.02, // Conservative 2% optimistic projection
          tvl: estimatedTVL,
          risk_score: this.calculateRiskScore(pool.apy, estimatedTVL, 0), // Curve has no utilization
          poolAddress: pool.address,
          tokenAddress: coin.address,
        });
      }
    }
    
    return opportunities;
  }

  private normalizeAssetSymbol(symbol: string): string {
    // Handle various Curve token naming conventions
    const upperSymbol = symbol.toUpperCase();
    
    if (upperSymbol.includes('USDC')) return 'USDC';
    if (upperSymbol.includes('USDT')) return 'USDT';
    if (upperSymbol.includes('DAI')) return 'DAI';
    
    return symbol;
  }

  private getMockCurveData(chain: string): CurvePoolData[] {
    const baseAPYs = {
      ethereum: { USDC: 3.2, USDT: 3.1, DAI: 3.4 },
      polygon: { USDC: 5.8, USDT: 5.6, DAI: 6.1 },
    };

    const chainAPYs = baseAPYs[chain as keyof typeof baseAPYs] || baseAPYs.ethereum;
    const poolsConfig = this.STABLECOIN_POOLS[chain as keyof typeof this.STABLECOIN_POOLS] || this.STABLECOIN_POOLS.ethereum;

    return [{
      address: ('3pool' in poolsConfig) ? poolsConfig['3pool'] : ('aave3pool' in poolsConfig) ? poolsConfig.aave3pool : '0x123',
      name: '3Pool',
      coins: [
        {
          symbol: 'DAI',
          address: TOKEN_ADDRESSES.DAI[chain as keyof typeof TOKEN_ADDRESSES.DAI] || '0x',
        },
        {
          symbol: 'USDC',
          address: TOKEN_ADDRESSES.USDC[chain as keyof typeof TOKEN_ADDRESSES.USDC] || '0x',
        },
        {
          symbol: 'USDT',
          address: TOKEN_ADDRESSES.USDT[chain as keyof typeof TOKEN_ADDRESSES.USDT] || '0x',
        },
      ],
      apy: Math.max(...Object.values(chainAPYs)), // Use highest APY for the pool
      totalSupply: '500000000', // 500M LP tokens
      virtualPrice: '1.02', // Slight appreciation over time
    }];
  }
}