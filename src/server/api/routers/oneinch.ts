import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { oneInchCalculator } from "@/lib/oneinch-calculator";

export const oneInchRouter = createTRPCRouter({
  calculateMoveCosts: publicProcedure
    .input(z.object({
      fromProtocol: z.string(),
      fromChain: z.string(),
      fromAsset: z.string(),
      toProtocol: z.string(),
      toChain: z.string(),
      toAsset: z.string(),
      amount: z.string(),
      userAddress: z.string(),
    }))
    .mutation(async ({ input }) => {
      const costs = await oneInchCalculator.calculateMoveCosts(
        input.fromProtocol,
        input.fromChain,
        input.fromAsset,
        input.toProtocol,
        input.toChain,
        input.toAsset,
        input.amount,
        input.userAddress
      );
      
      return costs;
    }),

  getGasPrices: publicProcedure
    .input(z.object({
      chainId: z.number(),
    }))
    .query(async ({ input }) => {
      const gasPrices = await oneInchCalculator.getGasPrices(input.chainId);
      return gasPrices;
    }),

  getSwapQuote: publicProcedure
    .input(z.object({
      fromChain: z.string(),
      toChain: z.string(),
      fromAsset: z.string(),
      toAsset: z.string(),
      amount: z.string(),
      userAddress: z.string(),
    }))
    .query(async ({ input }) => {
      const quote = await oneInchCalculator.getSwapQuote(
        input.fromChain,
        input.toChain,
        input.fromAsset,
        input.toAsset,
        input.amount,
        input.userAddress
      );
      
      return quote;
    }),
});