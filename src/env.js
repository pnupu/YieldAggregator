import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    
    // 1inch API Configuration
    ONEINCH_API_KEY: z.string().min(1),
    ONEINCH_BASE_URL: z.string().url().default("https://api.1inch.dev"),
    
    // Blockchain RPC URLs
    ETHEREUM_RPC_URL: z.string().url(),
    POLYGON_RPC_URL: z.string().url(),
    GOERLI_RPC_URL: z.string().url().optional(),
    MUMBAI_RPC_URL: z.string().url().optional(),
    
    // External API Keys
    DEFILLAMA_API_KEY: z.string().optional(),
    MORALIS_API_KEY: z.string().optional(),
    
    // Wallet Configuration
    PRIVATE_KEY: z.string().min(1),
    AGENT_WALLET_ADDRESS: z.string().min(1),
    
    // Safety Limits
    MIN_PROFIT_THRESHOLD: z.string().default("0.5"),
    MAX_SLIPPAGE: z.string().default("1.0"),
    MAX_MOVE_AMOUNT: z.string().default("10000"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    
    // 1inch API Configuration
    ONEINCH_API_KEY: process.env.ONEINCH_API_KEY,
    ONEINCH_BASE_URL: process.env.ONEINCH_BASE_URL,
    
    // Blockchain RPC URLs
    ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL,
    POLYGON_RPC_URL: process.env.POLYGON_RPC_URL,
    GOERLI_RPC_URL: process.env.GOERLI_RPC_URL,
    MUMBAI_RPC_URL: process.env.MUMBAI_RPC_URL,
    
    // External API Keys
    DEFILLAMA_API_KEY: process.env.DEFILLAMA_API_KEY,
    MORALIS_API_KEY: process.env.MORALIS_API_KEY,
    
    // Wallet Configuration
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    AGENT_WALLET_ADDRESS: process.env.AGENT_WALLET_ADDRESS,
    
    // Safety Limits
    MIN_PROFIT_THRESHOLD: process.env.MIN_PROFIT_THRESHOLD,
    MAX_SLIPPAGE: process.env.MAX_SLIPPAGE,
    MAX_MOVE_AMOUNT: process.env.MAX_MOVE_AMOUNT,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
