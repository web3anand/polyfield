import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { PnLDataPoint } from "@shared/schema";

interface PnLChartProps {
  data: PnLDataPoint[];
}

export function PnLChart({ data }: PnLChartProps) {
  const chartData = data.map(point => {
    const date = new Date(point.timestamp);
    return {
      date: date.toLocaleDateString(undefined, { 
        month: 'short', 
        year: '2-digit'
      }),
      fullDate: date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }),
      value: point.value,
    };
  });

  const currentPnL = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const isPositive = currentPnL >= 0;

  return (
    <Card className="p-6 hover-elevate">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">All-Time PnL</p>
          <p className={`text-3xl font-bold tabular-nums ${isPositive ? 'text-chart-2' : 'text-destructive'}`} data-testid="text-chart-pnl">
            {isPositive ? '+' : ''}${currentPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="h-[280px]" data-testid="chart-pnl">
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
              labelFormatter={(label, payload) => {
                if (payload && payload.length > 0) {
                  return payload[0].payload.fullDate;
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
