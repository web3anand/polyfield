import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Trade } from "@shared/schema";

interface VolumeMetricsProps {
  totalVolume: number;
  trades: Trade[];
}

export function VolumeMetrics({ totalVolume, trades }: VolumeMetricsProps) {
  // Calculate volume by outcome type
  const yesVolume = trades
    .filter(t => t.outcome === "YES")
    .reduce((sum, t) => sum + (t.price * t.size), 0);
  
  const noVolume = trades
    .filter(t => t.outcome === "NO")
    .reduce((sum, t) => sum + (t.price * t.size), 0);

  const chartData = [
    { name: "YES Positions", value: yesVolume, color: "hsl(var(--chart-2))" },
    { name: "NO Positions", value: noVolume, color: "hsl(var(--chart-1))" },
  ];

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Trading Volume</h2>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Volume breakdown by position type</p>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-center mb-4">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Total Volume</p>
          <p className="text-3xl font-bold text-foreground tabular-nums" data-testid="text-total-volume">
            ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="w-full h-[200px]" data-testid="chart-volume">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  padding: "8px 12px",
                }}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-6 w-full mt-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">YES Volume</p>
            <p className="text-xl font-bold text-chart-2 tabular-nums">
              ${(yesVolume / 1000).toFixed(1)}K
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">NO Volume</p>
            <p className="text-xl font-bold text-chart-1 tabular-nums">
              ${(noVolume / 1000).toFixed(1)}K
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
