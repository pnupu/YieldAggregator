import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  // Simple health check endpoint
  health: publicProcedure.query(async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }),
});
