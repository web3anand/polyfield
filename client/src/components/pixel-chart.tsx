import { useState, useMemo, useRef, useEffect } from "react";
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
}

export function PixelChart({ data, isLoading }: PixelChartProps) {
  const [tooltip, setTooltip] = useState<{
    date: string;
    builders: Array<{ builder: string; volume: number; color: string }>;
    totalVolume: number;
    x: number;
    y: number;
  } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate tooltip position to keep it within viewport
  useEffect(() => {
    if (!tooltip || !containerRef.current) {
      setTooltipStyle({});
      return;
    }

    // Use requestAnimationFrame to ensure tooltip is rendered before measuring
    const updatePosition = () => {
      if (!containerRef.current || !tooltipRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 12; // Padding from viewport edges

      let left = tooltip.x;
      let top = tooltip.y;
      let transform = 'translate(-50%, calc(-100% - 12px))';

      // Get actual tooltip dimensions
      const tooltipWidth = tooltipRect.width || (isMobile ? 250 : 300);
      const tooltipHeight = tooltipRect.height || (isMobile ? 150 : 200);

      // Calculate absolute positions relative to viewport
      const containerLeft = containerRect.left;
      const containerTop = containerRect.top;
      const absoluteLeft = containerLeft + tooltip.x;
      const absoluteTop = containerTop + tooltip.y;

      // Check horizontal bounds
      const leftEdge = absoluteLeft - tooltipWidth / 2;
      const rightEdge = absoluteLeft + tooltipWidth / 2;

      if (leftEdge < padding) {
        // Too far left, align to left edge of viewport
        const newAbsoluteLeft = padding + tooltipWidth / 2;
        left = newAbsoluteLeft - containerLeft;
        transform = 'translate(-50%, calc(-100% - 12px))';
      } else if (rightEdge > viewportWidth - padding) {
        // Too far right, align to right edge of viewport
        const newAbsoluteLeft = viewportWidth - padding - tooltipWidth / 2;
        left = newAbsoluteLeft - containerLeft;
        transform = 'translate(-50%, calc(-100% - 12px))';
      }

      // Check vertical bounds
      const topEdge = absoluteTop - tooltipHeight - 12;
      const bottomEdge = absoluteTop + 12;

      if (topEdge < padding) {
        // Too high, show below instead
        transform = transform.replace('calc(-100% - 12px)', 'calc(100% + 12px)');
      } else if (bottomEdge + tooltipHeight > viewportHeight - padding) {
        // Too low, try to show above
        const newTopEdge = absoluteTop - tooltipHeight - 12;
        if (newTopEdge >= padding) {
          transform = transform.replace('calc(100% + 12px)', 'calc(-100% - 12px)');
        } else {
          // If can't fit above or below, position at top of viewport
          top = padding + tooltipHeight / 2 - containerTop;
          transform = 'translate(-50%, -50%)';
        }
      }

      setTooltipStyle({
        left: `${left}px`,
        top: `${top}px`,
        transform,
      });
    };

    // Initial positioning
    requestAnimationFrame(() => {
      requestAnimationFrame(updatePosition);
    });
  }, [tooltip, isMobile]);

  // Process data: group by builder and create time series for each
  const processedData = useMemo(() => {
    console.log("📊 PixelChart processing data:", data?.length || 0, "points");
    console.log("📊 Sample data:", data?.slice(0, 3));
      if (!data || data.length === 0) {
      console.log("⚠️ No data to process");
      return { 
        builderSeries: [], 
        builders: [] as string[], 
        colors: {} as Record<string, string>, 
        allDates: [] as string[], 
        dateTotals: new Map<string, number>() 
      };
    }

    console.log(`📊 Processing all data (no time filtering)`);

    // Filter out invalid points - show all data
    const filtered = data.filter((point) => {
      return point.dt && point.volume !== undefined;
    });

    console.log(`📊 Filtered data: ${filtered.length} points (from ${data.length} total)`);

    // Get unique builders and assign colors
    const builders = Array.from(new Set(filtered.map(p => p.builder).filter(Boolean))).sort();
    console.log(`📊 Found ${builders.length} unique builders:`, builders);
    const builderColors: Record<string, string> = {};
    
    // Color palette - distinct colors for each builder
    const colorPalette = [
      "#10b981", // emerald
      "#3b82f6", // blue
      "#8b5cf6", // purple
      "#f59e0b", // amber
      "#ef4444", // red
      "#06b6d4", // cyan
      "#f97316", // orange
      "#ec4899", // pink
      "#14b8a6", // teal
      "#6366f1", // indigo
      "#84cc16", // lime
      "#a855f7", // violet
      "#22c55e", // green
      "#0ea5e9", // sky
      "#f43f5e", // rose
      "#eab308", // yellow
    ];

    builders.forEach((builder, idx) => {
      if (builder) {
        builderColors[builder] = colorPalette[idx % colorPalette.length];
      }
    });

    // Group data by builder and create time series
    const builderDataMap = new Map<string, Array<{ date: string; timestamp: number; volume: number }>>();
    const allDatesSet = new Set<string>();

    filtered.forEach((point) => {
      const date = new Date(point.dt);
      const dayKey = date.toISOString().split("T")[0];
      const builder = point.builder || 'Unknown';
      const volume = typeof point.volume === 'number' ? point.volume : parseFloat(String(point.volume)) || 0;
      
      allDatesSet.add(dayKey);
      
      if (!builderDataMap.has(builder)) {
        builderDataMap.set(builder, []);
      }
      
      if (builder) {
        builderDataMap.get(builder)!.push({
          date: dayKey,
          timestamp: date.getTime(),
          volume,
        });
      }
    });

    // Get all unique dates and sort them
    const allDates = Array.from(allDatesSet).sort();

    // Create time series for each builder
    const builderSeries = builders.map((builder) => {
      if (!builder) return null;
      const builderPoints = builderDataMap.get(builder) || [];
      // Sort by date
      builderPoints.sort((a, b) => a.timestamp - b.timestamp);
      
      // Fill in missing dates with 0 volume
      const completeSeries = allDates.map(date => {
        const existing = builderPoints.find(p => p.date === date);
        return existing || {
          date,
          timestamp: new Date(date).getTime(),
          volume: 0,
        };
      });

      return {
        builder: builder,
        color: builderColors[builder] || colorPalette[0],
        dataPoints: completeSeries,
        totalVolume: completeSeries.reduce((sum, p) => sum + p.volume, 0),
      };
    }).filter((series): series is NonNullable<typeof series> => series !== null);

    // Sort builders by total volume (descending)
    builderSeries.sort((a, b) => b.totalVolume - a.totalVolume);

    // Calculate total volume per date (sum of all builders on that date)
    const dateTotals = new Map<string, number>();
    allDates.forEach(date => {
      const total = builderSeries.reduce((sum, series) => {
        const point = series.dataPoints.find(p => p.date === date);
        return sum + (point?.volume || 0);
      }, 0);
      dateTotals.set(date, total);
    });

    console.log(`✓ Processed ${builderSeries.length} builder time series with ${allDates.length} dates`);
    console.log(`✓ Sample builder series:`, builderSeries[0]?.builder, builderSeries[0]?.dataPoints?.slice(0, 3));
    return { builderSeries, builders, colors: builderColors, allDates, dateTotals };
  }, [data]);

  const maxVolume = useMemo(() => {
    if (processedData.builderSeries.length === 0) return 1;
    return Math.max(
      ...processedData.builderSeries.flatMap(series => series.dataPoints.map(p => p.volume))
    );
  }, [processedData]);

  const totalVolume = useMemo(() => {
    return processedData.builderSeries.reduce((sum, series) => sum + series.totalVolume, 0);
  }, [processedData]);

  // Pixel chart dimensions - responsive
  const PIXEL_SIZE = 8;
  const GAP = 2;
  const CHART_HEIGHT = isMobile ? 250 : 400;
  const CHART_WIDTH = Math.max(processedData.allDates.length * (PIXEL_SIZE + GAP), 800);

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

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div>
          <h2 className="text-base md:text-xl font-bold text-white">Volume Trend</h2>
          <p className="text-gray-400 text-xs md:text-sm">Daily builder volume over time</p>
        </div>
      </div>

      {/* Pixel Chart - Full Width, No Background - Time series per builder */}
      {processedData.builderSeries.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <p className="text-gray-400 text-sm">No volume data available</p>
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="w-full relative overflow-x-auto" 
          style={{ minHeight: CHART_HEIGHT }}
          onClick={(e) => {
            // Only hide tooltip if clicking outside the bars
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
              setTooltip(null);
            }
          }}
          onTouchEnd={(e) => {
            // Don't hide on touch end - let user see the tooltip
            // Only hide if touching outside
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
              setTooltip(null);
            }
          }}
          onTouchCancel={() => setTooltip(null)}
        >
          <svg
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            className="overflow-visible"
            style={{ imageRendering: "pixelated", minWidth: "100%" }}
            preserveAspectRatio="none"
          >
            <defs>
              {/* Pixel glow effect */}
              <filter id="pixel-glow">
                <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* Render each builder's time series - bars can overlap on same date */}
            {processedData.builderSeries.flatMap((series) => {
              return series.dataPoints
                .filter((point) => point.volume > 0) // Only render bars with volume > 0
                .map((point, pointIndex) => {
                  const height = maxVolume > 0 
                    ? (point.volume / maxVolume) * CHART_HEIGHT 
                    : 0;
                  const pixelHeight = Math.max(Math.ceil(height / PIXEL_SIZE) * PIXEL_SIZE, PIXEL_SIZE);
                  const dateIndex = processedData.allDates.indexOf(point.date);
                  
                  if (dateIndex === -1) {
                    console.warn(`⚠️ Date ${point.date} not found in allDates`);
                    return null;
                  }
                  
                  const x = dateIndex * (PIXEL_SIZE + GAP);
                  const y = CHART_HEIGHT - pixelHeight;

                  return (
                    <rect
                      key={`${series.builder}-${point.date}-${pointIndex}`}
                      x={x}
                      y={y}
                      width={PIXEL_SIZE}
                      height={pixelHeight}
                      fill={series.color}
                      style={{
                        imageRendering: "pixelated",
                        filter: "url(#pixel-glow)",
                        stroke: "rgba(0, 0, 0, 0.3)",
                        strokeWidth: "0.5",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const container = e.currentTarget.closest('div');
                        if (container) {
                          const containerRect = container.getBoundingClientRect();
                          const pointRect = e.currentTarget.getBoundingClientRect();
                          const totalVolumeForDate = processedData.dateTotals?.get(point.date) || 0;
                          
                          // Get all builders for this date
                          const buildersForDate = processedData.builderSeries
                            .map(series => {
                              const datePoint = series.dataPoints.find(p => p.date === point.date);
                              if (datePoint && datePoint.volume > 0) {
                                return {
                                  builder: series.builder,
                                  volume: datePoint.volume,
                                  color: series.color,
                                };
                              }
                              return null;
                            })
                            .filter((b): b is { builder: string; volume: number; color: string } => b !== null)
                            .sort((a, b) => b.volume - a.volume); // Sort by volume descending
                          
                          setTooltip({
                            date: point.date,
                            builders: buildersForDate,
                            totalVolume: totalVolumeForDate,
                            x: pointRect.left - containerRect.left + pointRect.width / 2,
                            y: pointRect.top - containerRect.top,
                          });
                        }
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        const container = e.currentTarget.closest('div');
                        if (container && e.touches && e.touches.length > 0) {
                          const containerRect = container.getBoundingClientRect();
                          const touch = e.touches[0];
                          const totalVolumeForDate = processedData.dateTotals?.get(point.date) || 0;
                          
                          // Get all builders for this date
                          const buildersForDate = processedData.builderSeries
                            .map(series => {
                              const datePoint = series.dataPoints.find(p => p.date === point.date);
                              if (datePoint && datePoint.volume > 0) {
                                return {
                                  builder: series.builder,
                                  volume: datePoint.volume,
                                  color: series.color,
                                };
                              }
                              return null;
                            })
                            .filter((b): b is { builder: string; volume: number; color: string } => b !== null)
                            .sort((a, b) => b.volume - a.volume); // Sort by volume descending
                          
                          setTooltip({
                            date: point.date,
                            builders: buildersForDate,
                            totalVolume: totalVolumeForDate,
                            x: touch.clientX - containerRect.left,
                            y: touch.clientY - containerRect.top,
                          });
                        }
                      }}
                    />
                  );
                })
                .filter((rect): rect is JSX.Element => rect !== null);
            })}

            {/* X-axis labels - show dates */}
            {processedData.allDates
              .filter((_, index) => {
                // Show fewer labels on mobile
                const step = isMobile 
                  ? Math.max(1, Math.floor(processedData.allDates.length / 5))
                  : Math.max(1, Math.floor(processedData.allDates.length / 10));
                return index % step === 0;
              })
              .map((date) => {
                const dateIndex = processedData.allDates.indexOf(date);
                const x = dateIndex * (PIXEL_SIZE + GAP) + PIXEL_SIZE / 2;
                const dateObj = new Date(date);
                return (
                  <text
                    key={`label-${date}`}
                    x={x}
                    y={CHART_HEIGHT + (isMobile ? 16 : 20)}
                    textAnchor="middle"
                    className={isMobile ? 'text-[8px]' : 'text-[9px]'}
                    style={{ fill: '#6b7280' }}
                  >
                    {dateObj.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </text>
                );
              })}
          </svg>
          
          {/* Tooltip */}
          {tooltip && (
            <div
              ref={tooltipRef}
              className="absolute pointer-events-auto z-50 bg-gray-900/95 border border-gray-700 rounded px-2 md:px-3 py-1.5 md:py-2 shadow-lg"
              style={{
                ...tooltipStyle,
                minWidth: isMobile ? '160px' : '200px',
                maxWidth: isMobile ? '250px' : '300px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <style>{`
                .tooltip-scroll::-webkit-scrollbar {
                  display: none;
                }
                .tooltip-scroll {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              <div className={isMobile ? 'text-[10px] space-y-1' : 'text-xs space-y-1.5'}>
                <div className={`font-bold text-white ${isMobile ? 'mb-0.5 text-[10px]' : 'mb-1'}`}>
                  {new Date(tooltip.date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: isMobile ? undefined : "numeric",
                  })}
                </div>
                
                {/* All Builders */}
                <div className={`space-y-0.5 md:space-y-1 ${isMobile ? 'max-h-32' : 'max-h-48'} overflow-y-auto tooltip-scroll`}>
                  {tooltip.builders.map((builder) => (
                    <div key={builder.builder} className={`flex items-center justify-between gap-1 md:gap-2 ${isMobile ? 'py-0.5' : 'py-1'}`}>
                      <div className="flex items-center gap-1 md:gap-1.5 flex-1 min-w-0">
                        <div
                          className={isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5'}
                          style={{
                            backgroundColor: builder.color,
                            border: '1px solid #4b5563',
                            imageRendering: "pixelated",
                          }}
                        />
                        <span className={`text-gray-300 ${isMobile ? 'text-[9px]' : 'text-[10px]'} truncate`}>{builder.builder}</span>
                      </div>
                      <span className={`text-green-400 font-semibold ${isMobile ? 'text-[9px]' : 'text-[10px]'} whitespace-nowrap`}>
                        ${(builder.volume / 1_000_000).toFixed(2)}M
                      </span>
                    </div>
                  ))}
                </div>
                
                 {/* Total Volume */}
                 <div className={`border-t border-gray-700 ${isMobile ? 'pt-1 mt-1' : 'pt-1.5 mt-1.5'}`}>
                   <div className="flex items-center justify-between">
                     <div className={`text-gray-400 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>Total Volume</div>
                     <div className={`text-blue-400 font-semibold ${isMobile ? 'text-[10px]' : 'text-[11px]'}`}>
                       ${(tooltip.totalVolume / 1_000_000).toFixed(2)}M
                     </div>
                   </div>
                 </div>
              </div>
              {/* Tooltip arrow */}
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-700"
              />
            </div>
          )}
        </div>
      )}

    </div>
  );
}

