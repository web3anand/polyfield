import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { TrendingUp, Target, Trophy, Clock, Copy, Check } from "lucide-react";
import type { DashboardData } from "@shared/schema";
import { StatCard } from "@/components/stat-card";
import { PnLChart } from "@/components/pnl-chart";
import { PositionsTable } from "@/components/positions-table";
import { RecentActivity } from "@/components/recent-activity";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { UsernameInput } from "@/components/username-input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";

export default function Dashboard() {
  const [connectedUsername, setConnectedUsername] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const { toast } = useToast();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard/username", connectedUsername],
    enabled: !!connectedUsername,
    staleTime: 30 * 1000, // 30 seconds - refresh for live prices
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 2,
    retryDelay: 1000,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds for live updates
  });

  const handleConnect = (username: string) => {
    setConnectedUsername(username);
  };

  const handleDisconnect = () => {
    setConnectedUsername("");
  };

  const handleCopyAddress = async () => {
    if (data?.profile?.walletAddress) {
      await navigator.clipboard.writeText(data.profile.walletAddress);
      setCopiedAddress(true);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Calculate total open positions value
  const getOpenPositionsValue = () => {
    if (!data?.positions) return 0;
    return data.positions
      .filter((p: any) => p.status === "ACTIVE")
      .reduce((total: number, pos: any) => total + (pos.size * pos.currentPrice), 0);
  };

  if (!connectedUsername) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Navbar */}
        <Navbar />
        
        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-4xl space-y-12">
            {/* POLYFIELD Branding */}
            <div className="text-center space-y-8">
              <h1 className="text-6xl md:text-8xl font-black tracking-tight">
                <span className="poly-scramble text-green-400 drop-shadow-lg">POLY</span>
                <span className="field-scramble text-gray-300 ml-2">FIELD</span>
              </h1>
              
              <div className="text-center space-y-4">
                <p className="text-sm font-medium text-muted-foreground tracking-wider uppercase">
                  Real-time Tracking  •  Position Analytics
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <UsernameInput onSubmit={handleConnect} />
            </div>

            {/* Feature Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8">
              <div className="text-center space-y-2">
                <div className="text-3xl md:text-4xl font-bold text-chart-2 tabular-nums">
                  LIVE
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Real-time Data
                </div>
              </div>
              <div className="text-center space-y-2 border-l border-r border-border">
                <div className="text-3xl md:text-4xl font-bold text-primary tabular-nums">
                  100%
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Accurate PnL
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-3xl md:text-4xl font-bold text-chart-1 tabular-nums">
                  FREE
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Always Free
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="border-t border-border py-6">
          <p className="text-center text-xs text-muted-foreground">
            Track any Polymarket trader's performance  •  View positions & PnL history  •  Analyze trading patterns
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    const isTimeout = error.message?.includes('timeout') || error.message?.includes('Request timeout');
    const isUserNotFound = error.message?.includes('USER_NOT_FOUND') || error.message?.includes('User Not Found');
    
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
            <Card className="w-full max-w-lg p-6 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 mb-2">
                <Target className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {isTimeout ? 'Request Timeout' : isUserNotFound ? 'User Not Found' : 'Error Loading Dashboard'}
              </h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {isTimeout 
                  ? 'The dashboard is taking too long to load. This might be due to a large amount of data. Please try again.'
                  : isUserNotFound
                  ? 'Unable to find a Polymarket user with this username. Please check the username and try again.'
                  : 'Something went wrong while loading the dashboard. Please try again later.'
                }
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

  // Type guard to ensure data has the expected structure
  if (!data.profile || !data.stats || !data.pnlHistory || !data.positions || !data.recentTrades) {
    return null;
  }

  const { profile, stats, pnlHistory, positions, recentTrades } = data;
  const openPositionsValue = getOpenPositionsValue();

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />
      
      {/* Header with Search Bar */}
      <div className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-center items-center gap-4">
            <div className="flex-1 max-w-md">
              <UsernameInput onSubmit={handleConnect} compact />
            </div>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} data-testid="button-disconnect">
              Disconnect
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content with Upward Animation */}
      <div className="animate-in slide-in-from-bottom-8 duration-500">
        {/* Profile Section */}
        <div className="border-b border-border bg-card/50">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16" data-testid="avatar-profile">
                <AvatarImage src={profile.profileImage} alt={profile.username} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {profile.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-foreground tracking-tight" data-testid="text-username">
                  {profile.username}
                </h3>
                {profile.walletAddress && (
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm text-muted-foreground font-mono tracking-wider" data-testid="text-wallet-address">
                      {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 transition-all"
                      data-testid="button-copy-address"
                      aria-label="Copy wallet address"
                    >
                      {copiedAddress ? (
                        <Check className="w-3.5 h-3.5 text-chart-2" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            <Card className="p-6 hover-elevate">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Open Positions Value</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground tabular-nums" data-testid="text-portfolio-value">
                ${stats.openPositionsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
            <Card className="p-6 hover-elevate">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Total PnL</p>
              <p className={`text-2xl md:text-3xl font-bold tabular-nums ${stats.totalPnL >= 0 ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-total-pnl">
                {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
            <Card className="p-6 hover-elevate">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Realized PnL</p>
              <p className={`text-2xl md:text-3xl font-bold tabular-nums ${stats.realizedPnL >= 0 ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-realized-pnl">
                {stats.realizedPnL >= 0 ? '+' : ''}${stats.realizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
            <Card className="p-6 hover-elevate">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Unrealized PnL</p>
              <p className={`text-2xl md:text-3xl font-bold tabular-nums ${stats.unrealizedPnL >= 0 ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-unrealized-pnl">
                {stats.unrealizedPnL >= 0 ? '+' : ''}${stats.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                icon={<TrendingUp className="w-6 h-6" />}
                label="Best Trade"
                value={`$${(stats.bestTrade ?? 0).toFixed(2)}`}
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
          <PositionsTable positions={positions.filter((p: any) => p.status === "ACTIVE")} />

          {/* Recent Activity */}
          <RecentActivity trades={recentTrades} />
        </div>
      </div>
    </div>
  );
}
