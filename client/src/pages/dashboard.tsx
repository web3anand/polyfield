import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Target, Trophy, Copy, Check, RefreshCw } from "lucide-react";
import type { DashboardData } from "@shared/schema";
import { StatCard, AnimatedIcons } from "@/components/stat-card";
import { PnLChart } from "@/components/pnl-chart";
import { PositionsTable } from "@/components/positions-table";
import { RecentActivity } from "@/components/recent-activity";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { UsernameInput } from "@/components/username-input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ShinyText } from "@/components/shiny-text";

export default function Dashboard() {
  const [connectedUsername, setConnectedUsername] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (connectedUsername) {
      queryClient.invalidateQueries({ queryKey: ["dashboard", connectedUsername] });
    }
  }, [connectedUsername, queryClient]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery<DashboardData>({
    queryKey: ["dashboard", connectedUsername, refreshKey],
    enabled: !!connectedUsername,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    retryDelay: 2000,
    refetchInterval: (query) => {
      if (query.state.error || !query.state.data) {
        return false;
      }
      return 30 * 1000;
    },
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/username?username=${encodeURIComponent(connectedUsername)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch dashboard data' }));
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }
      const jsonData = await res.json();
      if (!jsonData || !jsonData.profile) {
        throw new Error('Invalid response data');
      }
      return jsonData;
    },
  });

  const handleConnect = (username: string) => {
    setConnectedUsername(username);
    setRefreshKey(prev => prev + 1);
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const handleDisconnect = () => {
    setConnectedUsername("");
    setRefreshKey(0);
    queryClient.removeQueries({ queryKey: ["dashboard"] });
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
    toast({
      title: "Refreshing",
      description: "Fetching latest data...",
    });
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

  if (!connectedUsername) {
    return (
      <div className="min-h-screen bg-background flex flex-col pt-[clamp(48px,40px+2vw,64px)]">
        {/* Hero Section */}
        <div className="flex-1 flex items-center justify-center px-fluid-sm py-fluid-lg">
          <div className="w-full max-w-4xl space-y-8 sm:space-y-10 md:space-y-12">
            {/* POLYFIELD Branding */}
            <div className="text-center space-y-4 sm:space-y-6 md:space-y-8">
              <h1 className="text-fluid-7xl sm:text-fluid-8xl font-black tracking-tight">
                <ShinyText className="poly-scramble text-green-400 drop-shadow-lg">POLY</ShinyText>
                <ShinyText className="field-scramble text-gray-300 ml-1 sm:ml-2">FIELD</ShinyText>
              </h1>
              
              <div className="text-center space-y-2 sm:space-y-3 md:space-y-4">
                <p className="text-fluid-xs sm:text-fluid-sm font-medium text-muted-foreground tracking-wider uppercase">
                  Real-time Tracking  •  Position Analytics
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <UsernameInput onSubmit={handleConnect} />
            </div>

            {/* Feature Stats */}
            <div className="grid grid-cols-3 gap-fluid-sm sm:gap-fluid-md max-w-2xl mx-auto pt-4 sm:pt-6 md:pt-8">
              <div className="text-center space-y-1 sm:space-y-2">
                <div className="text-fluid-3xl sm:text-fluid-4xl lg:text-fluid-5xl font-bold text-chart-2 tabular-nums">
                  LIVE
                </div>
                <div className="text-fluid-xs text-muted-foreground uppercase tracking-wide">
                  Real-time Data
                </div>
              </div>
              <div className="text-center space-y-1 sm:space-y-2 border-l border-r border-border">
                <div className="text-fluid-3xl sm:text-fluid-4xl lg:text-fluid-5xl font-bold text-primary tabular-nums">
                  100%
                </div>
                <div className="text-fluid-xs text-muted-foreground uppercase tracking-wide">
                  Accurate PnL
                </div>
              </div>
              <div className="text-center space-y-1 sm:space-y-2">
                <div className="text-fluid-3xl sm:text-fluid-4xl lg:text-fluid-5xl font-bold text-chart-1 tabular-nums">
                  FREE
                </div>
                <div className="text-fluid-xs text-muted-foreground uppercase tracking-wide">
                  Always Free
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="border-t border-border footer-fluid">
          <p className="text-center footer-text-fluid text-muted-foreground px-2">
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
      <div className="min-h-screen bg-background pt-[clamp(48px,40px+2vw,64px)]">
        <div className="container mx-auto px-fluid-sm py-fluid-lg">
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4 sm:space-y-6">
            <Card className="w-full max-w-lg p-fluid-card text-center space-y-3 sm:space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-destructive/10 mb-2">
                <Target className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-destructive" />
              </div>
              <h2 className="text-fluid-lg sm:text-fluid-xl font-semibold text-foreground">
                {isTimeout ? 'Request Timeout' : isUserNotFound ? 'User Not Found' : 'Error Loading Dashboard'}
              </h2>
              <p className="text-fluid-xs text-muted-foreground uppercase tracking-wide px-2">
                {isTimeout 
                  ? 'The dashboard is taking too long to load. This might be due to a large amount of data. Please try again.'
                  : isUserNotFound
                  ? 'Unable to find a Polymarket user with this username. Please check the username and try again.'
                  : 'Something went wrong while loading the dashboard. Please try again later.'
                }
              </p>
              <Button onClick={handleDisconnect} variant="outline" data-testid="button-disconnect" className="text-fluid-xs sm:text-fluid-sm">
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

  if (!data.profile || !data.stats || !data.pnlHistory || !data.positions || !data.recentTrades) {
    return null;
  }

  const { profile, stats, pnlHistory, positions, recentTrades } = data;

  return (
    <div className="min-h-screen bg-background pt-[clamp(48px,40px+2vw,64px)]">
      {/* Header with Search Bar */}
      <div className="border-b border-border sticky top-[clamp(48px,40px+2vw,64px)] bg-background/95 backdrop-blur-sm z-40">
        <div className="container mx-auto px-fluid-sm py-2 sm:py-3 md:py-4">
          <div className="flex justify-center items-center gap-2 sm:gap-3 md:gap-4">
            <div className="flex-1 max-w-md">
              <UsernameInput onSubmit={handleConnect} compact />
            </div>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} data-testid="button-disconnect" className="h-8 sm:h-9 md:h-10 min-h-8 text-fluid-xs sm:text-fluid-sm px-2 sm:px-3">
              Disconnect
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard Content with Upward Animation */}
      <div className="animate-in slide-in-from-bottom-8 duration-500">
        {/* Profile Section */}
        <div className="border-b border-border bg-card/50">
          <div className="container mx-auto px-fluid-sm py-3 sm:py-4 md:py-6">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-none transition-responsive" data-testid="avatar-profile">
                <AvatarImage src={profile.profileImage} alt={profile.username} />
                <AvatarFallback className="bg-primary/10 text-primary text-fluid-sm sm:text-fluid-base md:text-fluid-lg font-semibold rounded-none">
                  {profile.username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-fluid-lg sm:text-fluid-xl md:text-fluid-2xl font-black text-foreground tracking-tight truncate" data-testid="text-username">
                  {profile.username}
                </h3>
                <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-1.5 md:mt-2 flex-wrap">
                  {profile.xUsername && (
                    <a 
                      href={`https://x.com/${profile.xUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-fluid-xs sm:text-fluid-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 sm:gap-1.5 group"
                    >
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-[#1DA1F2] group-hover:text-[#1a8cd8] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      <span className="font-medium">@{profile.xUsername}</span>
                    </a>
                  )}
                  {profile.rank && (
                    <div className="flex items-center gap-1 sm:gap-1.5 text-fluid-xs sm:text-fluid-sm">
                      <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-chart-2" />
                      <span className="text-muted-foreground font-medium">Rank</span>
                      <span className="font-bold text-chart-2">#{profile.rank}</span>
                    </div>
                  )}
                  {profile.walletAddress && (
                    <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                      <code className="text-fluid-xs sm:text-fluid-sm text-muted-foreground font-mono tracking-wider" data-testid="text-wallet-address">
                        {profile.walletAddress.slice(0, 6)}...{profile.walletAddress.slice(-4)}
                      </code>
                      <button
                        onClick={handleCopyAddress}
                        className="p-0.5 sm:p-1 transition-all"
                        data-testid="button-copy-address"
                        aria-label="Copy wallet address"
                      >
                        {copiedAddress ? (
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-chart-2" />
                        ) : (
                          <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={handleRefresh}
                    disabled={isRefetching}
                    className="p-0.5 sm:p-1 transition-all disabled:opacity-50"
                    data-testid="button-refresh"
                    aria-label="Refresh data"
                    title="Refresh dashboard data"
                  >
                    <RefreshCw className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground ${isRefetching ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-fluid-sm py-fluid-md space-y-4 sm:space-y-6 md:space-y-8">
          {/* Key Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <Card className="p-fluid-card border-2 border-primary/30">
              <p className="text-fluid-xs font-medium text-muted-foreground mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">Open Positions Value</p>
              <p className="text-fluid-xl sm:text-fluid-2xl lg:text-fluid-3xl font-bold text-foreground tabular-nums" data-testid="text-portfolio-value">
                ${stats.openPositionsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
            <Card className="p-fluid-card border-2 border-primary/30">
              <p className="text-fluid-xs font-medium text-muted-foreground mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">Total PnL</p>
              <p className={`text-fluid-xl sm:text-fluid-2xl lg:text-fluid-3xl font-bold tabular-nums ${stats.totalPnL >= 0 ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-total-pnl">
                {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
            <Card className="p-fluid-card border-2 border-primary/30">
              <p className="text-fluid-xs font-medium text-muted-foreground mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">Realized PnL</p>
              <p className={`text-fluid-xl sm:text-fluid-2xl lg:text-fluid-3xl font-bold tabular-nums ${stats.realizedPnL >= 0 ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-realized-pnl">
                {stats.realizedPnL >= 0 ? '+' : ''}${stats.realizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
            <Card className="p-fluid-card border-2 border-primary/30">
              <p className="text-fluid-xs font-medium text-muted-foreground mb-1 sm:mb-1.5 md:mb-2 uppercase tracking-wide">Unrealized PnL</p>
              <p className={`text-fluid-xl sm:text-fluid-2xl lg:text-fluid-3xl font-bold tabular-nums ${stats.unrealizedPnL >= 0 ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-unrealized-pnl">
                {stats.unrealizedPnL >= 0 ? '+' : ''}${stats.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
          </div>

          {/* PnL Chart + Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            <div className="lg:col-span-2 h-[400px] sm:h-[480px] md:h-[560px]">
              <PnLChart data={pnlHistory} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2 sm:gap-3 lg:h-[560px]">
              <StatCard
                icon={<AnimatedIcons.TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />}
                label="Best Trade"
                value={`$${(stats.bestTrade ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color="text-emerald-500"
              />
              <StatCard
                icon={<AnimatedIcons.TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />}
                label="Worst Trade"
                value={`$${(stats.worstTrade ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                color="text-rose-500"
              />
              <StatCard
                icon={<AnimatedIcons.Activity className="w-4 h-4 sm:w-5 sm:h-5" />}
                label="Active Positions"
                value={stats.activePositions.toLocaleString()}
                color="text-violet-500"
              />
              <StatCard
                icon={<AnimatedIcons.DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />}
                label="Trading Volume"
                value={(() => {
                  const vol = stats.totalVolume || 0;
                  if (vol >= 1000000) {
                    return `$${(vol / 1000000).toFixed(2)}M`;
                  } else if (vol >= 1000) {
                    return `$${(vol / 1000).toFixed(1)}K`;
                  } else {
                    return `$${vol.toFixed(2)}`;
                  }
                })()}
                color="text-cyan-500"
              />
              <StatCard
                icon={<AnimatedIcons.Percent className="w-4 h-4 sm:w-5 sm:h-5" />}
                label="Win Rate"
                value={`${(stats.winRate ?? 0).toFixed(1)}%`}
                color="text-amber-500"
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