import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Zap, RefreshCw, Search, AlertTriangle, Sparkles } from "lucide-react";
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
  llmAnalysis?: {
    yesProb: number;
    noProb: number;
    ev: number;
    edge: number;
    betSide: string;
    confidence: number;
    rationale: string;
    risk: string;
    sources?: string[];
    marketPrice?: number;
  };
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
  const [searchTerm, setSearchTerm] = useState<string>("");
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

  const filterMarkets = (markets: Market[]) => {
    if (!searchTerm.trim()) return markets;
    const term = searchTerm.toLowerCase();
    return markets.filter(m => 
      m.title.toLowerCase().includes(term) || 
      m.outcome.toLowerCase().includes(term)
    );
  };

  const calculateEdge = (market: Market) => {
    // Use LLM edge if available
    if (market.llmAnalysis?.edge) {
      return market.llmAnalysis.edge;
    }
    // Fallback: Edge = True Probability - Market Price
    if (market.aiTrueProb) {
      return market.aiTrueProb - market.consensus;
    }
    return 0;
  };

  const getEdgeBadge = (market: Market) => {
    const edge = calculateEdge(market);
    if (edge > 10) return { color: "bg-green-500/10 text-green-500 border-green-500/30", label: `+${edge.toFixed(0)}% EDGE` };
    if (edge < -10) return { color: "bg-red-500/10 text-red-500 border-red-500/30", label: `${edge.toFixed(0)}% FADE` };
    if (market.liquidity > 100000) return { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", label: "HIGH VOL" };
    return null;
  };

  const filteredMarkets = filterMarkets(trackedMarkets);
  const sortedMarkets = sortMarkets(filteredMarkets);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Navbar */}
      <Navbar />
      
      {/* Fixed Header */}
      <div className="border-b border-border bg-card/50 flex-shrink-0">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                ORACLE BOT
              </h1>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mt-1">
                UMA Optimistic Oracle Monitor • 1-min Updates • AI-Powered
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bot Status */}
      <div className="border-b border-border bg-background flex-shrink-0">
        <div className="container mx-auto px-6 py-4">
          <Card className="p-6 border-primary/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Zap className="w-6 h-6 text-primary animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Scanner Status: LIVE</p>
                  <p className="text-xs text-muted-foreground">Polling every minute • Web-only alerts (no Telegram)</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="focus-visible:ring-0 focus-visible:ring-offset-0"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Total Markets</p>
                <p className="text-2xl font-bold text-primary tabular-nums">{botStats.marketsTracked}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Consensus</p>
                <p className="text-2xl font-bold text-chart-2 tabular-nums">{botStats.consensusDetected}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Disputed</p>
                <p className="text-2xl font-bold text-destructive tabular-nums">{botStats.disputed}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Win Rate</p>
                <p className="text-2xl font-bold text-chart-2 tabular-nums">{botStats.winRate.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Avg Latency</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{botStats.edgeTime}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Scrollable Markets Section */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto px-6 h-full py-8">
          <Card className="h-full flex flex-col p-6">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Oracle Market Insights</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                  AI-Powered Analysis • Real-time Signals • High-Confidence Bets
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search (e.g. 'Trump')..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[200px] bg-background focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[200px] focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="liquidity">Highest Liquidity</SelectItem>
                    <SelectItem value="consensus">Consensus %</SelectItem>
                    <SelectItem value="ev">Highest EV</SelectItem>
                    <SelectItem value="confidence">AI Confidence</SelectItem>
                    <SelectItem value="disputed">Disputed First</SelectItem>
                  </SelectContent>
                </Select>
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
                <div className="space-y-4">{sortedMarkets.map((market) => (
                <div
                  key={market.marketId}
                  className="p-4 border border-border hover:bg-muted/50 transition-colors"
                >
                  {/* Title with Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <a 
                      href={`https://polymarket.com/event/${market.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 font-medium text-foreground hover:text-primary transition-colors focus:outline-none"
                    >
                      {market.title}
                    </a>
                    <div className="flex gap-2 shrink-0">
                      {market.status === "CONSENSUS" && (
                        <Badge variant="outline" className="border-chart-2 text-chart-2 bg-chart-2/10 uppercase tracking-wide">
                          CONSENSUS
                        </Badge>
                      )}
                      {(() => {
                        const edgeBadge = getEdgeBadge(market);
                        if (edgeBadge) {
                          return (
                            <Badge variant="outline" className={`${edgeBadge.color} font-bold uppercase tracking-wide`}>
                              {edgeBadge.label}
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                      {market.status === "DISPUTED" && (
                        <Badge variant="outline" className="border-red-500 text-red-500 bg-red-500/10 uppercase tracking-wide">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          DISPUTE
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Simplified Market Data */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Prediction</p>
                      <Badge 
                        variant="outline"
                        className="outcome-badge-dotted"
                        data-outcome={market.outcome}
                      >
                        {market.outcome}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Consensus</p>
                      <p className="text-sm font-bold text-primary tabular-nums">
                        {market.consensus.toFixed(0)}%
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Liquidity</p>
                      <p className="text-sm font-mono text-foreground tabular-nums">${(market.liquidity / 1000).toFixed(1)}k</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Signal</p>
                      <p className="text-sm font-semibold text-chart-2 tabular-nums">
                        {market.status === "CONSENSUS" ? "STRONG" : market.status === "DISPUTED" ? "WEAK" : "NEUTRAL"}
                      </p>
                    </div>
                  </div>

                  {/* AI Analysis Alert */}
                  {market.llmAnalysis && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30">
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">AI Analysis</span>
                            <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10 text-xs">
                              {(market.llmAnalysis.confidence * 100).toFixed(0)}% Confidence
                            </Badge>
                            <Badge variant="outline" className={`text-xs font-bold ${
                              market.llmAnalysis.edge > 10 ? 'border-green-500/30 text-green-400 bg-green-500/10' : 
                              market.llmAnalysis.edge > 5 ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                              'border-muted-foreground/30 text-muted-foreground bg-muted/10'
                            }`}>
                              {market.llmAnalysis.edge > 0 ? '+' : ''}{market.llmAnalysis.edge.toFixed(1)}% Edge
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-foreground leading-relaxed">
                            <span className="font-semibold text-chart-2">Recommendation:</span> Bet {market.llmAnalysis.betSide} at {market.llmAnalysis.marketPrice ? (market.llmAnalysis.marketPrice * 100).toFixed(0) : market.consensus.toFixed(0)}¢ • 
                            True probability: {market.llmAnalysis.betSide === 'YES' ? (market.llmAnalysis.yesProb * 100).toFixed(0) : (market.llmAnalysis.noProb * 100).toFixed(0)}% • 
                            Risk: <span className={`font-semibold ${
                              market.llmAnalysis.risk === 'LOW' ? 'text-green-400' : 
                              market.llmAnalysis.risk === 'MEDIUM' ? 'text-yellow-400' : 'text-red-400'
                            }`}>{market.llmAnalysis.risk}</span>
                          </p>
                          
                          <p className="text-xs text-muted-foreground">
                            {market.llmAnalysis.rationale}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-3 text-xs">
                    <a 
                      href={`https://polymarket.com/event/${market.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-medium"
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
