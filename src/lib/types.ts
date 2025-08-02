export interface YieldOpportunity {
  protocol: 'aave' | 'compound' | 'curve';
  chain: 'ethereum' | 'polygon';
  asset: 'USDC' | 'USDT' | 'DAI';
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
  goerli: 5,
  mumbai: 80001,
} as const;

export const TOKEN_ADDRESSES = {
  USDC: {
    ethereum: '0xA0b86a33E6417fA1faCBE1eF4f7cb8Dd8B16e5f3',
    polygon: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  },
  USDT: {
    ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  DAI: {
    ethereum: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    polygon: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  },
} as const;