import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Zap, TrendingUp, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Market {
  marketId: string;
  title: string;
  status: "MONITORING" | "CONSENSUS" | "DISPUTED" | "RESOLVED" | "UNCERTAIN";
  consensus: number;
  outcome: string;
  proposer: string;
  lastUpdate: number;
  alerts: string;
  liquidity: number;
  slug: string;
  ev?: number;
  llmAnalysis?: string;
  aiRecommendation?: string;
  aiConfidence?: number;
  aiTrueProb?: number;
  aiEdge?: number;
  aiRisk?: string;
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
  const [sortBy, setSortBy] = useState<string>("recent");
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
      const response = await fetch('/api/oracle/markets?limit=100');
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

  const sortMarkets = (markets: Market[]) => {
    const sorted = [...markets];
    switch (sortBy) {
      case "recent":
        return sorted.sort((a, b) => b.lastUpdate - a.lastUpdate);
      case "consensus":
        return sorted.sort((a, b) => {
          // First prioritize consensus markets
          if (a.status === "CONSENSUS" && b.status !== "CONSENSUS") return -1;
          if (a.status !== "CONSENSUS" && b.status === "CONSENSUS") return 1;
          // Then sort by consensus percentage
          return b.consensus - a.consensus;
        });
      case "liquidity":
        return sorted.sort((a, b) => (b.liquidity || 0) - (a.liquidity || 0));
      case "ev":
        return sorted.sort((a, b) => {
          const aEV = a.ev || 0;
          const bEV = b.ev || 0;
          return bEV - aEV;
        });
      case "confidence":
        return sorted.sort((a, b) => {
          const aConf = a.aiConfidence || 0;
          const bConf = b.aiConfidence || 0;
          return bConf - aConf;
        });
      case "disputed":
        return sorted.sort((a, b) => {
          if (a.status === "DISPUTED" && b.status !== "DISPUTED") return -1;
          if (a.status !== "DISPUTED" && b.status === "DISPUTED") return 1;
          return b.lastUpdate - a.lastUpdate;
        });
      default:
        return sorted.sort((a, b) => b.lastUpdate - a.lastUpdate);
    }
  };

  const sortedMarkets = sortMarkets(trackedMarkets);

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
                UMA Optimistic Oracle Monitor • 1-min Updates • AI-Powered
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bot Status */}
      <div className="border-b border-border bg-background flex-shrink-0">
        <div className="container mx-auto px-6 py-3">
          <Card className="p-4 bg-background border-primary/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Oracle Bot: LIVE</p>
                  <p className="text-xs text-muted-foreground">Scanning every 1min</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="border-primary/30 hover:bg-primary/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="p-3 bg-background border border-border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Markets Tracked</p>
                <p className="text-xl font-bold text-foreground">{botStats.marketsTracked}</p>
              </div>
              <div className="p-3 bg-background border border-primary/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Consensus</p>
                <p className="text-xl font-bold text-primary">{botStats.consensusDetected}</p>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Disputed</p>
                <p className="text-xl font-bold text-destructive">{botStats.disputed}</p>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                <p className="text-xl font-bold text-primary">{botStats.winRate}%</p>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Edge Time</p>
                <p className="text-xl font-bold text-foreground">{botStats.edgeTime}</p>
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
              <div className="flex items-center gap-3">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="ev">Highest EV</SelectItem>
                    <SelectItem value="confidence">AI Confidence</SelectItem>
                    <SelectItem value="consensus">Consensus %</SelectItem>
                    <SelectItem value="liquidity">Highest Liquidity</SelectItem>
                    <SelectItem value="disputed">Disputed First</SelectItem>
                  </SelectContent>
                </Select>
                <Activity className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            {/* Scrollable Markets List */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hidden">
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
                <div className="space-y-3">{sortedMarkets.map((market) => (
                <div
                  key={market.marketId}
                  className="p-4 bg-background border border-border/50 rounded-lg hover:border-primary/50 transition-all"
                >
                  {/* Title with Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <a 
                      href={`https://polymarket.com/event/${market.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {market.title}
                    </a>
                    <Badge className="bg-primary/10 text-primary border-primary/30 shrink-0 text-xs">
                      CONSENSUS
                    </Badge>
                  </div>

                  {/* Prediction Card */}
                  <div className="bg-muted/30 rounded-lg p-3 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Prediction</p>
                          <p className="text-lg font-bold text-primary">{market.outcome}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Consensus</p>
                        <p className="text-2xl font-bold text-primary tabular-nums">
                          {market.consensus.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <span className="text-muted-foreground">
                      💰 ${(market.liquidity / 1000).toFixed(1)}k liquidity
                    </span>
                    <a 
                      href={`https://polymarket.com/event/${market.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View Market →
                    </a>
                  </div>
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
