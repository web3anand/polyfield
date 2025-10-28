import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Zap, Clock, Code, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useToast } from "@/hooks/use-toast";

interface EdgeAlert {
  id: string;
  title: string;
  outcome: string;
  ev: number;
  marketPrice: number;
  trueProb: number;
  liquidity: number;
  timestamp: number;
  status: "active" | "converted" | "missed";
}

interface ScannerMetrics {
  alertsThisMonth: number;
  avgEV: number;
  hitRate: number;
  conversion: number;
  avgLatency: string;
  activeScans: number;
}

export default function MicroEdgeScanner() {
  const [edgeAlerts, setEdgeAlerts] = useState<EdgeAlert[]>([]);
  const [scannerStats, setScannerStats] = useState<ScannerMetrics>({
    alertsThisMonth: 0,
    avgEV: 0,
    hitRate: 0,
    conversion: 0,
    avgLatency: "0s",
    activeScans: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const { toast } = useToast();

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/scanner/alerts?limit=20');
      if (response.ok) {
        const data = await response.json();
        setEdgeAlerts(data.map((alert: any) => ({
          id: alert.id,
          title: alert.title,
          outcome: alert.outcome,
          ev: alert.ev,
          marketPrice: alert.marketPrice,
          trueProb: alert.trueProb,
          liquidity: alert.liquidity,
          timestamp: alert.timestamp,
          status: alert.status
        })));
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/scanner/metrics');
      if (response.ok) {
        const data = await response.json();
        setScannerStats(data);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runBacktest = async () => {
    setIsBacktesting(true);
    try {
      const response = await fetch('/api/scanner/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Backtest Complete",
          description: `Hit Rate: ${result.hitRate}% (${result.hits}/${result.total})`,
        });
        loadMetrics(); // Refresh metrics
      } else {
        toast({
          title: "Backtest Failed",
          description: "Could not complete backtest",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Backtest error:', error);
      toast({
        title: "Error",
        description: "Backtest failed to run",
        variant: "destructive"
      });
    } finally {
      setIsBacktesting(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    loadMetrics();
    
    // Poll for updates every minute
    const interval = setInterval(() => {
      loadAlerts();
      loadMetrics();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge variant="outline" className="border-chart-2 text-chart-2 bg-chart-2/10">ACTIVE</Badge>;
      case "converted": return <Badge variant="outline" className="border-primary text-primary bg-primary/10">CONVERTED</Badge>;
      case "missed": return <Badge variant="outline" className="border-muted-foreground/50">MISSED</Badge>;
      default: return <Badge variant="outline">UNKNOWN</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar />
      
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-foreground tracking-tight">
                MICRO EDGE SCANNER
              </h1>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mt-1">
                Real-time Arbitrage Detection • EV 3%+ Opportunities • Automated Scanning
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Scanner Status & Controls */}
        <Card className="p-6 hover-elevate border-primary/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Zap className="w-6 h-6 text-primary animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Scanner Status: LIVE</p>
                <p className="text-xs text-muted-foreground">Polling every minute • Web-only alerts (no Telegram)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { loadAlerts(); loadMetrics(); }}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={runBacktest}
                disabled={isBacktesting}
              >
                <Code className={`w-4 h-4 mr-2 ${isBacktesting ? 'animate-spin' : ''}`} />
                {isBacktesting ? 'Running...' : 'Run Backtest'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="p-4 hover-elevate">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Alerts/Month</p>
            <p className="text-2xl font-bold text-primary tabular-nums">{scannerStats.alertsThisMonth}</p>
          </Card>
          <Card className="p-4 hover-elevate">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Avg EV</p>
            <p className="text-2xl font-bold text-chart-2 tabular-nums">{scannerStats.avgEV.toFixed(1)}%</p>
          </Card>
          <Card className="p-4 hover-elevate">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Hit Rate</p>
            <p className="text-2xl font-bold text-chart-2 tabular-nums">{scannerStats.hitRate.toFixed(1)}%</p>
          </Card>
          <Card className="p-4 hover-elevate">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Conversion</p>
            <p className="text-2xl font-bold text-chart-1 tabular-nums">{scannerStats.conversion.toFixed(1)}%</p>
          </Card>
          <Card className="p-4 hover-elevate">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Avg Latency</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{scannerStats.avgLatency}</p>
          </Card>
          <Card className="p-4 hover-elevate">
            <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Active Scans</p>
            <p className="text-2xl font-bold text-primary tabular-nums">{scannerStats.activeScans}</p>
          </Card>
        </div>

        {/* Recent Edge Alerts */}
        <Card className="p-6 hover-elevate">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Recent Edge Alerts</h2>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
                EV 3-5% • Crypto Markets • 15min Expiry
              </p>
            </div>
            <Zap className="w-6 h-6 text-chart-2 animate-pulse" />
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Loading alerts...</p>
            </div>
          ) : edgeAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No alerts yet</p>
              <p className="text-sm">Scanner is running. Alerts will appear when EV opportunities are detected.</p>
              <p className="text-xs mt-2">Make sure the scanner is running: <code className="bg-muted px-2 py-1 rounded">npm run scanner</code></p>
            </div>
          ) : (
            <div className="space-y-4">
              {edgeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <p className="font-medium text-foreground mb-2">{alert.title}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(alert.timestamp)}
                        </span>
                        <span>Liq: ${alert.liquidity.toLocaleString()}</span>
                      </div>
                    </div>
                    {getStatusBadge(alert.status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Outcome</p>
                      <Badge 
                        variant="outline"
                        className="outcome-badge-dotted"
                        data-outcome={alert.outcome}
                      >
                        {alert.outcome}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Expected Value</p>
                      <p className="text-sm font-bold text-chart-2">
                        +{(alert.ev || 0).toFixed(1)}%
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Market Price</p>
                      <p className="text-sm font-mono text-foreground">{(alert.marketPrice || 0).toFixed(2)}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">True Prob</p>
                      <p className="text-sm font-mono text-foreground">{(alert.trueProb || 0).toFixed(2)}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Edge</p>
                      <p className="text-sm font-semibold text-primary">
                        +{(((alert.trueProb || 0) - (alert.marketPrice || 0)) * 100).toFixed(1)}¢
                      </p>
                    </div>
                  </div>

                  {alert.status === "active" && (
                    <div className="mt-3 p-2 bg-chart-2/10 border border-chart-2/50 rounded text-xs text-chart-2 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3" />
                      <span className="font-semibold">
                        Alert: {alert.outcome} EV +{(alert.ev || 0).toFixed(1)}% @{(alert.marketPrice || 0).toFixed(2)} (true {(alert.trueProb || 0).toFixed(2)})
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
