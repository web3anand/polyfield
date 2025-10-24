import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Position } from "@shared/schema";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PositionsTableProps {
  positions: Position[];
}

export function PositionsTable({ positions }: PositionsTableProps) {
  if (positions.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-muted-foreground">No Active Positions</p>
          <p className="text-sm text-muted-foreground">Your active positions will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-foreground">Active Positions</h2>
        <p className="text-sm text-muted-foreground">Monitor your current market positions</p>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full" data-testid="table-positions">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Market</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Outcome</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Entry Price</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Current Price</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Size</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Unrealized PnL</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position, index) => {
              const isProfitable = position.unrealizedPnL >= 0;
              return (
                <tr 
                  key={position.id} 
                  className="border-b border-border hover-elevate"
                  data-testid={`row-position-${index}`}
                >
                  <td className="py-4 px-4">
                    <p className="font-medium text-foreground">{position.marketName}</p>
                  </td>
                  <td className="py-4 px-4">
                    <Badge 
                      variant={position.outcome === "YES" ? "default" : "secondary"}
                      data-testid={`badge-outcome-${index}`}
                    >
                      {position.outcome}
                    </Badge>
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-foreground">
                    ${position.entryPrice.toFixed(3)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-foreground">
                    ${position.currentPrice.toFixed(3)}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-foreground">
                    {position.size}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isProfitable ? (
                        <TrendingUp className="w-4 h-4 text-chart-2" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <span className={`font-mono font-semibold ${isProfitable ? 'text-chart-2' : 'text-destructive'}`}>
                        {isProfitable ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {positions.map((position, index) => {
          const isProfitable = position.unrealizedPnL >= 0;
          return (
            <Card key={position.id} className="p-4" data-testid={`card-position-${index}`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground flex-1">{position.marketName}</p>
                  <Badge variant={position.outcome === "YES" ? "default" : "secondary"}>
                    {position.outcome}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Entry Price</p>
                    <p className="font-mono text-foreground">${position.entryPrice.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Current Price</p>
                    <p className="font-mono text-foreground">${position.currentPrice.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Size</p>
                    <p className="font-mono text-foreground">{position.size}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Unrealized PnL</p>
                    <div className="flex items-center gap-1">
                      {isProfitable ? (
                        <TrendingUp className="w-3 h-3 text-chart-2" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-destructive" />
                      )}
                      <p className={`font-mono font-semibold ${isProfitable ? 'text-chart-2' : 'text-destructive'}`}>
                        {isProfitable ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}
