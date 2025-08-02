export interface YieldOpportunity {
  protocol: 'aave' | 'compound';
  chain: 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism';
  asset: 'USDC' | 'USDT' | 'DAI' | 'WETH' | 'WBTC' | 'weETH' | 'wstETH' | 'cbBTC' | 'cbETH' | 'ezETH' | 'USDe' | 'sUSDe' | 'RLUSD' | 'AAVE' | 'FRAX' | 'CRV' | 'BAL' | 'ARB' | 'OP' | 'MATIC';
  currentAPY: number;
  projectedAPY: number;
  tvl: bigint;
  risk_score: number;
  poolAddress?: string;
  tokenAddress?: string;
}

export interface Position {
  protocol: string;
  chain: string;
  asset: string;
  amount: bigint;
  apy: number;
  userAddress: string;
  lastUpdated: Date;
}

export interface ProfitabilityAnalysis {
  netAPYGain: number;
  executionCostPercentage: number;
  breakEvenTimeMonths: number;
  recommendedAction: 'execute' | 'hold' | 'monitor';
  expectedProfit: number;
  riskScore: number;
}

export interface YieldRecommendation {
  currentPosition: Position;
  targetOpportunity: YieldOpportunity;
  profitabilityAnalysis: ProfitabilityAnalysis;
  shouldExecute: boolean;
  estimatedGasCost: string;
  estimatedTime: number; // minutes
}

export interface ExecutionReport {
  analyzedPositions: number;
  recommendationsGenerated: number;
  movesExecuted: number;
  totalGasOptimized: number;
  estimatedAPYIncrease: number;
  timestamp: Date;
}

export interface MoveResult {
  success: boolean;
  fromAPY?: number;
  toAPY?: number;
  netGain?: number;
  finalAmount?: bigint;
  gasOptimized?: boolean;
  error?: string;
  rollbackRequired?: boolean;
  txHash?: string;
}

export interface ProtocolData {
  name: string;
  chain: string;
  pools: PoolData[];
}

export interface PoolData {
  address: string;
  asset: string;
  apy: number;
  tvl: string;
  utilization: number;
  lastUpdated: Date;
}

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  nativeCurrency: string;
  blockExplorer: string;
}

export interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
  chain: string;
}

export const CHAIN_IDS = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
  goerli: 5,
  mumbai: 80001,
} as const;

export const TOKEN_ADDRESSES = {
  USDC: {
    ethereum: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum (official)
    polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
    arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
    base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // USDC on Optimism
  },
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Ethereum  
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
    arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT on Arbitrum
    base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // USDT on Base
    optimism: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // USDT on Optimism
  },
  DAI: {
    ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI on Ethereum
    polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI on Polygon
    arbitrum: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI on Arbitrum
    base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI on Base (same as USDT for now)
    optimism: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI on Optimism
  },
  WETH: {
    ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
    polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH on Polygon
    arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
    base: '0x4200000000000000000000000000000000000006', // WETH on Base
    optimism: '0x4200000000000000000000000000000000000006', // WETH on Optimism
  },
  WBTC: {
    ethereum: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC on Ethereum
    polygon: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // WBTC on Polygon
    arbitrum: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // WBTC on Arbitrum
    base: '0x4200000000000000000000000000000000000006', // WBTC on Base (using WETH for now)
    optimism: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', // WBTC on Optimism
  },
} as const;