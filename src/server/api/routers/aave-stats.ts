import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { ComprehensiveAaveDataProvider } from "@/lib/comprehensive-aave-data";

export const aaveStatsRouter = createTRPCRouter({
  getStats: publicProcedure
    .query(() => {
      return ComprehensiveAaveDataProvider.getDataStats();
    }),
});