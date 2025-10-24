import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, Target, Flame, Trophy, Clock } from "lucide-react";
import type { DashboardData } from "@shared/schema";
import { StatCard } from "@/components/stat-card";
import { AchievementBanner } from "@/components/achievement-banner";
import { PnLChart } from "@/components/pnl-chart";
import { PositionsTable } from "@/components/positions-table";
import { VolumeMetrics } from "@/components/volume-metrics";
import { RecentActivity } from "@/components/recent-activity";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { UsernameInput } from "@/components/username-input";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [connectedUsername, setConnectedUsername] = useState("");

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/username", connectedUsername],
    enabled: !!connectedUsername,
  });

  const handleConnect = (username: string) => {
    setConnectedUsername(username);
  };

  const handleDisconnect = () => {
    setConnectedUsername("");
  };

  if (!connectedUsername) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-4">
                <Wallet className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-gaming text-foreground">
                Polymarket Dashboard
              </h1>
              <p className="text-lg text-muted-foreground max-w-md">
                Enter your Polymarket username to view your trading stats, PnL graphs, and achievements
              </p>
            </div>

            <UsernameInput onSubmit={handleConnect} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-12">
              <div className="text-center space-y-2">
                <TrendingUp className="w-8 h-8 text-primary mx-auto" />
                <h3 className="font-semibold text-foreground">Track PnL</h3>
                <p className="text-sm text-muted-foreground">
                  Visualize your profit & loss over time
                </p>
              </div>
              <div className="text-center space-y-2">
                <Trophy className="w-8 h-8 text-primary mx-auto" />
                <h3 className="font-semibold text-foreground">Earn Achievements</h3>
                <p className="text-sm text-muted-foreground">
                  Unlock badges as you trade
                </p>
              </div>
              <div className="text-center space-y-2">
                <Target className="w-8 h-8 text-primary mx-auto" />
                <h3 className="font-semibold text-foreground">Monitor Positions</h3>
                <p className="text-sm text-muted-foreground">
                  Track active and historical positions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
            <Card className="w-full max-w-lg p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-2">
                <Target className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">User Not Found</h2>
              <p className="text-muted-foreground">
                Unable to find a Polymarket user with this username. Please check the username and try again.
              </p>
              <Button onClick={handleDisconnect} variant="outline" data-testid="button-disconnect">
                Try Different Username
              </Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton username={connectedUsername} onDisconnect={handleDisconnect} />;
  }

  if (!data) {
    return null;
  }

  const { stats, pnlHistory, positions, recentTrades, achievements } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Dashboard
            </h1>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-xs text-muted-foreground">Viewing Profile</p>
                <p className="text-sm font-medium text-foreground">
                  @{connectedUsername}
                </p>
              </div>
              <Button
                data-testid="button-disconnect-header"
                onClick={handleDisconnect}
                variant="outline"
                size="sm"
              >
                Disconnect
              </Button>
            </div>
          </div>

          <Card className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <p className="text-sm text-muted-foreground mb-2">Total Portfolio Value</p>
                <p className="text-4xl md:text-5xl font-bold font-gaming text-foreground tabular-nums" data-testid="text-portfolio-value">
                  ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">All-Time PnL</p>
                <p className={`text-2xl md:text-3xl font-bold font-gaming tabular-nums ${stats.totalPnL >= 0 ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-total-pnl">
                  {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Win Rate</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl md:text-3xl font-bold font-gaming tabular-nums text-foreground" data-testid="text-win-rate">
                    {stats.winRate.toFixed(1)}%
                  </p>
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Total Trades</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl md:text-3xl font-bold font-gaming tabular-nums text-foreground" data-testid="text-total-trades">
                    {stats.totalTrades.toLocaleString()}
                  </p>
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Achievement Banner */}
        <AchievementBanner achievements={achievements} />

        {/* PnL Chart + Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PnLChart data={pnlHistory} />
          </div>
          <div className="space-y-4">
            <StatCard
              icon={<Flame className="w-6 h-6" />}
              label="Win Streak"
              value={stats.winStreak}
              suffix="wins"
              color="text-chart-3"
            />
            <StatCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Best Trade"
              value={`$${stats.bestTrade.toFixed(2)}`}
              color="text-chart-2"
            />
            <StatCard
              icon={<Trophy className="w-6 h-6" />}
              label="Active Positions"
              value={stats.activePositions}
              color="text-primary"
            />
            <StatCard
              icon={<Clock className="w-6 h-6" />}
              label="Trading Volume"
              value={`$${(stats.totalVolume / 1000).toFixed(1)}K`}
              color="text-chart-1"
            />
          </div>
        </div>

        {/* Active Positions */}
        <PositionsTable positions={positions.filter(p => p.status === "ACTIVE")} />

        {/* Volume + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VolumeMetrics totalVolume={stats.totalVolume} trades={recentTrades} />
          <RecentActivity trades={recentTrades} />
        </div>
      </div>
    </div>
  );
}
