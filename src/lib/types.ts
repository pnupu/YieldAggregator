export interface YieldOpportunity {
  protocol: 'aave' | 'compound';
  chain: 'ethereum' | 'polygon' | 'arbitrum' | 'base' | 'optimism';
  asset: 'USDC' | 'USDT' | 'DAI' | 'WETH' | 'WBTC' | 'weETH' | 'wstETH' | 'cbBTC' | 'cbETH' | 'ezETH' | 'USDe' | 'sUSDe' | 'RLUSD' | 'AAVE' | 'FRAX' | 'CRV' | 'BAL' | 'ARB' | 'OP' | 'MATIC';
  currentAPY: number;
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

// Aave token addresses (for deposits/withdrawals)
export const AAVE_TOKEN_ADDRESSES = {
  USDC: {
    ethereum: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c', // aUSDC on Ethereum
    polygon: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // aUSDC on Polygon
    arbitrum: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // aUSDC on Arbitrum
    base: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB', // aUSDC on Base
    optimism: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', // aUSDC on Optimism
  },
  USDT: {
    ethereum: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a', // aUSDT on Ethereum
    polygon: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620', // aUSDT on Polygon
    arbitrum: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620', // aUSDT on Arbitrum
    base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // aUSDT on Base (fallback)
    optimism: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620', // aUSDT on Optimism
  },
  DAI: {
    ethereum: '0x018008bfb33d285247A21d44E50697654f754e63', // aDAI on Ethereum
    polygon: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE', // aDAI on Polygon
    arbitrum: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE', // aDAI on Arbitrum
    base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // aDAI on Base (fallback)
    optimism: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE', // aDAI on Optimism
  },
  WETH: {
    ethereum: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8', // aWETH on Ethereum
    polygon: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8', // aWETH on Polygon
    arbitrum: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8', // aWETH on Arbitrum
    base: '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7', // aWETH on Base
    optimism: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8', // aWETH on Optimism
  },
  WBTC: {
    ethereum: '0x5Ee5bf7ae06D1Be5997A1A72006FE6C607eC6DE8', // aWBTC on Ethereum
    polygon: '0x078f358208685046a11C85e8ad32895DED33A249', // aWBTC on Polygon
    arbitrum: '0x078f358208685046a11C85e8ad32895DED33A249', // aWBTC on Arbitrum
    base: '0x4200000000000000000000000000000000000006', // aWBTC on Base (fallback)
    optimism: '0x078f358208685046a11C85e8ad32895DED33A249', // aWBTC on Optimism
  },
  weETH: {
    ethereum: '0xBdfa7b7893081B35Fb54027489e2Bc7A38275129', // aweETH on Ethereum
    polygon: '', // aweETH not available on Polygon
    arbitrum: '0x8437d7C167dFB82ED4Cb79CD44B7a32A1dd95c77', // aweETH on Arbitrum
    base: '0x7C307e128efA31F540F2E2d976C995E0B65F51F6', // aweETH on Base
    optimism: '', // aweETH not available on Optimism
  },
  wstETH: {
    ethereum: '0x0B925eD163218f662a35e0f0371Ac234f9E9371', // awstETH on Ethereum
    polygon: '0xf59036CAEBeA7dC4b86638DFA2E3C97dA9FcCd40', // awstETH on Polygon
    arbitrum: '0x513c7E3a9c69cA3e22550eF58AC1C0088e918FFf', // awstETH on Arbitrum
    base: '0x99CBC45ea5bb7eF3a5BC08FB1B7E56bB2442Ef0D', // awstETH on Base
    optimism: '0xc45A479877e1e9Dfe9FcD4056c699575a1045dAA', // awstETH on Optimism
  },
  cbBTC: {
    ethereum: '0x5c647cE0Ae10658ec44FA4E11A51c96e94efd1Dd', // acbBTC on Ethereum
    polygon: '', // acbBTC not available on Polygon
    arbitrum: '', // acbBTC not available on Arbitrum
    base: '0xBdb9300b7CDE636d9cD4AFF00f6F009fFBBc8EE6', // acbBTC on Base
    optimism: '', // acbBTC not available on Optimism
  },
  cbETH: {
    ethereum: '0x977b6fc5dE62598B08C85AC8Cf2b745874E8b78c', // acbETH on Ethereum
    polygon: '', // acbETH not available on Polygon
    arbitrum: '', // acbETH not available on Arbitrum
    base: '0xcf3D55c10DB69f28fD1A75Bd73f3D8A2d9c595ad', // acbETH on Base
    optimism: '', // acbETH not available on Optimism
  },
  ezETH: {
    ethereum: '', // aezETH not available on Ethereum
    polygon: '', // aezETH not available on Polygon
    arbitrum: '0xEA1132120ddcDDA2F119e99Fa7A27a0d036F7Ac9', // aezETH on Arbitrum
    base: '0xDD5745756C2de109183c6B5bB886F9207bEF114D', // aezETH on Base
    optimism: '', // aezETH not available on Optimism
  },
  USDe: {
    ethereum: '0x4F5923Fc5FD4a93352581b38B7cD26943012DECF', // aUSDe on Ethereum
    polygon: '', // aUSDe not available on Polygon
    arbitrum: '', // aUSDe not available on Arbitrum
    base: '', // aUSDe not available on Base
    optimism: '', // aUSDe not available on Optimism
  },
  sUSDe: {
    ethereum: '0x4579a27aF00A62C0EB156349f31B345c08386419', // asUSDe on Ethereum
    polygon: '', // asUSDe not available on Polygon
    arbitrum: '', // asUSDe not available on Arbitrum
    base: '', // asUSDe not available on Base
    optimism: '', // asUSDe not available on Optimism
  },
  RLUSD: {
    ethereum: '0xFa82580c16A31D0c1bC632A36F82e83EfEF3Eec0', // aRLUSD on Ethereum
    polygon: '', // aRLUSD not available on Polygon
    arbitrum: '', // aRLUSD not available on Arbitrum
    base: '', // aRLUSD not available on Base
    optimism: '', // aRLUSD not available on Optimism
  },
  AAVE: {
    ethereum: '0xA700b4eB416Be35b2911fd5Dee80678ff64fF6C9', // aAAVE on Ethereum
    polygon: '0xf329e36C7bF6E5E86ce2150875a84Ce77f477375', // aAAVE on Polygon
    arbitrum: '0xf329e36C7bF6E5E86ce2150875a84Ce77f477375', // aAAVE on Arbitrum
    base: '0x67EAF2BeE4384a2f84Da9Eb8105C661C123736BA', // aAAVE on Base
    optimism: '0xf329e36C7bF6E5E86ce2150875a84Ce77f477375', // aAAVE on Optimism
  },
  FRAX: {
    ethereum: '0xd4e245848d6E1220DBE62e155d89fa327E43CB06', // aFRAX on Ethereum
    polygon: '', // aFRAX not available on Polygon
    arbitrum: '0x38d693cE1dF5AaDF7bC62595A37D667aD57922e5', // aFRAX on Arbitrum
    base: '', // aFRAX not available on Base
    optimism: '', // aFRAX not available on Optimism
  },
  CRV: {
    ethereum: '0x7B95Ec873268a6BFC6427e7a28e396Db9D0ebc65', // aCRV on Ethereum
    polygon: '0x513c7E3a9c69cA3e22550eF58AC1C0088e918FFf', // aCRV on Polygon
    arbitrum: '', // aCRV not available on Arbitrum
    base: '', // aCRV not available on Base
    optimism: '', // aCRV not available on Optimism
  },
  BAL: {
    ethereum: '0x2516E7B3F76294e03C42AA4c5b5b4DCE9C436fB8', // aBAL on Ethereum
    polygon: '0x8ffDf2DE812095b1D19CB146E4c004587C0A0692', // aBAL on Polygon
    arbitrum: '', // aBAL not available on Arbitrum
    base: '', // aBAL not available on Base
    optimism: '', // aBAL not available on Optimism
  },
  ARB: {
    ethereum: '', // aARB not available on Ethereum
    polygon: '', // aARB not available on Polygon
    arbitrum: '0x6533afac2E7BCCB20dca161449A13A32D391fb00', // aARB on Arbitrum
    base: '', // aARB not available on Base
    optimism: '', // aARB not available on Optimism
  },
  OP: {
    ethereum: '', // aOP not available on Ethereum
    polygon: '', // aOP not available on Polygon
    arbitrum: '', // aOP not available on Arbitrum
    base: '', // aOP not available on Base
    optimism: '0x513c7E3a9c69cA3e22550eF58AC1C0088e918FFf', // aOP on Optimism
  },
  MATIC: {
    ethereum: '', // aMATIC not available on Ethereum
    polygon: '0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97', // aMATIC on Polygon
    arbitrum: '', // aMATIC not available on Arbitrum
    base: '', // aMATIC not available on Base
    optimism: '', // aMATIC not available on Optimism
  },
} as const;

// Underlying token addresses (for cross-chain swaps)
export const TOKEN_ADDRESSES = {
  USDC: {
    ethereum: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum
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
    base: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // DAI on Base (fallback)
    optimism: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI on Optimism
  },
  WETH: {
    ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH on Ethereum
    polygon: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH on Polygon
    arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH on Arbitrum
    base: '0x4200000000000000000000000000000000000006', // WETH on Base (native ETH)
    optimism: '0x4200000000000000000000000000000000000006', // WETH on Optimism (native ETH)
  },
  WBTC: {
    ethereum: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC on Ethereum
    polygon: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // WBTC on Polygon
    arbitrum: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // WBTC on Arbitrum
    base: '', // WBTC not available on Base
    optimism: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', // WBTC on Optimism
  },
  weETH: {
    ethereum: '0xBdfa7b7893081B35Fb54027489e2Bc7A38275129', // weETH on Ethereum
    polygon: '', // weETH not available on Polygon
    arbitrum: '0x8437d7C167dFB82ED4Cb79CD44B7a32A1dd95c77', // weETH on Arbitrum
    base: '0x7C307e128efA31F540F2E2d976C995E0B65F51F6', // weETH on Base
    optimism: '', // weETH not available on Optimism
  },
  wstETH: {
    ethereum: '0x0B925eD163218f662a35e0f0371Ac234f9E9371', // wstETH on Ethereum
    polygon: '0xf59036CAEBeA7dC4b86638DFA2E3C97dA9FcCd40', // wstETH on Polygon
    arbitrum: '0x513c7E3a9c69cA3e22550eF58AC1C0088e918FFf', // wstETH on Arbitrum
    base: '0x99CBC45ea5bb7eF3a5BC08FB1B7E56bB2442Ef0D', // wstETH on Base
    optimism: '0xc45A479877e1e9Dfe9FcD4056c699575a1045dAA', // wstETH on Optimism
  },
  cbBTC: {
    ethereum: '0x5c647cE0Ae10658ec44FA4E11A51c96e94efd1Dd', // cbBTC on Ethereum
    polygon: '', // cbBTC not available on Polygon
    arbitrum: '', // cbBTC not available on Arbitrum
    base: '0xBdb9300b7CDE636d9cD4AFF00f6F009fFBBc8EE6', // cbBTC on Base
    optimism: '', // cbBTC not available on Optimism
  },
  cbETH: {
    ethereum: '0x977b6fc5dE62598B08C85AC8Cf2b745874E8b78c', // cbETH on Ethereum
    polygon: '', // cbETH not available on Polygon
    arbitrum: '', // cbETH not available on Arbitrum
    base: '0xcf3D55c10DB69f28fD1A75Bd73f3D8A2d9c595ad', // cbETH on Base
    optimism: '', // cbETH not available on Optimism
  },
  ezETH: {
    ethereum: '', // ezETH not available on Ethereum
    polygon: '', // ezETH not available on Polygon
    arbitrum: '0xEA1132120ddcDDA2F119e99Fa7A27a0d036F7Ac9', // ezETH on Arbitrum
    base: '0xDD5745756C2de109183c6B5bB886F9207bEF114D', // ezETH on Base
    optimism: '', // ezETH not available on Optimism
  },
  USDe: {
    ethereum: '0x4F5923Fc5FD4a93352581b38B7cD26943012DECF', // USDe on Ethereum
    polygon: '', // USDe not available on Polygon
    arbitrum: '', // USDe not available on Arbitrum
    base: '', // USDe not available on Base
    optimism: '', // USDe not available on Optimism
  },
  sUSDe: {
    ethereum: '0x4579a27aF00A62C0EB156349f31B345c08386419', // sUSDe on Ethereum
    polygon: '', // sUSDe not available on Polygon
    arbitrum: '', // sUSDe not available on Arbitrum
    base: '', // sUSDe not available on Base
    optimism: '', // sUSDe not available on Optimism
  },
  RLUSD: {
    ethereum: '0xFa82580c16A31D0c1bC632A36F82e83EfEF3Eec0', // RLUSD on Ethereum
    polygon: '', // RLUSD not available on Polygon
    arbitrum: '', // RLUSD not available on Arbitrum
    base: '', // RLUSD not available on Base
    optimism: '', // RLUSD not available on Optimism
  },
  AAVE: {
    ethereum: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', // AAVE on Ethereum
    polygon: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B', // AAVE on Polygon
    arbitrum: '0xBa5DdD1F9d7F570dc94a51479a000E3BCE967196', // AAVE on Arbitrum
    base: '0x67EAF2BeE4384a2f84Da9Eb8105C661C123736BA', // AAVE on Base
    optimism: '0x76FB31fb4af56892A25e32cFC43De717950c9278', // AAVE on Optimism
  },
  FRAX: {
    ethereum: '0x853d955aCEf822Db058eb8505911ED77F175b99e', // FRAX on Ethereum
    polygon: '0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89', // FRAX on Polygon
    arbitrum: '0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F', // FRAX on Arbitrum
    base: '', // FRAX on Base (fallback)
    optimism: '0x2E3D870790dC77A83DD1d18184Acc7439A53f475', // FRAX on Optimism
  },
  CRV: {
    ethereum: '0xD533a949740bb3306d119CC777fa900bA034cd52', // CRV on Ethereum
    polygon: '0x172370d5Cd63279eFa6d502DAB29171933a610AF', // CRV on Polygon
    arbitrum: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978', // CRV on Arbitrum
    base: '', // CRV on Base (fallback)
    optimism: '0x0994206dfE8De6Ec6920FF4D779B0d950605Fb53', // CRV on Optimism
  },
  BAL: {
    ethereum: '0xba100000625a3754423978a60c9317c58a424e3D', // BAL on Ethereum
    polygon: '0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3', // BAL on Polygon
    arbitrum: '0x040d1EdC9569d4Bab2D15287Dc5A4F10F56a56B8', // BAL on Arbitrum
    base: '', // BAL on Base (fallback)
    optimism: '0xFE8B128bA8C78aabC59d4c64cEE7fF28e9379921', // BAL on Optimism
  },
  ARB: {
    ethereum: '', // ARB on Ethereum (fallback)
    polygon: '', // ARB on Polygon (fallback)
    arbitrum: '0x912CE59144191C1204E64559FE8253a0e49E6548', // ARB on Arbitrum
    base: '', // ARB on Base (fallback)
    optimism: '', // ARB on Optimism (fallback)
  },
  OP: {
    ethereum: '', // OP on Ethereum (fallback)
    polygon: '', // OP on Polygon (fallback)
    arbitrum: '', // OP on Arbitrum (fallback)
    base: '', // OP on Base (fallback)
    optimism: '', // OP on Optimism (fallback)
  },
  MATIC: {
    ethereum: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608aCafEBB0', // MATIC on Ethereum
    polygon: '0x0000000000000000000000000000000000001010', // MATIC on Polygon (native)
    arbitrum: '', // MATIC on Arbitrum (fallback)
    base: '', // MATIC on Base (fallback)
    optimism: '', // MATIC on Optimism (fallback)
  },
} as const;