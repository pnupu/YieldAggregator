import { YieldCalculator } from "../_components/yield-calculator";

export default function CalculatorPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <div className="container mx-auto px-4 py-8">
        <YieldCalculator />
      </div>
    </main>
  );
}