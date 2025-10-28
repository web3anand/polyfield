import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Waves, TrendingUp, DollarSign, Activity } from "lucide-react";

export default function WhalesHub() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Waves className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">Whales Hub</h1>
          </div>
          <p className="text-gray-400">
            Track large-scale market movements and whale activity on Polymarket
          </p>
        </div>

        {/* Coming Soon Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-500" />
                <CardTitle className="text-white">Large Trades</CardTitle>
              </div>
              <CardDescription>Monitor trades above $10K</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center">
                <p className="text-gray-500 text-sm">Coming Soon</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-500" />
                <CardTitle className="text-white">Whale Wallets</CardTitle>
              </div>
              <CardDescription>Track top traders and their positions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center">
                <p className="text-gray-500 text-sm">Coming Soon</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <CardTitle className="text-white">Market Impact</CardTitle>
              </div>
              <CardDescription>Analyze price movements from whale trades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-8 text-center">
                <p className="text-gray-500 text-sm">Coming Soon</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <Waves className="w-6 h-6 text-blue-500 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Whale Tracking Features</h3>
              <p className="text-gray-400 text-sm">
                Advanced whale tracking features are currently in development. This page will soon include:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-gray-400">
                <li>• Real-time large trade notifications</li>
                <li>• Wallet clustering and smart money tracking</li>
                <li>• Historical whale trade analysis</li>
                <li>• Market impact correlation metrics</li>
                <li>• Whale portfolio tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
