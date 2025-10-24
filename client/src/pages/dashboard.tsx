import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Wallet, TrendingUp, Target, Flame, Trophy, Clock } from "lucide-react";
import type { DashboardData } from "@shared/schema";
import { StatCard } from "@/components/stat-card";
import { PnLChart } from "@/components/pnl-chart";
import { PositionsTable } from "@/components/positions-table";
import { RecentActivity } from "@/components/recent-activity";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { UsernameInput } from "@/components/username-input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
                POLYMARKET
              </h1>
              <p className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                Real-time Tracking  •  Position Analytics
              </p>
            </div>

            <UsernameInput onSubmit={handleConnect} />

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
            <Card className="w-full max-w-lg p-6 text-center space-y-4 hover-elevate">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-2">
                <Target className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">User Not Found</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
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

  const { profile, stats, pnlHistory, positions, recentTrades } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                POLYMARKET
              </h2>
              <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                BETA
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8" data-testid="avatar-profile">
                  <AvatarImage src={profile.profileImage} alt={profile.username} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {profile.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">
                  @{profile.username}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDisconnect} data-testid="button-disconnect">
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <Card className="p-6 hover-elevate">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Total Portfolio Value</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground tabular-nums" data-testid="text-portfolio-value">
                ${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
            <Card className="p-6 hover-elevate">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">All-Time PnL</p>
              <p className={`text-2xl md:text-3xl font-bold tabular-nums ${stats.totalPnL >= 0 ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-total-pnl">
                {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
            <Card className="p-6 hover-elevate">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Win Rate</p>
              <p className="text-2xl md:text-3xl font-bold tabular-nums text-foreground" data-testid="text-win-rate">
                {stats.winRate.toFixed(1)}%
              </p>
            </Card>
            <Card className="p-6 hover-elevate">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Total Trades</p>
              <p className="text-2xl md:text-3xl font-bold tabular-nums text-foreground" data-testid="text-total-trades">
                {stats.totalTrades.toLocaleString()}
              </p>
            </Card>
        </div>

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

        {/* Recent Activity */}
        <RecentActivity trades={recentTrades} />
      </div>
    </div>
  );
}
