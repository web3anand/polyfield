import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Trade } from "@shared/schema";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface RecentActivityProps {
  trades: Trade[];
}

export function RecentActivity({ trades }: RecentActivityProps) {
  const recentTrades = trades.slice(0, 10);

  return (
    <Card className="p-6 hover-elevate">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Your latest trades and positions</p>
      </div>

      <ScrollArea className="h-[400px] pr-4 scrollbar-hidden" data-testid="activity-feed">
        <div className="space-y-2">
          {recentTrades.map((trade, index) => {
            const isBuy = trade.type === "BUY";
            const hasProfit = trade.profit !== undefined;
            
            return (
              <div
                key={trade.id}
                className="flex items-start gap-2 p-2 rounded-lg border border-border hover-elevate transition-all duration-300"
                data-testid={`trade-${index}`}
              >
                <div className={`p-1.5 rounded-lg ${isBuy ? 'bg-chart-2/10 text-chart-2' : 'bg-chart-1/10 text-chart-1'}`}>
                  {isBuy ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground text-sm truncate">
                      {trade.marketName}
                    </p>
                    <Badge 
                      variant="outline"
                      className="flex-shrink-0"
                    >
                      {trade.outcome}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                    <div className="flex items-center gap-2">
                      <span className={isBuy ? 'text-chart-2' : 'text-chart-1'}>
                        {trade.type}
                      </span>
                      <span className="font-mono">
                        {trade.size} @ ${trade.price.toFixed(3)}
                      </span>
                    </div>
                    {hasProfit && (
                      <span className={`font-mono font-semibold ${trade.profit! >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                        {trade.profit! >= 0 ? '+' : ''}${trade.profit!.toFixed(2)}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(trade.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
