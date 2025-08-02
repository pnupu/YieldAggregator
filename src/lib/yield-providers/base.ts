import type { YieldOpportunity, PoolData } from '../types';

export abstract class BaseYieldProvider {
  abstract protocol: string;
  abstract supportedChains: string[];
  abstract supportedAssets: string[];

  /**
   * Fetch current yield opportunities for this protocol
   */
  abstract getYields(chain: string): Promise<YieldOpportunity[]>;

  /**
   * Get detailed pool information
   */
  abstract getPoolData(chain: string, asset: string): Promise<PoolData[]>;

  /**
   * Get current APY for a specific pool
   */
  abstract getCurrentAPY(chain: string, poolAddress: string): Promise<number>;

  /**
   * Get total value locked in a pool
   */
  abstract getTVL(chain: string, poolAddress: string): Promise<bigint>;

  /**
   * Check if this provider supports the given chain and asset
   */
  supports(chain: string, asset: string): boolean {
    return this.supportedChains.includes(chain) && this.supportedAssets.includes(asset);
  }

  /**
   * Calculate risk score for a yield opportunity
   */
  protected calculateRiskScore(
    apy: number,
    tvl: bigint,
    utilization: number
  ): number {
    // Higher APY = higher risk (simplified model)
    const apyRisk = Math.min((apy || 0) / 20, 1); // Normalize to 0-1, 20% APY = max risk
    
    // Lower TVL = higher risk (use reasonable scale for TVL)
    const tvlNumber = Number(tvl) || 0;
    const tvlRisk = Math.max(1 - tvlNumber / 1e8, 0); // $100M TVL = min risk
    
    // Higher utilization = higher risk
    const utilizationRisk = (utilization || 0) / 100;
    
    // Weighted average (APY has highest weight)
    const score = (apyRisk * 0.5 + tvlRisk * 0.3 + utilizationRisk * 0.2) * 10;
    return Math.max(0.1, Math.min(10, score)); // Clamp between 0.1 and 10
  }

  /**
   * Fetch data with retry logic
   */
  protected async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fetchFn();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError!;
  }
}