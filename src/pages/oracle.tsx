import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Zap, TrendingUp, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/navbar";

interface Market {
  marketId: string;
  title: string;
  status: "MONITORING" | "CONSENSUS" | "DISPUTED" | "RESOLVED";
  consensus: number;
  outcome: string;
  proposer: string;
  lastUpdate: number;
  alerts: string;
  liquidity: number;
}

interface BotStats {
  marketsTracked: number;
  totalAlerts: number;
  consensusDetected: number;
  disputed: number;
  autoBets: number;
  winRate: number;
  edgeTime: string;
}

export default function OracleBot() {
  const [trackedMarkets, setTrackedMarkets] = useState<Market[]>([]);
  const [botStats, setBotStats] = useState<BotStats>({
    marketsTracked: 0,
    totalAlerts: 0,
    consensusDetected: 0,
    disputed: 0,
    autoBets: 0,
    winRate: 100,
    edgeTime: "10s avg"
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadMarkets = async () => {
    try {
      const response = await fetch('/api/oracle/markets?limit=20');
      if (response.ok) {
        const data = await response.json();
        setTrackedMarkets(data);
      }
    } catch (error) {
      console.error('Failed to load oracle markets:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/oracle/stats');
      if (response.ok) {
        const data = await response.json();
        setBotStats(data);
      }
    } catch (error) {
      console.error('Failed to load oracle stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    loadMarkets();
    loadStats();
  };

  useEffect(() => {
    loadMarkets();
    loadStats();
    
    // Poll for updates every 15 seconds
    const interval = setInterval(() => {
      loadMarkets();
      loadStats();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "MONITORING": return <Badge variant="outline" className="border-muted-foreground/50">MONITORING</Badge>;
      case "CONSENSUS": return <Badge variant="outline" className="border-chart-2 text-chart-2 bg-chart-2/10">CONSENSUS</Badge>;
      case "DISPUTED": return <Badge variant="outline" className="border-destructive text-destructive bg-destructive/10">DISPUTED</Badge>;
      case "RESOLVED": return <Badge variant="outline" className="border-primary text-primary bg-primary/10">RESOLVED</Badge>;
      default: return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Navbar */}
      <Navbar />
      
      {/* Fixed Header */}
      <div className="border-b border-border bg-card/50 flex-shrink-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Zap className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                ORACLE BOT
              </h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                UMA Optimistic Oracle Monitor • 5-15s Edge
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bot Status */}
      <div className="border-b border-border bg-card/50 flex-shrink-0">
        <div className="container mx-auto px-6 py-3">
          <Card className="p-4 hover-elevate border-primary/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Activity className="w-5 h-5 text-primary animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Oracle Bot: LIVE</p>
                  <p className="text-xs text-muted-foreground">Polling every 10s</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Markets</p>
                <p className="text-base font-bold text-foreground">{botStats.marketsTracked}</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Alerts</p>
                <p className="text-base font-bold text-chart-2">{botStats.totalAlerts}</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Consensus</p>
                <p className="text-base font-bold text-chart-2">{botStats.consensusDetected}</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Disputed</p>
                <p className="text-base font-bold text-destructive">{botStats.disputed}</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                <p className="text-base font-bold text-primary">{botStats.winRate}%</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Edge Time</p>
                <p className="text-base font-bold text-foreground">{botStats.edgeTime}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Scrollable Markets Section */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto px-6 h-full py-4">
          <Card className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Tracked Oracle Markets</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Live Monitoring • Recent Markets Only
                </p>
              </div>
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Scrollable Markets List */}
            <div className="flex-1 overflow-y-auto pr-2">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Loading oracle data...</p>
                </div>
              ) : trackedMarkets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No oracle markets yet</p>
                  <p className="text-sm">Bot is running. Markets will appear when oracle proposals are detected.</p>
                </div>
              ) : (
                <div className="space-y-3">{trackedMarkets.map((market) => (
                <div
                  key={market.marketId}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-2">{market.title}</p>
                      <code className="text-xs text-muted-foreground font-mono">
                        {market.marketId.slice(0, 10)}...{market.marketId.slice(-8)}
                      </code>
                    </div>
                    {getStatusBadge(market.status)}
                  </div>

                  {market.status === "CONSENSUS" && market.outcome !== "N/A" && (
                    <div className="mt-3 p-3 bg-chart-2/10 border border-chart-2/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-chart-2" />
                          <span className="text-sm font-semibold text-chart-2">
                            Consensus Detected: {market.outcome}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-chart-2 tabular-nums">
                          {market.consensus.toFixed(0)}%
                        </span>
                      </div>
                      {market.proposer && market.proposer !== 'N/A' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Proposer: <code className="font-mono">{market.proposer}</code>
                        </p>
                      )}
                      {market.alerts && (
                        <p className="text-xs text-chart-2 mt-2 font-semibold">
                          🚨 {market.alerts}
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" variant="default" className="flex-1">
                          <Zap className="w-3 h-3 mr-1" />
                          Bet {market.outcome}
                        </Button>
                        <Button size="sm" variant="outline">
                          View Oracle
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    Last Update: {formatTimestamp(market.lastUpdate)} • Liquidity: ${market.liquidity.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
