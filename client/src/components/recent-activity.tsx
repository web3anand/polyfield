import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Trade } from "@shared/schema";

interface RecentActivityProps {
  trades: Trade[];
}

export function RecentActivity({ trades }: RecentActivityProps) {
  const recentTrades = trades.slice(0, 10);

  return (
    <Card className="p-3 md:p-6 hover-elevate">
      <div className="mb-3 md:mb-4">
        <h2 className="text-base md:text-xl font-semibold text-foreground">Recent Activity</h2>
        <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">
          Your latest trades and positions
        </p>
      </div>

      <ScrollArea className="h-[300px] md:h-[400px] pr-2 md:pr-4 scrollbar-hidden" data-testid="activity-feed">
        <div className="space-y-1.5 md:space-y-2">
          {recentTrades.map((trade, index) => {
            const isBuy = trade.type === "BUY";
            
            return (
              <div
                key={trade.id}
                className="flex items-start gap-2 md:gap-3 p-1.5 md:p-2 border border-border relative"
                data-testid={`trade-${index}`}
              >
                {/* Clean vertical bar indicator */}
                <div className={`w-1 h-12 md:h-14 rounded-full flex-shrink-0 ${isBuy ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
                
                <div className="flex-1 min-w-0 pr-12 md:pr-16">
                  <p className="font-medium text-foreground text-xs md:text-sm truncate">
                    {trade.marketName}
                  </p>
                  
                  <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground mt-0.5">
                    <span className={`font-medium ${isBuy ? 'text-emerald-500' : 'text-cyan-500'}`}>
                      {trade.type}
                    </span>
                    <span className="font-mono">
                      {trade.size} @ ${trade.price.toFixed(3)}
                    </span>
                  </div>
                  
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">
                    {new Date(trade.timestamp).toLocaleString()}
                  </p>
                </div>
                
                {/* Outcome badge positioned in top-right corner, vertically centered */}
                <div className="absolute top-1/2 right-2 md:right-4 transform -translate-y-1/2">
                  <Badge 
                    variant="outline"
                    className="outcome-badge-dotted text-[10px] px-1.5 py-0.5 md:text-xs md:px-2 md:py-1"
                    data-outcome={trade.outcome}
                  >
                    {trade.outcome}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
