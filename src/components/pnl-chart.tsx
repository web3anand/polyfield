import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { PnLDataPoint } from "@shared/schema";

interface PnLChartProps {
  data: PnLDataPoint[];
}

type TimeRange = 'ALL' | '1M' | '1W' | '1D';

export function PnLChart({ data }: PnLChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  // Filter data based on selected time range
  const getFilteredData = () => {
    if (timeRange === 'ALL' || data.length === 0) return data;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case '1D':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      default:
        return data;
    }
    
    return data.filter(point => new Date(point.timestamp) >= cutoffDate);
  };

  const filteredData = getFilteredData();

  const chartData = filteredData.map(point => {
    const date = new Date(point.timestamp);
    return {
      date: date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: timeRange === '1D' || timeRange === '1W' ? 'numeric' : undefined,
        year: timeRange === 'ALL' ? '2-digit' : undefined
      }),
      fullDate: date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit'
      }),
      value: point.value,
    };
  });

  const currentPnL = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const isPositive = currentPnL >= 0;

  return (
    <Card className="p-3 md:p-6 hover-elevate">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-3 mb-3 md:mb-4">
        <div>
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground mb-0.5 md:mb-1 uppercase tracking-wide">All-Time PnL</p>
          <p className={`text-xl md:text-3xl font-bold tabular-nums ${isPositive ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-chart-pnl">
            {isPositive ? '+' : ''}${currentPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-0.5 md:gap-1 bg-muted p-0.5 md:p-1 rounded-md border border-border">
          <Button
            variant={timeRange === '1D' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('1D')}
            className="h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-xs font-semibold"
          >
            1D
          </Button>
          <Button
            variant={timeRange === '1W' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('1W')}
            className="h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-xs font-semibold"
          >
            1W
          </Button>
          <Button
            variant={timeRange === '1M' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('1M')}
            className="h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-xs font-semibold"
          >
            1M
          </Button>
          <Button
            variant={timeRange === 'ALL' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTimeRange('ALL')}
            className="h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-xs font-semibold"
          >
            ALL
          </Button>
        </div>
      </div>

      <div className="h-[200px] md:h-[270px]" data-testid="chart-pnl">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} 
                  stopOpacity={0.3}
                />
                <stop 
                  offset="95%" 
                  stopColor={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"} 
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              tick={{ fontSize: 10 }}
              tickLine={false}
              className="md:text-xs"
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              tick={{ fontSize: 10 }}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
              className="md:text-xs"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  const point = payload[0].payload;
                  if (timeRange === '1D') {
                    return `${point.fullDate} ${point.time}`;
                  }
                  return point.fullDate;
                }
                return label;
              }}
              formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "PnL"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "hsl(var(--chart-2))" : "hsl(var(--destructive))"}
              strokeWidth={2}
              fill="url(#colorPnL)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
