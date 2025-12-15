import { useState, useCallback, useRef, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell, Tooltip } from "recharts";
import type { PnLDataPoint } from "@shared/schema";

interface PnLChartProps {
  data: PnLDataPoint[];
}

type TimeRange = 'ALL' | '1M' | '1Y' | 'YTD';

export function PnLChart({ data }: PnLChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const chartRef = useRef<HTMLDivElement>(null);

  const getFilteredData = useCallback(() => {
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
        cutoffDate.setMonth(0);
        cutoffDate.setDate(1);
        break;
      default:
        return data;
    }
    
    return data.filter(point => new Date(point.timestamp) >= cutoffDate);
  }, [data, timeRange]);

  const filteredData = getFilteredData();

  const chartData = useMemo(() => {
    const baseData = filteredData.map(point => {
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

    // Interpolate to create more data points for denser bars
    if (baseData.length < 2) return baseData;
    
    const interpolated: typeof baseData = [];
    const targetPoints = Math.max(baseData.length * 3, 100); // At least 100 bars
    
    for (let i = 0; i < baseData.length - 1; i++) {
      const current = baseData[i];
      const next = baseData[i + 1];
      const steps = Math.ceil(targetPoints / baseData.length);
      
      for (let j = 0; j < steps; j++) {
        const t = j / steps;
        interpolated.push({
          date: current.date,
          fullDate: current.fullDate,
          time: current.time,
          value: current.value + (next.value - current.value) * t,
        });
      }
    }
    interpolated.push(baseData[baseData.length - 1]);
    
    return interpolated;
  }, [filteredData, timeRange]);

  const currentPnL = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const isPositive = currentPnL >= 0;
  
  const minValue = Math.min(...chartData.map(d => d.value), 0);
  const maxValue = Math.max(...chartData.map(d => d.value), 0);
  const hasNegative = minValue < 0;
  const hasPositive = maxValue > 0;

  const timeRangeButtons: { key: TimeRange; label: string }[] = [
    { key: '1M', label: '1M' },
    { key: '1Y', label: '1Y' },
    { key: 'YTD', label: 'YTD' },
    { key: 'ALL', label: 'Max' },
  ];

  return (
    <Card className="p-0 overflow-hidden bg-[#0a0a0a] border-gray-800/50 transition-all duration-300 hover:border-gray-700/50 h-full flex flex-col">
      <div className="px-4 md:px-6 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span 
              className={`text-3xl md:text-4xl font-bold tabular-nums transition-all duration-300 ${isPositive ? 'text-green-400' : 'text-red-400'}`}
              style={{ 
                textShadow: isPositive ? '0 0 30px rgba(34, 197, 94, 0.3)' : '0 0 30px rgba(239, 68, 68, 0.3)',
              }}
              data-testid="text-chart-pnl"
            >
              {isPositive ? '+' : ''}{currentPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm text-gray-500 ml-1">USDC</span>
          </div>

          <div className="flex gap-1 p-1 bg-gray-900/50 rounded-lg">
            {timeRangeButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeRange(key)}
                className={`
                  px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all duration-200
                  ${timeRange === key 
                    ? 'bg-gray-800 text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div 
        ref={chartRef}
        className="flex-1 min-h-0 relative w-full" 
        data-testid="chart-pnl"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData}
            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
            barGap={0}
            barCategoryGap={0}
          >
            <defs>
              <linearGradient id="barGradientPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="barGradientNegative" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="0" 
              stroke="rgba(255, 255, 255, 0.03)" 
              horizontal={true}
              vertical={false}
            />
            
            {hasNegative && hasPositive && (
              <ReferenceLine 
                y={0} 
                stroke="rgba(255, 255, 255, 0.15)" 
                strokeWidth={1}
              />
            )}
            
            <XAxis 
              dataKey="date" 
              stroke="transparent" 
              tick={false}
              tickLine={false}
              axisLine={false}
              hide={true}
            />
            <YAxis 
              stroke="transparent" 
              tick={false}
              tickLine={false}
              axisLine={false}
              hide={true}
              domain={[minValue * 1.1, maxValue * 1.1]}
              width={0}
            />
            
            <Bar
              dataKey="value"
              radius={[0, 0, 0, 0]}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.value >= 0 ? "url(#barGradientPositive)" : "url(#barGradientNegative)"}
                />
              ))}
            </Bar>
            
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "0.5rem",
                padding: "8px 12px",
                backdropFilter: "blur(12px)",
              }}
              labelStyle={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: "12px",
                fontWeight: 500,
                marginBottom: "4px",
              }}
              itemStyle={{
                color: "white",
                fontSize: "14px",
                fontWeight: 600,
              }}
              formatter={(value: number) => [
                `${value >= 0 ? '+' : ''}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`,
                'P&L'
              ]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  const data = payload[0].payload;
                  return `${data.fullDate} ${data.time}`;
                }
                return label;
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}