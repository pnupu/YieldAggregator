import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { YieldProviderManager } from "@/lib/yield-providers";

const yieldProviderManager = new YieldProviderManager();

export const yieldRouter = createTRPCRouter({
  // Get all yield opportunities
  getOpportunities: publicProcedure
    .input(
      z.object({
        asset: z.enum(["USDC", "USDT", "DAI"]).optional(),
        chain: z.enum(["ethereum", "polygon"]).optional(),
        protocol: z.enum(["aave", "compound", "curve"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const opportunities = await yieldProviderManager.getAllYields();
        
        // Filter based on input
        let filtered = opportunities;
        if (input.asset) {
          filtered = filtered.filter((opp: { asset: string }) => opp.asset === input.asset);
        }
        if (input.chain) {
          filtered = filtered.filter((opp: { chain: string }) => opp.chain === input.chain);
        }
        if (input.protocol) {
          filtered = filtered.filter((opp: { protocol: string }) => opp.protocol === input.protocol);
        }
        
        return filtered;
      } catch (error) {
        console.error("Error fetching yield opportunities:", error);
        throw new Error("Failed to fetch yield opportunities");
      }
    }),

  // Get user positions (temporarily public until auth is implemented)
  getPositions: publicProcedure
    .query(async ({ ctx }) => {
      // TODO: Add authentication
      return await ctx.db.position.findMany({
        orderBy: { updatedAt: "desc" },
      });
    }),

  // Get best yield opportunity for a specific asset
  getBestOpportunity: publicProcedure
    .input(
      z.object({
        asset: z.enum(["USDC", "USDT", "DAI"]),
        chain: z.enum(["ethereum", "polygon"]).optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const opportunities = await yieldProviderManager.getAllYields();
        
        let filtered = opportunities.filter((opp: { asset: string }) => opp.asset === input.asset);
        if (input.chain) {
          filtered = filtered.filter((opp: { chain: string }) => opp.chain === input.chain);
        }
        
        if (filtered.length === 0) {
          return null;
        }
        
        // Return the opportunity with highest APY
        return filtered.reduce((best, current) => 
          current.currentAPY > best.currentAPY ? current : best
        );
      } catch (error) {
        console.error("Error finding best opportunity:", error);
        throw new Error("Failed to find best opportunity");
      }
    }),

  // Get yield statistics
  getStats: publicProcedure.query(async () => {
    try {
      const opportunities = await yieldProviderManager.getAllYields();
      
      const bestAPY = Math.max(...opportunities.map((opp: { currentAPY: number }) => opp.currentAPY));
      const totalTVL = opportunities.reduce((sum: bigint, opp: { tvl: string | number | bigint }) => sum + BigInt(opp.tvl), 0n);
      const uniqueChains = new Set(opportunities.map((opp: { chain: string }) => opp.chain)).size;
      
      return {
        bestAPY,
        totalOpportunities: opportunities.length,
        uniqueChains,
        totalTVL: totalTVL.toString(),
      };
    } catch (error) {
      console.error("Error fetching yield stats:", error);
      throw new Error("Failed to fetch yield statistics");
    }
  }),

  // Refresh yield data (temporarily public until auth is implemented)
  refreshData: publicProcedure
    .mutation(async () => {
      // TODO: Add admin authentication
      try {
        // For now, just return success since refreshAllData doesn't exist
        return { success: true, message: "Yield data refresh not implemented yet" };
      } catch (error) {
        console.error("Error refreshing yield data:", error);
        throw new Error("Failed to refresh yield data");
      }
    }),
}); 