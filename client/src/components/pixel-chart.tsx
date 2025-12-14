import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface VolumeDataPoint {
  dt: string;
  builder?: string;
  volume: number;
  activeUsers: number;
  verified?: boolean;
}

interface PixelChartProps {
  data: VolumeDataPoint[];
  isLoading?: boolean;
  onTimeFrameChange?: (timeFrame: string) => void;
  currentTimeFrame?: string;
}

export function PixelChart({ data, isLoading, onTimeFrameChange, currentTimeFrame = "ALL" }: PixelChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Filter data based on selected timeframe - shows all individual day candles within the period
  const filteredData = useMemo(() => {
    if (!data || data.length === 0 || currentTimeFrame === "ALL") {
      return data;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(today);

    switch (currentTimeFrame) {
      case "DAY":
        // Show only today's data (single day candle)
        return data.filter(point => {
          if (!point.dt) return false;
          const pointDate = new Date(point.dt);
          const pointDay = new Date(pointDate.getFullYear(), pointDate.getMonth(), pointDate.getDate());
          return pointDay.getTime() === today.getTime();
        });
      
      case "WEEK":
        // Show last 7 days - all individual day candles
        startDate.setDate(today.getDate() - 6); // 7 days including today
        return data.filter(point => {
          if (!point.dt) return false;
          const pointDate = new Date(point.dt);
          const pointDay = new Date(pointDate.getFullYear(), pointDate.getMonth(), pointDate.getDate());
          return pointDay >= startDate && pointDay <= today;
        });
      
      case "MONTH":
        // Show last 30 days - all individual day candles for the month
        startDate.setDate(today.getDate() - 29); // 30 days including today
        return data.filter(point => {
          if (!point.dt) return false;
          const pointDate = new Date(point.dt);
          const pointDay = new Date(pointDate.getFullYear(), pointDate.getMonth(), pointDate.getDate());
          return pointDay >= startDate && pointDay <= today;
        });
      
      default:
        return data;
    }
  }, [data, currentTimeFrame]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const processedData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return { 
        aggregatedByDate: [] as Array<{ 
          date: string; 
          totalVolume: number; 
          totalActiveUsers: number;
          builders: Array<{ builder: string; volume: number; activeUsers: number; color: string }> 
        }>,
        builders: [] as string[], 
        colors: {} as Record<string, string>,
        maxVolume: 0,
        totalVolume: 0,
      };
    }

    const colorPalette = [
      "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444",
      "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1",
      "#84cc16", "#a855f7", "#22c55e", "#0ea5e9", "#f43f5e",
    ];

    const builders = Array.from(new Set(filteredData.map(p => p.builder).filter(Boolean))).sort();
    const builderColors: Record<string, string> = {};
    builders.forEach((builder, idx) => {
      if (builder) builderColors[builder] = colorPalette[idx % colorPalette.length];
    });

    const dateMap = new Map<string, { totalVolume: number; totalActiveUsers: number; builders: Map<string, { volume: number; activeUsers: number }> }>();
    
    filteredData.forEach((point) => {
      if (!point.dt) return;
      const date = new Date(point.dt);
      // Normalize to date only (remove time component) to ensure proper day grouping
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayKey = normalizedDate.toISOString().split("T")[0];
      const builder = point.builder || 'Unknown';
      const volume = typeof point.volume === 'number' ? point.volume : parseFloat(String(point.volume)) || 0;
      const activeUsers = typeof point.activeUsers === 'number' ? point.activeUsers : parseInt(String(point.activeUsers)) || 0;
      
      if (!dateMap.has(dayKey)) {
        dateMap.set(dayKey, { totalVolume: 0, totalActiveUsers: 0, builders: new Map() });
      }
      
      const entry = dateMap.get(dayKey)!;
      entry.totalVolume += volume;
      entry.totalActiveUsers += activeUsers;
      
      const existing = entry.builders.get(builder) || { volume: 0, activeUsers: 0 };
      entry.builders.set(builder, { 
        volume: existing.volume + volume, 
        activeUsers: existing.activeUsers + activeUsers 
      });
    });

    const aggregatedByDate = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { totalVolume, totalActiveUsers, builders: builderMap }]) => ({
        date,
        totalVolume,
        totalActiveUsers,
        builders: Array.from(builderMap.entries())
          .map(([builder, { volume, activeUsers }]) => ({
            builder,
            volume,
            activeUsers,
            color: builderColors[builder] || colorPalette[0],
          }))
          .sort((a, b) => b.volume - a.volume),
      }));

    const maxVolume = Math.max(...aggregatedByDate.map(d => d.totalVolume), 1);
    const totalVolume = aggregatedByDate.reduce((sum, d) => sum + d.totalVolume, 0);

    return { aggregatedByDate, builders, colors: builderColors, maxVolume, totalVolume };
  }, [filteredData]);

  const CHART_HEIGHT = isMobile ? 280 : 400;
  const CHART_WIDTH = 800;
  const PADDING = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const barData = useMemo(() => {
    const { aggregatedByDate, maxVolume } = processedData;
    if (aggregatedByDate.length === 0) return [];

    const barGap = 2;
    const totalBars = aggregatedByDate.length;
    const barWidth = Math.max(4, (innerWidth - (totalBars - 1) * barGap) / totalBars);

    return aggregatedByDate.map((d, i) => {
      const x = PADDING.left + i * (barWidth + barGap);
      const height = (d.totalVolume / maxVolume) * innerHeight;
      const y = PADDING.top + innerHeight - height;
      return { x, y, width: barWidth, height, data: d };
    });
  }, [processedData, innerWidth, innerHeight]);

  const handleInteraction = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current || !containerRef.current || barData.length === 0) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const scaleX = CHART_WIDTH / svgRect.width;
    
    const x = (clientX - svgRect.left) * scaleX;
    const relativeX = x - PADDING.left;
    
    if (relativeX < 0 || relativeX > innerWidth) {
      setActiveIndex(null);
      setMousePosition(null);
      return;
    }

    const barGap = 2;
    const barWidth = barData[0]?.width || 4;
    const index = Math.floor(relativeX / (barWidth + barGap));
    const clampedIndex = Math.max(0, Math.min(index, barData.length - 1));
    
    setActiveIndex(clampedIndex);
    setMousePosition({
      x: clientX - containerRect.left,
      y: clientY - containerRect.top,
    });
  }, [barData, innerWidth]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleInteraction(e.clientX, e.clientY);
  }, [handleInteraction]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleInteraction]);

  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null);
    setMousePosition(null);
  }, []);

  const activeBar = activeIndex !== null ? barData[activeIndex] : null;
  const activeData = activeBar?.data || null;

  const yAxisLabels = useMemo(() => {
    const { maxVolume } = processedData;
    const steps = 5;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const value = (maxVolume / steps) * (steps - i);
      return {
        value,
        y: PADDING.top + (innerHeight / steps) * i,
        label: value >= 1_000_000 
          ? `$${(value / 1_000_000).toFixed(1)}M`
          : value >= 1_000 
            ? `$${(value / 1_000).toFixed(0)}K`
            : `$${value.toFixed(0)}`,
      };
    });
  }, [processedData, innerHeight]);

  const xAxisLabels = useMemo(() => {
    const { aggregatedByDate } = processedData;
    if (aggregatedByDate.length === 0) return [];
    
    const maxLabels = isMobile ? 5 : 8;
    const step = Math.max(1, Math.floor(aggregatedByDate.length / maxLabels));
    
    return aggregatedByDate
      .filter((_, i) => i % step === 0 || i === aggregatedByDate.length - 1)
      .map((d) => {
        const originalIndex = processedData.aggregatedByDate.indexOf(d);
        const bar = barData[originalIndex];
        const x = bar ? bar.x + bar.width / 2 : PADDING.left;
        const dateObj = new Date(d.date);
        return {
          x,
          label: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        };
      });
  }, [processedData, barData, isMobile]);

  if (isLoading) {
    return (
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">Volume Trend</CardTitle>
          <CardDescription className="text-gray-400">Daily builder volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" strokeWidth={2.5} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const timeFrameOptions = [
    { key: "DAY", label: "Day" },
    { key: "WEEK", label: "Week" },
    { key: "MONTH", label: "Month" },
    { key: "ALL", label: "All" },
  ];

  // Handle timeframe change locally (no need to call parent if not provided)
  const handleTimeFrameChange = (timeFrame: string) => {
    if (onTimeFrameChange) {
      onTimeFrameChange(timeFrame);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 md:mb-4 px-2 md:px-0">
        <div>
          <h2 className="text-sm sm:text-base md:text-xl font-bold text-white">Volume Trend</h2>
          <p className="text-gray-400 text-[10px] sm:text-xs md:text-sm">Daily builder volume over time</p>
        </div>
        <div className="flex gap-1 p-1 bg-gray-900/50 rounded-lg">
          {timeFrameOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleTimeFrameChange(key)}
              className={`
                px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-md transition-all duration-200
                ${currentTimeFrame === key 
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

      {processedData.aggregatedByDate.length === 0 ? (
        <div className="text-center py-6 md:py-12">
          <p className="text-gray-400 text-xs md:text-sm">No volume data available</p>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="w-full relative select-none overflow-x-auto"
          style={{ minHeight: CHART_HEIGHT }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="w-full h-auto min-w-[600px]"
            style={{ touchAction: 'none' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
          >
            {yAxisLabels.map((label, i) => (
              <line
                key={`grid-${i}`}
                x1={PADDING.left}
                y1={label.y}
                x2={PADDING.left + innerWidth}
                y2={label.y}
                stroke="#1f2937"
                strokeWidth="1"
              />
            ))}

            {yAxisLabels.map((label, i) => (
              <text
                key={`y-label-${i}`}
                x={PADDING.left - 8}
                y={label.y}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-[10px] md:text-[11px]"
                fill="#6b7280"
              >
                {label.label}
              </text>
            ))}


            {barData.map((bar, i) => (
              <rect
                key={`bar-${i}`}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height={Math.max(1, bar.height)}
                fill={activeIndex === i ? "#60a5fa" : "#3b82f6"}
                rx="1"
                className="transition-colors duration-100"
              />
            ))}

            {activeBar && (
              <line
                x1={activeBar.x + activeBar.width / 2}
                y1={PADDING.top}
                x2={activeBar.x + activeBar.width / 2}
                y2={PADDING.top + innerHeight}
                stroke="#4b5563"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
            )}

            <rect
              x={PADDING.left}
              y={PADDING.top}
              width={innerWidth}
              height={innerHeight}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
            />
          </svg>
          
          {activeData && mousePosition && (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: `${mousePosition.x}px`,
                top: `${Math.max(20, mousePosition.y - 20)}px`,
                transform: mousePosition.x > (containerRef.current?.clientWidth || 0) / 2 
                  ? 'translate(-100%, -100%)' 
                  : 'translate(10px, -100%)',
              }}
            >
              <div className="bg-[#111827] border border-[#374151] rounded-md shadow-xl min-w-[220px]">
                <div className="px-3 py-2 border-b border-[#374151]">
                  <div className="text-white font-medium text-sm">
                    {new Date(activeData.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
                
                <div className="px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Total Volume</span>
                    <span className="text-white font-semibold text-sm">
                      ${activeData.totalVolume >= 1_000_000 
                        ? `${(activeData.totalVolume / 1_000_000).toFixed(2)}M` 
                        : activeData.totalVolume >= 1_000 
                          ? `${(activeData.totalVolume / 1_000).toFixed(1)}K`
                          : activeData.totalVolume.toFixed(0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Active Users</span>
                    <span className="text-emerald-400 font-medium text-sm">
                      {activeData.totalActiveUsers.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Builders</span>
                    <span className="text-blue-400 font-medium text-sm">
                      {activeData.builders.length}
                    </span>
                  </div>
                  
                  {activeData.builders.length > 0 && (
                    <div className="border-t border-[#374151] pt-2 mt-2">
                      <div className="text-gray-500 text-[10px] uppercase tracking-wider mb-2">Top Builders</div>
                      <div className="space-y-1.5">
                        {activeData.builders.slice(0, 6).map((builder) => {
                          const percentage = ((builder.volume / activeData.totalVolume) * 100).toFixed(1);
                          return (
                            <div key={builder.builder} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div
                                  className="w-2 h-2 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: builder.color }}
                                />
                                <span className="text-gray-300 text-xs truncate">
                                  {builder.builder}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-gray-500 text-xs">
                                  {percentage}%
                                </span>
                                <span className="text-gray-400 text-xs font-medium w-16 text-right">
                                  ${builder.volume >= 1_000_000 
                                    ? `${(builder.volume / 1_000_000).toFixed(1)}M` 
                                    : builder.volume >= 1_000 
                                      ? `${(builder.volume / 1_000).toFixed(0)}K`
                                      : builder.volume.toFixed(0)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {activeData.builders.length > 6 && (
                          <div className="text-gray-500 text-[10px] pt-1">
                            +{activeData.builders.length - 6} more builders
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}