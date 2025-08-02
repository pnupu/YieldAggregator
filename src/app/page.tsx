import { YieldDashboard } from "@/app/_components/yield-dashboard";
import { HydrateClient } from "@/trpc/server";

export default async function Home() {
  return (
    <HydrateClient>
      <main className="min-h-screen bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] text-white">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-12 text-center">
            <h1 className="text-6xl font-bold tracking-tight sm:text-7xl">
              AI <span className="text-[hsl(280,100%,70%)]">Yield</span> Agent
            </h1>
            <p className="mt-4 text-xl text-gray-300">
              Autonomous Cross-Chain Yield Farming Optimizer
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Powered by 1inch Fusion+ • Ethereum & Polygon
            </p>
          </header>

          <YieldDashboard />
        </div>
      </main>
    </HydrateClient>
  );
}
