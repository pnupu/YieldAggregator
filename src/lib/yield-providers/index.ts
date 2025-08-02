import { AaveProvider } from './aave';
import { BaseYieldProvider } from './base';
import type { YieldOpportunity } from '../types';

export class YieldProviderManager {
  private providers: BaseYieldProvider[];

  constructor() {
    this.providers = [
      new AaveProvider(),
    ];
  }

  /**
   * Get all yield opportunities across all protocols and chains
   */
  async getAllYields(): Promise<YieldOpportunity[]> {
    const allOpportunities: YieldOpportunity[] = [];

    for (const provider of this.providers) {
      for (const chain of provider.supportedChains) {
        try {
          const opportunities = await provider.getYields(chain);
          allOpportunities.push(...opportunities);
        } catch (error) {
          console.error(`Error fetching yields from ${provider.protocol} on ${chain}:`, error);
        }
      }
    }

    return allOpportunities;
  }

  /**
   * Get yields for a specific protocol
   */
  async getYieldsForProtocol(protocol: string, chain?: string): Promise<YieldOpportunity[]> {
    const provider = this.providers.find(p => p.protocol === protocol);
    
    if (!provider) {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }

    if (chain) {
      return provider.getYields(chain);
    }

    const allOpportunities: YieldOpportunity[] = [];
    for (const supportedChain of provider.supportedChains) {
      try {
        const opportunities = await provider.getYields(supportedChain);
        allOpportunities.push(...opportunities);
      } catch (error) {
        console.error(`Error fetching yields from ${protocol} on ${supportedChain}:`, error);
      }
    }

    return allOpportunities;
  }

  /**
   * Get yields for a specific asset across all protocols
   */
  async getYieldsForAsset(asset: string, chain?: string): Promise<YieldOpportunity[]> {
    const allYields = await this.getAllYields();
    
    let filtered = allYields.filter(y => y.asset === asset);
    
    if (chain) {
      filtered = filtered.filter(y => y.chain === chain);
    }

    return filtered.sort((a, b) => b.currentAPY - a.currentAPY);
  }

  /**
   * Get the best yield opportunity for a specific asset
   */
  async getBestYieldForAsset(asset: string, chain?: string): Promise<YieldOpportunity | null> {
    const yields = await this.getYieldsForAsset(asset, chain);
    
    if (yields.length === 0) {
      return null;
    }

    // Sort by risk-adjusted return (APY / risk_score)
    yields.sort((a, b) => {
      const aScore = a.currentAPY / Math.max(a.risk_score, 1);
      const bScore = b.currentAPY / Math.max(b.risk_score, 1);
      return bScore - aScore;
    });

    return yields[0] ?? null;
  }

  /**
   * Compare yields across different chains for the same asset
   */
  async compareYieldsAcrossChains(asset: string): Promise<{
    ethereum: YieldOpportunity[];
    polygon: YieldOpportunity[];
    bestOverall: YieldOpportunity | null;
  }> {
    const [ethereumYields, polygonYields] = await Promise.all([
      this.getYieldsForAsset(asset, 'ethereum'),
      this.getYieldsForAsset(asset, 'polygon'),
    ]);

    const allYields = [...ethereumYields, ...polygonYields];
    const bestOverall = allYields.length > 0 
      ? allYields.reduce((best, current) => 
          current.currentAPY > best.currentAPY ? current : best
        )
      : null as YieldOpportunity | null;

    return {
      ethereum: ethereumYields,
      polygon: polygonYields,
      bestOverall,
    };
  }

  /**
   * Get supported protocols
   */
  getSupportedProtocols(): string[] {
    return this.providers.map(p => p.protocol);
  }

  /**
   * Get supported chains for a protocol
   */
  getSupportedChains(protocol?: string): string[] {
    if (protocol) {
      const provider = this.providers.find(p => p.protocol === protocol);
      return provider ? provider.supportedChains : [];
    }

    // Return all unique chains across all providers
    const allChains = this.providers.flatMap(p => p.supportedChains);
    return [...new Set(allChains)];
  }

  /**
   * Get supported assets for a protocol
   */
  getSupportedAssets(protocol?: string): string[] {
    if (protocol) {
      const provider = this.providers.find(p => p.protocol === protocol);
      return provider ? provider.supportedAssets : [];
    }

    // Return all unique assets across all providers
    const allAssets = this.providers.flatMap(p => p.supportedAssets);
    return [...new Set(allAssets)];
  }
}

// Export singleton instance
export const yieldProviderManager = new YieldProviderManager();

// Export individual providers
export { AaveProvider, BaseYieldProvider };
export * from '../types';