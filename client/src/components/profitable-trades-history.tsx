import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, FileJson, FileSpreadsheet } from "lucide-react";
import type { Trade } from "@shared/schema";

interface ProfitableTradesHistoryProps {
  trades: Trade[];
}

export function ProfitableTradesHistory({ trades }: ProfitableTradesHistoryProps) {
  // Filter only profitable trades (profit > 0) and sort by profit descending
  const profitableTrades = trades
    .filter((trade) => trade.profit !== undefined && trade.profit > 0)
    .sort((a, b) => (b.profit || 0) - (a.profit || 0));

  // Helper function to get trade data for export
  const getTradeData = (trade: Trade) => {
    const betAmount = trade.betAmount;
    const closePositionValue = trade.closePositionValue;
    const netProfit = trade.netProfit || trade.profit || 0;
    
    let buyAmount = betAmount;
    let sellAmount = closePositionValue;
    
    if (buyAmount === undefined || buyAmount <= 0) {
      if (sellAmount !== undefined && sellAmount > 0) {
        buyAmount = sellAmount - netProfit;
      } else if (netProfit > 0) {
        buyAmount = netProfit > 1000 ? netProfit / 10 : netProfit;
        sellAmount = buyAmount + netProfit;
      } else {
        buyAmount = 0;
        sellAmount = 0;
      }
    } else if (sellAmount === undefined || sellAmount <= 0) {
      sellAmount = buyAmount + netProfit;
    }
    
    if (buyAmount < 0) buyAmount = 0;
    if (sellAmount < buyAmount && netProfit > 0) {
      sellAmount = buyAmount + netProfit;
    }

    return {
      id: trade.id,
      marketName: trade.marketName,
      marketUrl: (trade as any).marketUrl || '',
      outcome: trade.outcome,
      buyAmount: buyAmount.toFixed(2),
      sellAmount: sellAmount.toFixed(2),
      netProfit: netProfit.toFixed(2),
      timestamp: trade.timestamp || '',
      price: trade.price || 0,
      size: trade.size || 0,
    };
  };

  // Download as CSV
  const downloadCSV = () => {
    const headers = ['Market Name', 'Outcome', 'Buy Amount ($)', 'Sell Amount ($)', 'Net Profit ($)', 'Price', 'Size', 'Timestamp', 'Market URL'];
    const rows = profitableTrades.map(trade => {
      const data = getTradeData(trade);
      return [
        data.marketName,
        data.outcome,
        data.buyAmount,
        data.sellAmount,
        data.netProfit,
        data.price.toString(),
        data.size.toString(),
        data.timestamp,
        data.marketUrl,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `profitable-trades-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download as JSON
  const downloadJSON = () => {
    const data = profitableTrades.map(trade => {
      const tradeData = getTradeData(trade);
      return {
        id: tradeData.id,
        marketName: tradeData.marketName,
        marketUrl: tradeData.marketUrl,
        outcome: tradeData.outcome,
        buyAmount: parseFloat(tradeData.buyAmount),
        sellAmount: parseFloat(tradeData.sellAmount),
        netProfit: parseFloat(tradeData.netProfit),
        price: tradeData.price,
        size: tradeData.size,
        timestamp: tradeData.timestamp,
      };
    });

    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `profitable-trades-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download as Excel (TSV format - tab-separated values)
  const downloadExcel = () => {
    const headers = ['Market Name', 'Outcome', 'Buy Amount ($)', 'Sell Amount ($)', 'Net Profit ($)', 'Price', 'Size', 'Timestamp', 'Market URL'];
    const rows = profitableTrades.map(trade => {
      const data = getTradeData(trade);
      return [
        data.marketName,
        data.outcome,
        data.buyAmount,
        data.sellAmount,
        data.netProfit,
        data.price.toString(),
        data.size.toString(),
        data.timestamp,
        data.marketUrl,
      ];
    });

    const tsvContent = [
      headers.join('\t'),
      ...rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ')).join('\t'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `profitable-trades-${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  console.log('📊 ProfitableTradesHistory - Input trades:', trades.length);
  console.log('📊 ProfitableTradesHistory - Profitable trades:', profitableTrades.length);
  if (profitableTrades.length > 0) {
    console.log('📊 Sample profitable trade:', {
      id: profitableTrades[0].id,
      marketName: profitableTrades[0].marketName,
      profit: profitableTrades[0].profit,
      betAmount: profitableTrades[0].betAmount,
      closePositionValue: profitableTrades[0].closePositionValue,
      netProfit: profitableTrades[0].netProfit,
      type: profitableTrades[0].type,
      size: profitableTrades[0].size,
      price: profitableTrades[0].price,
    });
  }

  if (profitableTrades.length === 0) {
    return (
      <Card className="p-3 md:p-6 hover-elevate">
        <div className="mb-3 md:mb-4">
          <h2 className="text-base md:text-xl font-semibold text-foreground">Profitable Trades History</h2>
          <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-wide">
            All winning trades
          </p>
        </div>
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No profitable trades found</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-2 md:p-4 hover-elevate">
      <div className="mb-2 md:mb-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <h2 className="text-sm md:text-lg font-semibold text-foreground">Profitable Trades History</h2>
          <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-wide">
            {profitableTrades.length} winning trade{profitableTrades.length !== 1 ? 's' : ''} • Sorted by profit
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={downloadCSV} className="cursor-pointer">
              <FileText className="h-4 w-4 mr-2" />
              Download as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadJSON} className="cursor-pointer">
              <FileJson className="h-4 w-4 mr-2" />
              Download as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={downloadExcel} className="cursor-pointer">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <ScrollArea className="h-[500px] pr-2 scrollbar-hidden" data-testid="profitable-trades-list">
          <table className="w-full">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Market</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Buy Amount</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Sell Amount</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Net Profit</th>
              </tr>
            </thead>
            <tbody>
              {profitableTrades.map((trade, index) => {
                const betAmount = trade.betAmount;
                const closePositionValue = trade.closePositionValue;
                const netProfit = trade.netProfit || trade.profit || 0;
                
                // Use backend values directly if available, otherwise calculate from profit
                let buyAmount = betAmount;
                let sellAmount = closePositionValue;
                
                if (buyAmount === undefined || buyAmount <= 0) {
                  if (sellAmount !== undefined && sellAmount > 0) {
                    buyAmount = sellAmount - netProfit;
                  } else if (netProfit > 0) {
                    buyAmount = netProfit > 1000 ? netProfit / 10 : netProfit;
                    sellAmount = buyAmount + netProfit;
                  } else {
                    buyAmount = 0;
                    sellAmount = 0;
                  }
                } else if (sellAmount === undefined || sellAmount <= 0) {
                  sellAmount = buyAmount + netProfit;
                }
                
                if (buyAmount < 0) buyAmount = 0;
                if (sellAmount < buyAmount && netProfit > 0) {
                  sellAmount = buyAmount + netProfit;
                }
                
                const marketImage = (trade as any).marketImage;
                const marketUrl = (trade as any).marketUrl;
                
                return (
                  <tr
                    key={trade.id}
                    className="border-b border-border/50 hover:bg-accent/20 transition-colors"
                    data-testid={`profitable-trade-${index}`}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 min-w-0">
                        {marketImage && (
                          <img 
                            src={marketImage} 
                            alt={trade.marketName}
                            className="w-7 h-7 rounded object-cover flex-shrink-0"
                          />
                        )}
                        {marketUrl ? (
                          <a
                            href={marketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-foreground truncate hover:text-primary transition-colors"
                          >
                            {trade.marketName}
                          </a>
                        ) : (
                          <p className="font-medium text-foreground truncate">
                            {trade.marketName}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-bold tabular-nums text-foreground">
                      ${buyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right font-bold tabular-nums text-foreground">
                      ${sellAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right font-bold tabular-nums text-chart-2">
                      +${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      {/* Mobile Compact Layout */}
      <div className="md:hidden">
        <ScrollArea className="h-[400px] pr-2 scrollbar-hidden" data-testid="profitable-trades-list-mobile">
          <div className="space-y-1">
            {profitableTrades.map((trade, index) => {
              const betAmount = trade.betAmount;
              const closePositionValue = trade.closePositionValue;
              const netProfit = trade.netProfit || trade.profit || 0;
              
              let buyAmount = betAmount;
              let sellAmount = closePositionValue;
              
              if (buyAmount === undefined || buyAmount <= 0) {
                if (sellAmount !== undefined && sellAmount > 0) {
                  buyAmount = sellAmount - netProfit;
                } else if (netProfit > 0) {
                  buyAmount = netProfit > 1000 ? netProfit / 10 : netProfit;
                  sellAmount = buyAmount + netProfit;
                } else {
                  buyAmount = 0;
                  sellAmount = 0;
                }
              } else if (sellAmount === undefined || sellAmount <= 0) {
                sellAmount = buyAmount + netProfit;
              }
              
              if (buyAmount < 0) buyAmount = 0;
              if (sellAmount < buyAmount && netProfit > 0) {
                sellAmount = buyAmount + netProfit;
              }
              
              const marketImage = (trade as any).marketImage;
              const marketUrl = (trade as any).marketUrl;
              
              return (
                <div
                  key={trade.id}
                  className="border-b border-border/50 hover:bg-accent/20 transition-colors p-1.5"
                  data-testid={`profitable-trade-${index}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {marketImage && (
                      <img 
                        src={marketImage} 
                        alt={trade.marketName}
                        className="w-6 h-6 rounded object-cover flex-shrink-0"
                      />
                    )}
                    {marketUrl ? (
                      <a
                        href={marketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-xs text-foreground truncate hover:text-primary transition-colors flex-1"
                      >
                        {trade.marketName}
                      </a>
                    ) : (
                      <p className="font-medium text-xs text-foreground truncate flex-1">
                        {trade.marketName}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Buy</p>
                      <p className="font-bold text-xs tabular-nums text-foreground">
                        ${buyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Sell</p>
                      <p className="font-bold text-xs tabular-nums text-foreground">
                        ${sellAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wide mb-0.5">Profit</p>
                      <p className="font-bold text-xs tabular-nums text-chart-2">
                        +${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}

