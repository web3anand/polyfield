import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Position } from "@shared/schema";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PositionsTableProps {
  positions: Position[];
}

type SortOption = "pnl-desc" | "pnl-asc" | "size-desc" | "size-asc" | "market-asc";

// Generate Polymarket URL
function getPolymarketUrl(eventSlug?: string, marketSlug?: string, marketId?: string): string {
  // Polymarket URL format: https://polymarket.com/event/[eventSlug]
  // Prefer eventSlug, fallback to marketSlug, then use marketId if available
  // This matches the format used in profitable trades
  
  if (eventSlug) {
    return `https://polymarket.com/event/${eventSlug}`;
  }
  
  if (marketSlug) {
    return `https://polymarket.com/event/${marketSlug}`;
  }
  
  // If we have marketId (conditionId), try to use it as a fallback
  if (marketId) {
    // If it's a hex conditionId, we can try to use it directly
    // But typically we need a slug, so this is a last resort
    if (marketId.startsWith('0x')) {
      // Try to construct a condition URL
      return `https://polymarket.com/condition/${marketId}`;
    }
  }
  
  // Fallback if missing data
  return `https://polymarket.com`;
}

export function PositionsTable({ positions }: PositionsTableProps) {
  const [sortBy, setSortBy] = useState<SortOption>("pnl-desc");

  const sortedPositions = useMemo(() => {
    const sorted = [...positions];
    
    switch (sortBy) {
      case "pnl-desc":
        return sorted.sort((a, b) => b.unrealizedPnL - a.unrealizedPnL);
      case "pnl-asc":
        return sorted.sort((a, b) => a.unrealizedPnL - b.unrealizedPnL);
      case "size-desc":
        return sorted.sort((a, b) => b.size - a.size);
      case "size-asc":
        return sorted.sort((a, b) => a.size - b.size);
      case "market-asc":
        return sorted.sort((a, b) => a.marketName.localeCompare(b.marketName));
      default:
        return sorted;
    }
  }, [positions, sortBy]);

  const sortLabels: Record<SortOption, string> = {
    "pnl-desc": "PnL: High to Low",
    "pnl-asc": "PnL: Low to High",
    "size-desc": "Size: Largest First",
    "size-asc": "Size: Smallest First",
    "market-asc": "Market: A to Z",
  };

  if (positions.length === 0) {
    return (
      <Card className="p-6 hover-elevate">
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold text-foreground">No Active Positions</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Your active positions will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 md:p-6 hover-elevate">
      <div className="flex items-center justify-between mb-3 md:mb-4 gap-2 md:gap-4 flex-wrap">
        <div>
          <h2 className="text-base md:text-xl font-semibold text-foreground">Active Positions</h2>
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">
            {positions.length} position{positions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" data-testid="button-sort-positions" className="text-xs md:text-sm h-8 md:h-9 px-2 md:px-3">
              <ArrowUpDown className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
              <span className="sm:hidden">Sort</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" data-testid="dropdown-sort-menu">
            {(Object.keys(sortLabels) as SortOption[]).map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => setSortBy(option)}
                data-testid={`option-sort-${option}`}
                className={sortBy === option ? "bg-primary/10 text-primary font-medium" : ""}
              >
                {sortLabels[option]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Table - Scrollable with max 5 rows visible */}
      <div className="hidden md:block overflow-x-auto">
        <div className="max-h-[400px] overflow-y-auto scrollbar-hidden" data-testid="scrollable-positions-table">
          <table className="w-full" data-testid="table-positions">
            <thead className="sticky top-0 bg-card z-10">
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
              {sortedPositions.map((position, index) => {
                const isProfitable = position.unrealizedPnL >= 0;
                const marketUrl = getPolymarketUrl(position.eventSlug, position.marketSlug, position.marketId);
                return (
                  <tr 
                    key={position.id} 
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                    data-testid={`row-position-${index}`}
                  >
                    <td className="py-4 px-4">
                      <a 
                        href={marketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2 group"
                      >
                        <span className="group-hover:underline">{position.marketName}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </a>
                    </td>
                    <td className="py-4 px-4">
                      <Badge 
                        variant="outline"
                        className="outcome-badge-dotted"
                        data-outcome={position.outcome}
                        data-testid={`badge-outcome-${index}`}
                      >
                        {position.outcome}
                      </Badge>
                    </td>
                    <td className="py-4 px-4 text-right font-bold tabular-nums text-foreground">
                      ${position.entryPrice.toFixed(3)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold tabular-nums text-foreground">
                      ${position.currentPrice.toFixed(3)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold tabular-nums text-foreground">
                      {position.size.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`font-bold tabular-nums ${isProfitable ? 'text-chart-2' : 'text-destructive'}`}>
                        {isProfitable ? '+' : ''}${position.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View - Scrollable with max 5 cards visible */}
      <div className="md:hidden max-h-[400px] overflow-y-auto scrollbar-hidden space-y-2" data-testid="scrollable-positions-mobile">
        {sortedPositions.map((position, index) => {
          const isProfitable = position.unrealizedPnL >= 0;
          const marketUrl = getPolymarketUrl(position.eventSlug, position.marketSlug, position.marketId);
          return (
            <Card key={position.id} className="p-3" data-testid={`card-position-${index}`}>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <a 
                    href={marketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-xs text-foreground hover:text-primary transition-colors flex items-center gap-1.5 group flex-1 min-w-0"
                  >
                    <span className="truncate group-hover:underline">{position.marketName}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </a>
                  <Badge 
                    variant="outline"
                    className="outcome-badge-dotted flex-shrink-0 text-[10px] px-1.5 py-0.5"
                    data-outcome={position.outcome}
                  >
                    {position.outcome}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Entry Price</p>
                    <p className="font-bold text-sm tabular-nums text-foreground">${position.entryPrice.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Current Price</p>
                    <p className="font-bold text-sm tabular-nums text-foreground">${position.currentPrice.toFixed(3)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Size</p>
                    <p className="font-bold text-sm tabular-nums text-foreground">{position.size.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Unrealized PnL</p>
                    <p className={`font-bold text-sm tabular-nums ${isProfitable ? 'text-chart-2' : 'text-destructive'}`}>
                      {isProfitable ? '+' : ''}${position.unrealizedPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
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
