import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { PnLDataPoint } from "@shared/schema";

interface PnLChartProps {
  data: PnLDataPoint[];
}

type TimeRange = 'ALL' | '1M' | '1Y' | 'YTD';

export function PnLChart({ data }: PnLChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');

  // Filter data based on selected time range
  const getFilteredData = () => {
    if (timeRange === 'ALL' || data.length === 0) return data;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeRange) {
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'YTD':
        cutoffDate.setMonth(0); // January 1st of current year
        cutoffDate.setDate(1);
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
        day: 'numeric',
        year: timeRange === 'ALL' || timeRange === '1Y' ? 'numeric' : undefined
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
    <Card className="p-0 hover-elevate overflow-hidden bg-[#0a0a0a]">
      {/* Header Section */}
      <div className="px-4 md:px-6 pt-4 md:pt-6 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <span className={`text-3xl md:text-4xl font-bold tabular-nums ${isPositive ? 'text-[#10b981]' : 'text-destructive'}`} data-testid="text-chart-pnl">
              {currentPnL.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-sm text-muted-foreground ml-2">PnL</span>
          </div>
        </div>

        {/* Time Range Selector - Predictfolio Style */}
        <div className="flex gap-4">
          <button
            onClick={() => setTimeRange('1M')}
            className={`text-xs md:text-sm font-medium transition-colors ${
              timeRange === '1M' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            1M
          </button>
          <button
            onClick={() => setTimeRange('1Y')}
            className={`text-xs md:text-sm font-medium transition-colors ${
              timeRange === '1Y' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            1Y
          </button>
          <button
            onClick={() => setTimeRange('YTD')}
            className={`text-xs md:text-sm font-medium transition-colors ${
              timeRange === 'YTD' 
                ? 'text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            YTD
          </button>
          <button
            onClick={() => setTimeRange('ALL')}
            className={`text-xs md:text-sm font-medium transition-colors ${
              timeRange === 'ALL' 
                ? 'text-[#10b981]' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Max
          </button>
        </div>
      </div>

      {/* Chart Section - Clean, no padding */}
      <div className="h-[280px] md:h-[350px]" data-testid="chart-pnl">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData}
            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          >
            <defs>
              {/* Smooth gradient fill - Predictfolio style */}
              <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="0%" 
                  stopColor={isPositive ? "#10b981" : "#ef4444"} 
                  stopOpacity={0.4}
                />
                <stop 
                  offset="95%" 
                  stopColor={isPositive ? "#10b981" : "#ef4444"} 
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            {/* Minimal grid - horizontal only, subtle */}
            <CartesianGrid 
              strokeDasharray="0" 
              stroke="rgba(255, 255, 255, 0.05)" 
              horizontal={true}
              vertical={false}
            />
            <XAxis 
              dataKey="date" 
              stroke="transparent" 
              tick={false}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="transparent" 
              tick={false}
              tickLine={false}
              axisLine={false}
              domain={['dataMin', 'dataMax']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(10, 10, 10, 0.98)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "8px",
                padding: "12px 16px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
              }}
              labelStyle={{ 
                color: "rgba(255, 255, 255, 0.7)", 
                fontSize: "11px",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
              itemStyle={{ 
                color: isPositive ? "#10b981" : "#ef4444", 
                fontSize: "16px", 
                fontWeight: "700",
                padding: "0"
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  const point = payload[0].payload;
                  return point.fullDate;
                }
                return label;
              }}
              formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "PnL"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              fill="url(#colorPnL)"
              dot={false}
              activeDot={{ 
                r: 5, 
                fill: isPositive ? "#10b981" : "#ef4444",
                strokeWidth: 0
              }}
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
