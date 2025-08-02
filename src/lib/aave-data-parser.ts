export interface AaveRateData {
  protocol: string;
  contractAddress: string;
  asset: string;
  supplyAPR: number;
  borrowAPR: number;
  suppliedUSD: string;
  borrowedUSD: string;
  supplied: string;
  borrowed: string;
  chain: string;
}

export class AaveDataParser {
  /**
   * Parse CSV data from aaverates.py output
   */
  static parseCSVData(csvData: string, chain = 'ethereum'): AaveRateData[] {
    const lines = csvData.trim().split('\n');
    const results: AaveRateData[] = [];
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line?.trim()) continue;
      
      const columns = line.split(',');
      if (columns.length < 8) continue;
      
      try {
        const [
          protocol,
          contractAddress,
          asset,
          supplyAPRStr,
          borrowAPRStr,
          suppliedUSD,
          borrowedUSD,
          supplied,
          borrowed
        ] = columns;
        
        // Ensure all required fields exist
        if (!protocol || !contractAddress || !asset || !supplyAPRStr || !borrowAPRStr || 
            !suppliedUSD || !borrowedUSD || !supplied || !borrowed) {
          continue;
        }
        
        // Parse APR percentages (remove % and convert to number)
        const supplyAPR = parseFloat(supplyAPRStr.replace('%', ''));
        const borrowAPR = parseFloat(borrowAPRStr.replace('%', ''));
        
        results.push({
          protocol,
          contractAddress,
          asset,
          supplyAPR,
          borrowAPR,
          suppliedUSD,
          borrowedUSD,
          supplied,
          borrowed,
          chain: this.mapChainName(protocol, chain),
        });
      } catch (error) {
        console.warn(`Failed to parse line: ${line}`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Map protocol names to chain names
   */
  private static mapChainName(protocol: string, defaultChain: string): string {
    const chainMapping: Record<string, string> = {
      'mainnet': 'ethereum',
      'polygon': 'polygon',
      'base': 'base',
      'optimism': 'optimism',
      'arbitrum': 'arbitrum',
      'sonic': 'sonic',
    };
    
    return chainMapping[protocol.toLowerCase()] ?? defaultChain;
  }
  
  /**
   * Filter data for supported tokens and chains
   */
  static filterSupportedAssets(data: AaveRateData[]): AaveRateData[] {
    const supportedAssets = ['USDC', 'USDT', 'DAI', 'WETH', 'WBTC'];
    const supportedChains = ['ethereum', 'polygon'];
    
    return data.filter(item => 
      supportedAssets.includes(item.asset) && 
      supportedChains.includes(item.chain) &&
      item.supplyAPR > 0 // Only include assets with positive APR
    );
  }
  
  /**
   * Convert to YieldOpportunity format
   */
  static toYieldOpportunities(data: AaveRateData[]) {
    return data.map((item) => ({
      protocol: 'aave' as const,
      chain: item.chain as 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism',
      asset: item.asset as 'USDC' | 'USDT' | 'DAI' | 'WETH' | 'WBTC' | 'weETH' | 'wstETH' | 'cbBTC' | 'cbETH' | 'ezETH' | 'USDe' | 'sUSDe' | 'RLUSD' | 'AAVE' | 'FRAX' | 'CRV' | 'BAL' | 'ARB' | 'OP' | 'MATIC',
      currentAPY: item.supplyAPR,
      projectedAPY: item.supplyAPR * 1.05, // Assume 5% growth for projection
      tvl: this.parseTVLToBigInt(item.suppliedUSD),
      risk_score: this.calculateRiskScore(item),
      poolAddress: item.contractAddress,
    }));
  }
  
  /**
   * Parse TVL string to BigInt (in USD cents for precision)
   */
  private static parseTVLToBigInt(tvlStr: string): bigint {
    // Remove $ and commas
    const cleanStr = tvlStr.replace(/[$,]/g, '');
    let value = parseFloat(cleanStr);
    
    // Handle B (billions) and M (millions) suffixes
    if (cleanStr.includes('B')) {
      value *= 1000000000; // Billions
    } else if (cleanStr.includes('M')) {
      value *= 1000000; // Millions
    }
    
    // Store as USD cents (multiply by 100) for precision without huge numbers
    return BigInt(Math.floor(value * 100));
  }
  
  /**
   * Calculate risk score based on TVL and utilization
   */
  private static calculateRiskScore(item: AaveRateData): number {
    // Parse TVL (remove $ and B/M suffixes)
    const tvlStr = item.suppliedUSD.replace('$', '').replace(',', '');
    let tvlValue = parseFloat(tvlStr);
    
    if (tvlStr.includes('B')) {
      tvlValue *= 1000000000; // Billions
    } else if (tvlStr.includes('M')) {
      tvlValue *= 1000000; // Millions
    }
    
    // Higher TVL = lower risk, higher APR = higher risk
    const tvlRisk = Math.max(1, 10 - (tvlValue / 1000000000)); // Scale based on billions
    const aprRisk = Math.min(5, item.supplyAPR / 2); // Higher APR = more risk
    
    return Math.min(10, Math.max(1, Math.round((tvlRisk + aprRisk) / 2)));
  }
  
  /**
   * Generate Aave protocol URL
   */
  private static generateAaveURL(item: AaveRateData): string {
    const baseURL = 'https://app.aave.com';
    const chainPath = item.chain === 'ethereum' ? '' : `/${item.chain}`;
    return `${baseURL}${chainPath}/reserve-overview/?underlyingAsset=${item.contractAddress}`;
  }
}