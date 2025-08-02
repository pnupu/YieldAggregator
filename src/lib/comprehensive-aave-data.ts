import fs from 'fs';
import path from 'path';
import { AaveDataParser, type AaveRateData } from './aave-data-parser';

interface AaveJSONEntry {
  protocol: string;
  contract_address: string;
  asset: string;
  'supply apr': string;
  'borrow apr': string;
  'supplied ($)': string;
  'borrowed ($)': string;
  supplied: string;
  borrowed: string;
}

export class ComprehensiveAaveDataProvider {
  private static cachedData: AaveRateData[] | null = null;
  private static lastFetch = 0;
  private static readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Load and parse the comprehensive Aave JSON data
   */
  static loadComprehensiveAaveData(): AaveRateData[] {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cachedData && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedData;
    }

    try {
      // Load the JSON file from the project root
      const filePath = path.join(process.cwd(), 'aave_all_protocols.json');
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent) as AaveJSONEntry[];

      // Convert to our internal format
      const aaveData: AaveRateData[] = jsonData.map(entry => ({
        protocol: entry.protocol,
        contractAddress: entry.contract_address,
        asset: entry.asset,
        supplyAPR: parseFloat(entry['supply apr'].replace('%', '')),
        borrowAPR: parseFloat(entry['borrow apr'].replace('%', '')),
        suppliedUSD: entry['supplied ($)'],
        borrowedUSD: entry['borrowed ($)'],
        supplied: entry.supplied,
        borrowed: entry.borrowed,
        chain: this.mapProtocolToChain(entry.protocol),
      }));

      // Filter for supported assets and positive APR
      const filteredData = aaveData.filter(item => 
        this.isSupportedAsset(item.asset) &&
        this.isSupportedChain(item.chain) &&
        item.supplyAPR > 0
      );

      // Cache the data
      this.cachedData = filteredData;
      this.lastFetch = now;

      console.log(`Loaded ${filteredData.length} comprehensive Aave opportunities from ${jsonData.length} total entries`);
      console.log(`Chains: ${[...new Set(filteredData.map(d => d.chain))].join(', ')}`);
      console.log(`Assets: ${[...new Set(filteredData.map(d => d.asset))].join(', ')}`);
      
      return filteredData;
    } catch (error) {
      console.error('Error loading comprehensive Aave data:', error);
      // Fallback to empty array
      return [];
    }
  }

  /**
   * Get Aave data for a specific chain
   */
  static getAaveDataForChain(chain: string): AaveRateData[] {
    const allData = this.loadComprehensiveAaveData();
    return allData.filter(item => item.chain === chain);
  }

  /**
   * Get Aave opportunities as YieldOpportunity objects
   */
  static getAaveOpportunities(chain?: string) {
    const data = chain ? this.getAaveDataForChain(chain) : this.loadComprehensiveAaveData();
    return AaveDataParser.toYieldOpportunities(data);
  }

  /**
   * Map protocol names to chain names
   */
  private static mapProtocolToChain(protocol: string): string {
    const chainMapping: Record<string, string> = {
      'mainnet': 'ethereum',
      'polygon-v3': 'polygon',
      'arbitrum-v3': 'arbitrum', 
      'base-v3': 'base',
      'optimism-v3': 'optimism',
      'sonic-v3': 'sonic',
    };
    
    return chainMapping[protocol] ?? 'ethereum';
  }

  /**
   * Check if asset is supported in our system
   */
  private static isSupportedAsset(asset: string): boolean {
    // Expand the list of supported assets based on what's available
    const supportedAssets = [
      'USDC', 'USDT', 'DAI', 'WETH', 'WBTC', 
      'weETH', 'wstETH', 'cbBTC', 'cbETH', 'ezETH',
      'USDe', 'sUSDe', 'RLUSD', 'AAVE', 'FRAX',
      'CRV', 'BAL', 'ARB', 'OP', 'MATIC'
    ];
    return supportedAssets.includes(asset);
  }

  /**
   * Check if chain is supported
   */
  private static isSupportedChain(chain: string): boolean {
    const supportedChains = ['ethereum', 'polygon', 'arbitrum', 'base', 'optimism'];
    return supportedChains.includes(chain);
  }

  /**
   * Get statistics about the loaded data
   */
  static getDataStats() {
    const data = this.loadComprehensiveAaveData();
    const chains = [...new Set(data.map(d => d.chain))];
    const assets = [...new Set(data.map(d => d.asset))];
    const protocolCounts = data.reduce((acc, item) => {
      acc[item.chain] = (acc[item.chain] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOpportunities: data.length,
      chains,
      assets,
      protocolCounts,
      avgAPR: data.reduce((sum, item) => sum + item.supplyAPR, 0) / data.length,
      maxAPR: Math.max(...data.map(item => item.supplyAPR)),
    };
  }
}