import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import type { PnLDataPoint } from "@shared/schema";

interface PnLChartProps {
  data: PnLDataPoint[];
}

type TimeRange = "24H" | "7D" | "30D" | "ALL";

export function PnLChart({ data }: PnLChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("7D");

  const filterDataByTimeRange = (range: TimeRange) => {
    const now = Date.now();
    const ranges = {
      "24H": 24 * 60 * 60 * 1000,
      "7D": 7 * 24 * 60 * 60 * 1000,
      "30D": 30 * 24 * 60 * 60 * 1000,
      "ALL": Infinity,
    };
    
    return data.filter(point => {
      const pointTime = new Date(point.timestamp).getTime();
      return now - pointTime <= ranges[range];
    });
  };

  const filteredData = filterDataByTimeRange(timeRange);
  
  const chartData = filteredData.map(point => ({
    date: new Date(point.timestamp).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    }),
    value: point.value,
  }));

  const isPositive = chartData.length > 0 && chartData[chartData.length - 1].value >= (chartData[0]?.value || 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">PnL Over Time</h2>
          <p className="text-sm text-muted-foreground">Track your profit and loss</p>
        </div>
        <div className="flex gap-2">
          {(["24H", "7D", "30D", "ALL"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              data-testid={`button-timerange-${range.toLowerCase()}`}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="min-w-[60px]"
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-[300px]" data-testid="chart-pnl">
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
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                padding: "8px 12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, "PnL"]}
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
