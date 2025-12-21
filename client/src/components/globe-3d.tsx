import { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import { useQuery } from '@tanstack/react-query';
import * as THREE from 'three';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GlobeMarker {
  id: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
  type: 'account' | 'bet';
  data?: any;
  country?: string;
  count?: number;
  volume?: number;
}

interface CountryPolygon {
  properties: {
    NAME?: string;
    NAME_LONG?: string;
    ISO_A2?: string;
    [key: string]: any; // Allow additional properties
  };
  geometry: any;
  heatValue?: number;
  betCount?: number;
  betVolume?: number;
  accountCount?: number;
}

interface Globe3DProps {
  height?: string;
  width?: string;
}


// Mock verified accounts data (API endpoints removed to reduce serverless function count)
const fetchVerifiedAccounts = async (): Promise<GlobeMarker[]> => {
  // Return sample data for major trading hubs
  const mockData = [
    { country: 'United States', lat: 37.0902, lng: -95.7129, accountCount: 150, totalVolume: 5000000 },
    { country: 'United Kingdom', lat: 51.5074, lng: -0.1278, accountCount: 80, totalVolume: 2500000 },
    { country: 'Germany', lat: 51.1657, lng: 10.4515, accountCount: 60, totalVolume: 1800000 },
    { country: 'France', lat: 46.2276, lng: 2.2137, accountCount: 50, totalVolume: 1500000 },
    { country: 'Japan', lat: 36.2048, lng: 138.2529, accountCount: 45, totalVolume: 1200000 },
    { country: 'Singapore', lat: 1.3521, lng: 103.8198, accountCount: 40, totalVolume: 1000000 },
    { country: 'Australia', lat: -25.2744, lng: 133.7751, accountCount: 35, totalVolume: 900000 },
  ];
  
  return mockData.map((country) => {
    const size = Math.min(2.0, Math.max(0.5, 0.5 + (country.accountCount / 20)));
    
    return {
      id: `country-account-${country.country}`,
      lat: country.lat,
      lng: country.lng,
      size,
      color: '#ffffff',
      label: country.country,
      type: 'account' as const,
      country: country.country,
      count: country.accountCount,
      volume: country.totalVolume,
      data: {
        country: country.country,
        accounts: [],
        accountCount: country.accountCount,
        totalVolume: country.totalVolume,
      },
    };
  });
};

// Mock live bets data (API endpoints removed to reduce serverless function count)
const fetchLiveBets = async (): Promise<GlobeMarker[]> => {
  // Return sample data for active trading regions
  const mockData = [
    { country: 'United States', lat: 37.0902, lng: -95.7129, betCount: 250, totalVolume: 8000000 },
    { country: 'United Kingdom', lat: 51.5074, lng: -0.1278, betCount: 120, totalVolume: 3500000 },
    { country: 'Germany', lat: 51.1657, lng: 10.4515, betCount: 90, totalVolume: 2800000 },
    { country: 'France', lat: 46.2276, lng: 2.2137, betCount: 75, totalVolume: 2200000 },
    { country: 'Canada', lat: 56.1304, lng: -106.3468, betCount: 65, totalVolume: 1900000 },
    { country: 'Netherlands', lat: 52.1326, lng: 5.2913, betCount: 55, totalVolume: 1600000 },
    { country: 'Switzerland', lat: 46.8182, lng: 8.2275, betCount: 50, totalVolume: 1500000 },
  ];
  
  const countryData = mockData;
    
    // Convert country-grouped data to markers
    return countryData.map((country: any) => {
      // Size based on bet volume (min 0.4, max 1.8)
      const size = Math.min(1.8, Math.max(0.4, 0.4 + (country.totalVolume / 10000)));
      
      return {
        id: `country-bet-${country.country}`,
        lat: country.lat,
        lng: country.lng,
        size,
        color: '#ffffff', // White for all bets
        label: country.country,
        type: 'bet' as const,
        country: country.country,
        count: country.betCount,
        volume: country.totalVolume,
        data: {
          country: country.country,
          bets: country.bets,
          betCount: country.betCount,
          totalVolume: country.totalVolume,
        },
      };
    });
  } catch (error) {
    console.error('Failed to fetch live bets:', error);
    return [];
  }
};

export function Globe3D({ height = '600px', width = '100%' }: Globe3DProps) {
  const globeEl = useRef<any>(null);
  const [markers, setMarkers] = useState<GlobeMarker[]>([]);
  const [hoveredMarker, setHoveredMarker] = useState<GlobeMarker | null>(null);
  const [countryPolygons, setCountryPolygons] = useState<CountryPolygon[]>([]);
  const [countryActivity, setCountryActivity] = useState<Map<string, { betCount: number; betVolume: number; accountCount: number }>>(new Map());
  const [selectedCountry, setSelectedCountry] = useState<CountryPolygon | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [countryInfo, setCountryInfo] = useState<any>(null);
  const [loadingCountryInfo, setLoadingCountryInfo] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'bets' | 'accounts'>('all');

  // Fetch verified accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ['globe-verified-accounts'],
    queryFn: fetchVerifiedAccounts,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch live bets
  const { data: bets = [] } = useQuery({
    queryKey: ['globe-live-bets'],
    queryFn: fetchLiveBets,
    refetchInterval: 10000, // Refresh every 10 seconds for real-time feel
  });

  // Combine markers based on view mode
  useEffect(() => {
    let filteredMarkers: GlobeMarker[] = [];
    if (viewMode === 'all') {
      filteredMarkers = [...accounts, ...bets];
    } else if (viewMode === 'bets') {
      filteredMarkers = bets;
    } else if (viewMode === 'accounts') {
      filteredMarkers = accounts;
    }
    setMarkers(filteredMarkers);
  }, [accounts, bets, viewMode]);

  // Build country activity map from bets and accounts
  useEffect(() => {
    const activityMap = new Map<string, { betCount: number; betVolume: number; accountCount: number }>();
    
    // Add bet data
    bets.forEach((bet) => {
      if (bet.country) {
        const existing = activityMap.get(bet.country) || { betCount: 0, betVolume: 0, accountCount: 0 };
        activityMap.set(bet.country, {
          betCount: existing.betCount + (bet.count || 0),
          betVolume: existing.betVolume + (bet.volume || 0),
          accountCount: existing.accountCount,
        });
      }
    });
    
    // Add account data
    accounts.forEach((account) => {
      if (account.country) {
        const existing = activityMap.get(account.country) || { betCount: 0, betVolume: 0, accountCount: 0 };
        activityMap.set(account.country, {
          betCount: existing.betCount,
          betVolume: existing.betVolume + (account.volume || 0),
          accountCount: existing.accountCount + (account.count || 0),
        });
      }
    });
    
    setCountryActivity(activityMap);
  }, [bets, accounts]);

  // Load country borders GeoJSON
  useEffect(() => {
    const loadCountryBorders = async () => {
      try {
        // Using a simplified world countries GeoJSON from a CDN
        const response = await fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson');
        if (!response.ok) {
          console.warn('Failed to load country borders, using fallback');
          return;
        }
        
        const geoData = await response.json();
        if (geoData && geoData.features) {
          // Match countries with activity data and add heat values
          const polygons = geoData.features.map((feature: any) => {
            const countryName = feature.properties.NAME || feature.properties.NAME_LONG || '';
            // Try multiple name variations for matching
            let activity = countryActivity.get(countryName);
            if (!activity) {
              // Try alternative names
              const altNames: Record<string, string> = {
                'United States of America': 'United States',
                'USA': 'United States',
                'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
                'UK': 'United Kingdom',
                'Russian Federation': 'Russia',
                'Korea, Republic of': 'South Korea',
                'Korea, Democratic People\'s Republic of': 'North Korea',
              };
              const altName = altNames[countryName];
              if (altName) {
                activity = countryActivity.get(altName);
              }
            }
            
            // Calculate heat value (0-1) based on bet volume and count
            let heatValue = 0;
            if (activity) {
              // Normalize: bet volume (0-1) + bet count (0-1) + account count (0-1)
              const maxVolume = Math.max(...Array.from(countryActivity.values()).map(a => a.betVolume), 1);
              const maxCount = Math.max(...Array.from(countryActivity.values()).map(a => a.betCount), 1);
              const maxAccounts = Math.max(...Array.from(countryActivity.values()).map(a => a.accountCount), 1);
              
              const volumeNorm = maxVolume > 0 ? Math.min(activity.betVolume / maxVolume, 1) : 0;
              const countNorm = maxCount > 0 ? Math.min(activity.betCount / maxCount, 1) : 0;
              const accountsNorm = maxAccounts > 0 ? Math.min(activity.accountCount / maxAccounts, 1) : 0;
              
              // Weighted combination: 50% volume, 30% count, 20% accounts
              heatValue = (volumeNorm * 0.5) + (countNorm * 0.3) + (accountsNorm * 0.2);
            }
            
            return {
              ...feature,
              heatValue,
              betCount: activity?.betCount || 0,
              betVolume: activity?.betVolume || 0,
              accountCount: activity?.accountCount || 0,
            };
          });
          
          setCountryPolygons(polygons);
        }
      } catch (error) {
        console.error('Error loading country borders:', error);
      }
    };
    
    loadCountryBorders();
  }, [countryActivity]);

  // Initialize globe
  useEffect(() => {
    if (globeEl.current) {
      try {
        const controls = globeEl.current.controls();
        if (controls) {
          controls.autoRotate = false; // Disable auto-rotate
        }
        globeEl.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 0);
        
        // Set black background for the scene
        try {
          const scene = globeEl.current.scene();
          if (scene && scene.background !== undefined) {
            const Three = (window as any).THREE || THREE;
            if (Three && Three.Color) {
              scene.background = new Three.Color(0x000000);
            }
          }
        } catch (sceneError) {
          console.warn('Could not set scene background:', sceneError);
        }

      } catch (error) {
        console.warn('Globe initialization error:', error);
      }
    }
  }, []);

  return (
    <div className="relative w-full h-full bg-black" style={{ height, width, imageRendering: 'pixelated', pointerEvents: 'auto' }}>
      {/* View Mode Selector */}
      <div className="absolute top-6 left-6 z-10 bg-black border-2 border-white p-3" style={{ imageRendering: 'pixelated', boxShadow: '4px 4px 0px #ffffff' }}>
        <div className="font-black text-xs mb-2 text-white uppercase tracking-wider font-mono" style={{ letterSpacing: '1px' }}>
          VIEW MODE
        </div>
        <Select value={viewMode} onValueChange={(value: 'all' | 'bets' | 'accounts') => setViewMode(value)}>
          <SelectTrigger className="w-full bg-black border-2 border-white text-white font-mono text-xs uppercase tracking-wide h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-black border-2 border-white">
            <SelectItem value="all" className="text-white font-mono uppercase focus:bg-gray-800 focus:text-white">
              ALL LOCATIONS
            </SelectItem>
            <SelectItem value="bets" className="text-white font-mono uppercase focus:bg-gray-800 focus:text-white">
              LIVE BETS
            </SelectItem>
            <SelectItem value="accounts" className="text-white font-mono uppercase focus:bg-gray-800 focus:text-white">
              VERIFIED ACCOUNTS
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundColor="#000000"
        backgroundImageUrl=""
        pointsData={markers}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointRadius="size"
        showGlobe={true}
        showAtmosphere={false}
        polygonsData={countryPolygons}
        polygonAltitude={(d: any) => {
          // Create 3D heatmap effect: higher countries = more activity
          return d.heatValue ? d.heatValue * 0.15 : 0; // Max 0.15 altitude
        }}
        polygonCapColor={(d: any) => {
          // Subtle white glow: light gray/white for all regions, slightly brighter for activity
          if (!d.heatValue || d.heatValue === 0) {
            return 'rgba(200, 200, 200, 0.15)'; // Subtle white for no activity
          }
          // Interpolate from subtle white to slightly brighter white based on heat value
          const intensity = d.heatValue;
          // Keep it in the subtle white range (200-255) instead of going to pure white
          const r = Math.floor(200 + (intensity * 55)); // 200-255 range
          const g = Math.floor(200 + (intensity * 55));
          const b = Math.floor(200 + (intensity * 55));
          // Lower opacity range: 0.15 to 0.35 for subtlety
          return `rgba(${r}, ${g}, ${b}, ${0.15 + (intensity * 0.2)})`;
        }}
        polygonSideColor={(d: any) => {
          // Subtle side color for 3D effect
          if (!d.heatValue || d.heatValue === 0) {
            return 'rgba(180, 180, 180, 0.1)'; // Subtle gray-white
          }
          const intensity = d.heatValue;
          const r = Math.floor(180 + (intensity * 75)); // 180-255 range
          const g = Math.floor(180 + (intensity * 75));
          const b = Math.floor(180 + (intensity * 75));
          // Lower opacity for sides
          return `rgba(${r}, ${g}, ${b}, ${0.1 + (intensity * 0.15)})`;
        }}
        polygonStrokeColor={() => 'rgba(255, 255, 255, 0.3)'} // Subtle white borders
        onPolygonClick={async (polygon: any) => {
          // Handle country click - open sheet with details
          console.log('Polygon clicked (full object):', JSON.stringify(polygon, null, 2));
          console.log('Polygon properties keys:', polygon?.properties ? Object.keys(polygon.properties) : 'no properties');
          console.log('Polygon properties values:', polygon?.properties);
          console.log('Available country polygons:', countryPolygons.length);
          
          if (polygon) {
            // The polygon from react-globe.gl might have a different structure
            // Try to find the matching polygon from our stored polygons
            let countryPolygon = polygon;
            
            // Try to match by ISO code first
            const clickedIso = polygon.properties?.ISO_A2 || polygon.properties?.iso_a2 || polygon.properties?.ISO_A2;
            if (clickedIso) {
              const matched = countryPolygons.find((p: any) => 
                (p.properties?.ISO_A2 || p.properties?.iso_a2) === clickedIso
              );
              if (matched) {
                countryPolygon = matched;
                console.log('Matched polygon by ISO code:', clickedIso);
              }
            }
            
            // Try to match by name - check all possible name fields
            const clickedName = polygon.properties?.NAME || 
                               polygon.properties?.NAME_LONG || 
                               polygon.properties?.name ||
                               polygon.properties?.NAME_EN ||
                               '';
            
            if (clickedName && (!countryPolygon.properties || !countryPolygon.properties.NAME)) {
              const matched = countryPolygons.find((p: any) => {
                const pName = p.properties?.NAME || p.properties?.NAME_LONG || p.properties?.name || '';
                return pName === clickedName || pName.toLowerCase() === clickedName.toLowerCase();
              });
              if (matched) {
                countryPolygon = matched;
                console.log('Matched polygon by name:', clickedName);
              }
            }
            
            // If still no match, use the clicked polygon but ensure it has the right structure
            if (!countryPolygon.properties && polygon.properties) {
              countryPolygon = {
                ...polygon,
                properties: polygon.properties,
                heatValue: polygon.heatValue || 0,
                betCount: polygon.betCount || 0,
                betVolume: polygon.betVolume || 0,
                accountCount: polygon.accountCount || 0,
              };
            }
            
            console.log('Final country polygon properties:', countryPolygon?.properties);
            console.log('Final country polygon:', countryPolygon);
            setSelectedCountry(countryPolygon);
            setIsSheetOpen(true);
            
            // Fetch additional country information
            const countryCode = countryPolygon.properties?.ISO_A2 || 
                               countryPolygon.properties?.iso_a2 ||
                               polygon.properties?.ISO_A2 ||
                               polygon.properties?.iso_a2;
            if (countryCode) {
              setLoadingCountryInfo(true);
              try {
                const response = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
                if (response.ok) {
                  const data = await response.json();
                  setCountryInfo(data[0] || null);
                  console.log('Fetched country info:', data[0]);
                }
              } catch (error) {
                console.warn('Failed to fetch country info:', error);
              } finally {
                setLoadingCountryInfo(false);
              }
            }
          }
        }}
        onPointClick={async (point: any) => {
          // Handle point click - also open sheet with country details
          if (point && point.country) {
            // Find the polygon for this country
            const countryPolygon = countryPolygons.find((p: any) => {
              const countryName = p.properties.NAME || p.properties.NAME_LONG || '';
              return countryName === point.country || 
                     countryName.toLowerCase() === point.country.toLowerCase();
            });
            if (countryPolygon) {
              setSelectedCountry(countryPolygon);
              setIsSheetOpen(true);
              
              // Fetch additional country information
              const countryCode = countryPolygon.properties.ISO_A2;
              if (countryCode) {
                setLoadingCountryInfo(true);
                try {
                  const response = await fetch(`https://restcountries.com/v3.1/alpha/${countryCode}`);
                  if (response.ok) {
                    const data = await response.json();
                    setCountryInfo(data[0] || null);
                  }
                } catch (error) {
                  console.warn('Failed to fetch country info:', error);
                } finally {
                  setLoadingCountryInfo(false);
                }
              }
            }
          }
        }}
        polygonLabel={(d: any) => {
          if (!d.heatValue || d.heatValue === 0) return '';
          const countryName = d.properties.NAME || d.properties.NAME_LONG || 'Unknown';
          return `
            <div style="
              background: #000000;
              color: #ffffff;
              padding: 8px 10px;
              border: 2px solid #ffffff;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              max-width: 250px;
              image-rendering: pixelated;
              box-shadow: 4px 4px 0px #ffffff;
            ">
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; letter-spacing: 1px;">${countryName}</div>
              <div style="font-size: 10px; color: #ffffff; font-family: monospace; margin-bottom: 2px;">
                [ACTIVITY HEATMAP]
              </div>
              ${d.betCount > 0 ? `<div style="font-size: 9px; color: #888888; font-family: monospace;">${d.betCount} bets</div>` : ''}
              ${d.betVolume > 0 ? `<div style="font-size: 9px; color: #888888; font-family: monospace;">$${((d.betVolume || 0)).toFixed(2)} volume</div>` : ''}
              ${d.accountCount > 0 ? `<div style="font-size: 9px; color: #888888; font-family: monospace;">${d.accountCount} accounts</div>` : ''}
              <div style="font-size: 9px; color: #888888; font-family: monospace; margin-top: 4px;">
                Intensity: ${(d.heatValue * 100).toFixed(0)}%
              </div>
            </div>
          `;
        }}
        pointLabel={(d: any) => {
          if (!d) return '';
          return `
            <div style="
              background: #000000;
              color: #ffffff;
              padding: 8px 10px;
              border: 2px solid #ffffff;
              font-family: 'Courier New', monospace;
              font-size: 11px;
              max-width: 250px;
              image-rendering: pixelated;
              box-shadow: 4px 4px 0px #ffffff;
            ">
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; letter-spacing: 1px;">${d.country || d.label || 'MARKER'}</div>
              ${d.type === 'account' ? `
                <div style="font-size: 10px; color: #ffffff; font-family: monospace; margin-bottom: 2px;">
                  [VERIFIED ACCOUNTS]
                </div>
                <div style="font-size: 9px; color: #888888; font-family: monospace;">
                  ${d.count || d.data?.accountCount || 0} accounts
                </div>
                ${d.volume || d.data?.totalVolume ? `<div style="font-size: 9px; color: #888888; font-family: monospace;">$${((d.volume || d.data?.totalVolume || 0) / 1000000).toFixed(2)}M volume</div>` : ''}
              ` : `
                <div style="font-size: 10px; color: #ffffff; font-family: monospace; margin-bottom: 2px;">
                  [LIVE BETS]
                </div>
                <div style="font-size: 9px; color: #888888; font-family: monospace;">
                  ${d.count || d.data?.betCount || 0} bets
                </div>
                ${d.volume || d.data?.totalVolume ? `<div style="font-size: 9px; color: #888888; font-family: monospace;">$${((d.volume || d.data?.totalVolume || 0)).toFixed(2)} volume</div>` : ''}
              `}
            </div>
          `;
        }}
        onPointHover={(point: any) => setHoveredMarker(point || null)}
        pointResolution={1}
        pointsMerge={false}
        pointAltitude={0.01}
      />
      
      {/* Cyberpunk Legend */}
      <div className="absolute bottom-6 left-6 bg-black border-2 border-white p-4" style={{ imageRendering: 'pixelated', boxShadow: '4px 4px 0px #ffffff' }}>
        <div className="font-black text-sm mb-3 text-white uppercase tracking-wider font-mono" style={{ letterSpacing: '2px' }}>LEGEND</div>
        <div className="space-y-2">
          {viewMode === 'all' && (
            <>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-white border border-white"></div>
                <span className="text-xs font-mono text-white uppercase tracking-wide">VERIFIED ACCOUNTS</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-white border border-white"></div>
                <span className="text-xs font-mono text-white uppercase tracking-wide">LIVE BETS</span>
              </div>
            </>
          )}
          {viewMode === 'bets' && (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white border border-white"></div>
              <span className="text-xs font-mono text-white uppercase tracking-wide">LIVE BETS</span>
            </div>
          )}
          {viewMode === 'accounts' && (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white border border-white"></div>
              <span className="text-xs font-mono text-white uppercase tracking-wide">VERIFIED ACCOUNTS</span>
            </div>
          )}
          <div className="text-xs font-mono text-white uppercase tracking-wide mt-2 pt-2 border-t border-white">
            <div>MARKER SIZE = ACTIVITY</div>
          </div>
          <div className="text-xs font-mono text-white uppercase tracking-wide mt-2 pt-2 border-t border-white">
            <div>HEATMAP = VOLUME</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-8 h-2 bg-gray-800 border border-white"></div>
              <span className="text-[10px]">LOW</span>
              <div className="w-8 h-2 bg-gray-400 border border-white"></div>
              <div className="w-8 h-2 bg-white border border-white"></div>
              <span className="text-[10px]">HIGH</span>
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t-2 border-white text-xs text-white font-mono">
          <div className="flex items-center justify-between uppercase tracking-wide">
            <span>{markers.length} MARKERS</span>
            {viewMode === 'all' && (
              <>
                <span className="text-white">{accounts.reduce((sum, acc) => sum + (acc.count || 0), 0)} ACC</span>
                <span className="text-white">{bets.reduce((sum, bet) => sum + (bet.count || 0), 0)} BETS</span>
              </>
            )}
            {viewMode === 'bets' && (
              <span className="text-white">{bets.reduce((sum, bet) => sum + (bet.count || 0), 0)} BETS</span>
            )}
            {viewMode === 'accounts' && (
              <span className="text-white">{accounts.reduce((sum, acc) => sum + (acc.count || 0), 0)} ACC</span>
            )}
          </div>
        </div>
      </div>

      {/* Cyberpunk Hover info */}
      {hoveredMarker && (
        <div className="absolute top-6 right-6 bg-black border-2 border-white p-4 max-w-xs font-mono" style={{ imageRendering: 'pixelated', boxShadow: '4px 4px 0px #ffffff' }}>
          <div className="font-black text-sm text-white mb-3 uppercase tracking-wider" style={{ letterSpacing: '1px' }}>
            {hoveredMarker.country || hoveredMarker.label}
          </div>
          {hoveredMarker.type === 'account' && hoveredMarker.data && (
            <div className="text-xs text-white space-y-2 uppercase tracking-wide">
              <div className="border-b border-white pb-2">
                <div className="text-white">[VERIFIED ACCOUNTS]</div>
                <div className="text-white font-black mt-1">{hoveredMarker.count || hoveredMarker.data.accountCount || 0} ACCOUNTS</div>
              </div>
              {hoveredMarker.volume || hoveredMarker.data.totalVolume ? (
                <div className="border-b border-white pb-2">
                  <div className="text-white mb-1">TOTAL VOLUME:</div>
                  <div className="text-white font-black">${((hoveredMarker.volume || hoveredMarker.data.totalVolume || 0) / 1000000).toFixed(2)}M</div>
                </div>
              ) : null}
              {hoveredMarker.data.accounts && hoveredMarker.data.accounts.length > 0 && (
                <div>
                  <div className="text-white mb-1">TOP ACCOUNTS:</div>
                  {hoveredMarker.data.accounts.slice(0, 3).map((acc: any, idx: number) => (
                    <div key={idx} className="text-white text-[10px]">
                      {acc.xUsername ? `@${acc.xUsername}` : acc.username || 'Unknown'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {hoveredMarker.type === 'bet' && hoveredMarker.data && (
            <div className="text-xs text-white space-y-2 uppercase tracking-wide">
              <div className="border-b border-white pb-2">
                <div className="text-white">[LIVE BETS]</div>
                <div className="text-white font-black mt-1">{hoveredMarker.count || hoveredMarker.data.betCount || 0} BETS</div>
              </div>
              {hoveredMarker.volume || hoveredMarker.data.totalVolume ? (
                <div className="border-b border-white pb-2">
                  <div className="text-white mb-1">TOTAL VOLUME:</div>
                  <div className="text-white font-black">${(hoveredMarker.volume || hoveredMarker.data.totalVolume || 0).toFixed(2)}</div>
                </div>
              ) : null}
              {hoveredMarker.data.bets && hoveredMarker.data.bets.length > 0 && (
                <div>
                  <div className="text-white mb-1">RECENT BETS:</div>
                  {hoveredMarker.data.bets.slice(0, 2).map((bet: any, idx: number) => (
                    <div key={idx} className="text-white text-[10px] mb-1">
                      {bet.marketName} - ${bet.size?.toFixed(2) || '0.00'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Country Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-black overflow-y-auto" style={{ imageRendering: 'pixelated', borderWidth: '0.5px', borderColor: 'rgba(0, 0, 0, 0)', borderImage: 'none' }}>
          {selectedCountry && (
            <>
              {/* Country Name Header */}
              <SheetHeader className="border-b-2 border-white pb-4 mb-4">
                <SheetTitle className="text-white font-black text-2xl uppercase tracking-wider font-mono" style={{ letterSpacing: '3px', color: '#ffffff !important' }}>
                  {(() => {
                    // Try multiple ways to get country name
                    const name = selectedCountry?.properties?.NAME || 
                                 selectedCountry?.properties?.NAME_LONG || 
                                 selectedCountry?.properties?.name ||
                                 selectedCountry?.properties?.NAME_EN ||
                                 (countryInfo?.name?.common as string) ||
                                 '';
                    console.log('Displaying country name:', name, 'from properties:', selectedCountry?.properties);
                    return name || 'UNKNOWN COUNTRY';
                  })()}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Country details and activity information for {selectedCountry?.properties?.NAME || 'selected country'}
                </SheetDescription>
                {(selectedCountry?.properties?.NAME_LONG || countryInfo?.name?.official) && 
                 (selectedCountry?.properties?.NAME_LONG !== selectedCountry?.properties?.NAME) && (
                  <div className="text-white text-sm font-mono uppercase tracking-wide mt-2" style={{ letterSpacing: '1px' }}>
                    {selectedCountry?.properties?.NAME_LONG || countryInfo?.name?.official}
                  </div>
                )}
                {(selectedCountry?.properties?.ISO_A2 || countryInfo?.cca2) && (
                  <div className="text-gray-400 text-xs font-mono uppercase tracking-wide mt-1">
                    ISO CODE: {selectedCountry?.properties?.ISO_A2 || countryInfo?.cca2}
                  </div>
                )}
              </SheetHeader>
              
              <div className="space-y-6 font-mono text-white">
                {/* Activity Overview */}
                <div className="bg-black border-2 border-white p-4" style={{ boxShadow: '4px 4px 0px #ffffff' }}>
                  <div className="font-black text-sm mb-3 uppercase tracking-wider" style={{ letterSpacing: '1px' }}>
                    ACTIVITY OVERVIEW
                  </div>
                  <div className="space-y-3 text-xs uppercase tracking-wide">
                    <div className="flex justify-between border-b border-white pb-2">
                      <span>HEAT INTENSITY:</span>
                      <span className="font-black text-white">{((selectedCountry?.heatValue || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between border-b border-white pb-2">
                      <span>BET COUNT:</span>
                      <span className="font-black text-white">{selectedCountry?.betCount || 0}</span>
                    </div>
                    <div className="flex justify-between border-b border-white pb-2">
                      <span>BET VOLUME:</span>
                      <span className="font-black text-white">${((selectedCountry?.betVolume || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-b border-white pb-2">
                      <span>VERIFIED ACCOUNTS:</span>
                      <span className="font-black text-white">{selectedCountry?.accountCount || 0}</span>
                    </div>
                    {selectedCountry?.betVolume && selectedCountry.betVolume > 0 && (
                      <div className="flex justify-between border-b border-white pb-2">
                        <span>AVG BET SIZE:</span>
                        <span className="font-black text-white">
                          ${(selectedCountry.betCount || 0) > 0 
                            ? ((selectedCountry.betVolume || 0) / (selectedCountry.betCount || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '0.00'}
                        </span>
                      </div>
                    )}
                    {selectedCountry?.accountCount && selectedCountry.accountCount > 0 && selectedCountry?.betVolume && (
                      <div className="flex justify-between">
                        <span>VOLUME PER ACCOUNT:</span>
                        <span className="font-black text-white">
                          ${((selectedCountry.betVolume || 0) / (selectedCountry.accountCount || 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

              {/* Get detailed data for this country */}
              {(() => {
                // Try multiple ways to get the country name
                const countryName = selectedCountry?.properties?.NAME || 
                                   selectedCountry?.properties?.NAME_LONG || 
                                   (countryInfo?.name?.common as string) ||
                                   '';
                
                console.log('Selected country object:', selectedCountry);
                console.log('Selected country name:', countryName);
                console.log('Selected country properties:', selectedCountry?.properties);
                console.log('Country info from API:', countryInfo);
                console.log('Available accounts:', accounts.map(a => a.country));
                console.log('Available bets:', bets.map(b => b.country));
                console.log('Country polygons count:', countryPolygons.length);
                
                // Try to match country name with variations
                const altNames: Record<string, string> = {
                  'United States of America': 'United States',
                  'USA': 'United States',
                  'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
                  'UK': 'United Kingdom',
                  'Russian Federation': 'Russia',
                  'Korea, Republic of': 'South Korea',
                  'Korea, Democratic People\'s Republic of': 'North Korea',
                };
                
                const normalizedName = altNames[countryName] || countryName;
                
                // Find matching account and bet data - try multiple matching strategies
                const accountData = accounts.find(acc => {
                  const accCountry = acc.country?.toLowerCase() || '';
                  const searchName = countryName?.toLowerCase() || '';
                  const searchNormalized = normalizedName?.toLowerCase() || '';
                  
                  return acc.country === countryName || 
                         acc.country === normalizedName ||
                         accCountry === searchName ||
                         accCountry === searchNormalized ||
                         accCountry.includes(searchName) ||
                         searchName.includes(accCountry);
                });
                
                const betData = bets.find(bet => {
                  const betCountry = bet.country?.toLowerCase() || '';
                  const searchName = countryName?.toLowerCase() || '';
                  const searchNormalized = normalizedName?.toLowerCase() || '';
                  
                  return bet.country === countryName || 
                         bet.country === normalizedName ||
                         betCountry === searchName ||
                         betCountry === searchNormalized ||
                         betCountry.includes(searchName) ||
                         searchName.includes(betCountry);
                });
                
                console.log('Matched account data:', accountData);
                console.log('Matched bet data:', betData);
                
                return (
                  <>
                    {/* Verified Accounts Details */}
                    {accountData && accountData.data?.accounts && accountData.data.accounts.length > 0 && (
                      <div className="bg-black border-2 border-white p-4" style={{ boxShadow: '4px 4px 0px #ffffff' }}>
                        <div className="font-black text-sm mb-3 uppercase tracking-wider" style={{ letterSpacing: '1px' }}>
                          VERIFIED ACCOUNTS ({accountData.data.accounts.length})
                        </div>
                        <div className="space-y-3 text-xs uppercase tracking-wide max-h-96 overflow-y-auto">
                          {accountData.data.accounts.map((acc: any, idx: number) => (
                            <div key={idx} className="border-b-2 border-white pb-3 last:border-0">
                              <div className="font-black text-white mb-2">
                                {acc.xUsername ? `@${acc.xUsername}` : acc.username || 'Unknown'}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-gray-400">
                                {acc.rank && (
                                  <div>
                                    <span className="text-gray-500">RANK:</span>
                                    <span className="text-white ml-2 font-black">#{acc.rank}</span>
                                  </div>
                                )}
                                {acc.wallet && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">WALLET:</span>
                                    <span className="text-white ml-2 font-mono text-[10px] break-all">{acc.wallet}</span>
                                  </div>
                                )}
                                {acc.volume && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">VOLUME:</span>
                                    <span className="text-white ml-2 font-black">
                                      ${(parseFloat(acc.volume) / 1000000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M
                                    </span>
                                  </div>
                                )}
                                {acc.username && acc.xUsername && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">USERNAME:</span>
                                    <span className="text-white ml-2">{acc.username}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Live Bets Details */}
                    {betData && betData.data?.bets && betData.data.bets.length > 0 && (
                      <div className="bg-black border-2 border-white p-4" style={{ boxShadow: '4px 4px 0px #ffffff' }}>
                        <div className="font-black text-sm mb-3 uppercase tracking-wider" style={{ letterSpacing: '1px' }}>
                          LIVE BETS ({betData.data.bets.length})
                        </div>
                        <div className="space-y-3 text-xs uppercase tracking-wide max-h-96 overflow-y-auto">
                          {betData.data.bets.map((bet: any, idx: number) => (
                            <div key={idx} className="border-b-2 border-white pb-3 last:border-0">
                              <div className="font-black text-white mb-2">
                                {bet.marketName || 'Unknown Market'}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-gray-400">
                                <div>
                                  <span className="text-gray-500">OUTCOME:</span>
                                  <span className={`ml-2 font-black ${bet.outcome === 'YES' ? 'text-green-400' : bet.outcome === 'NO' ? 'text-red-400' : 'text-white'}`}>
                                    {bet.outcome || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">SIZE:</span>
                                  <span className="text-white ml-2 font-black">
                                    ${(bet.size || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                {bet.price !== undefined && bet.price !== null && (
                                  <div>
                                    <span className="text-gray-500">PRICE:</span>
                                    <span className="text-white ml-2 font-black">
                                      ${parseFloat(bet.price).toFixed(4)}
                                    </span>
                                  </div>
                                )}
                                {bet.user && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">USER:</span>
                                    <span className="text-white ml-2 font-mono text-[10px] break-all">{bet.user}</span>
                                  </div>
                                )}
                                {bet.id && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">ID:</span>
                                    <span className="text-white ml-2 font-mono text-[10px] break-all">{bet.id}</span>
                                  </div>
                                )}
                                {bet.timestamp && (
                                  <div className="col-span-2">
                                    <span className="text-gray-500">TIMESTAMP:</span>
                                    <span className="text-white ml-2 font-mono text-[10px]">
                                      {new Date(bet.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Activity Message */}
                    {(!accountData || !accountData.data?.accounts?.length) && 
                     (!betData || !betData.data?.bets?.length) && (
                      <div className="bg-black border-2 border-white p-4 text-center" style={{ boxShadow: '4px 4px 0px #ffffff' }}>
                        <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                          NO ACTIVITY DATA AVAILABLE
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-gray-500">
                          This country has no verified accounts or live bets on Polymarket
                        </div>
                      </div>
                    )}

                    {/* Country Information */}
                    <div className="bg-black border-2 border-white p-4" style={{ boxShadow: '4px 4px 0px #ffffff' }}>
                      <div className="font-black text-sm mb-3 uppercase tracking-wider" style={{ letterSpacing: '1px' }}>
                        COUNTRY INFORMATION
                      </div>
                      {loadingCountryInfo ? (
                        <div className="text-xs uppercase tracking-wide text-gray-400">
                          LOADING...
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs uppercase tracking-wide text-gray-400">
                          <div>
                            <span className="text-gray-500">COUNTRY NAME:</span>
                            <span className="text-white ml-2 font-black">
                              {countryInfo?.name?.common || selectedCountry.properties.NAME || 'N/A'}
                            </span>
                          </div>
                          {countryInfo?.name?.official && (
                            <div>
                              <span className="text-gray-500">OFFICIAL NAME:</span>
                              <span className="text-white ml-2">
                                {countryInfo.name.official}
                              </span>
                            </div>
                          )}
                          {selectedCountry.properties.ISO_A2 && (
                            <div>
                              <span className="text-gray-500">ISO CODE:</span>
                              <span className="text-white ml-2 font-black">
                                {selectedCountry.properties.ISO_A2}
                              </span>
                            </div>
                          )}
                          {countryInfo?.capital && countryInfo.capital.length > 0 && (
                            <div>
                              <span className="text-gray-500">CAPITAL:</span>
                              <span className="text-white ml-2 font-black">
                                {countryInfo.capital[0]}
                              </span>
                            </div>
                          )}
                          {countryInfo?.population && (
                            <div>
                              <span className="text-gray-500">POPULATION:</span>
                              <span className="text-white ml-2 font-black">
                                {countryInfo.population.toLocaleString()}
                              </span>
                            </div>
                          )}
                          {countryInfo?.currencies && Object.keys(countryInfo.currencies).length > 0 && (
                            <div>
                              <span className="text-gray-500">CURRENCY:</span>
                              <span className="text-white ml-2 font-black">
                                {Object.values(countryInfo.currencies).map((curr: any) => `${curr.name} (${curr.symbol})`).join(', ')}
                              </span>
                            </div>
                          )}
                          {countryInfo?.languages && Object.keys(countryInfo.languages).length > 0 && (
                            <div>
                              <span className="text-gray-500">LANGUAGES:</span>
                              <span className="text-white ml-2">
                                {Object.values(countryInfo.languages).join(', ')}
                              </span>
                            </div>
                          )}
                          {countryInfo?.region && (
                            <div>
                              <span className="text-gray-500">REGION:</span>
                              <span className="text-white ml-2 font-black">
                                {countryInfo.region}
                              </span>
                            </div>
                          )}
                          {countryInfo?.subregion && (
                            <div>
                              <span className="text-gray-500">SUBREGION:</span>
                              <span className="text-white ml-2">
                                {countryInfo.subregion}
                              </span>
                            </div>
                          )}
                          {countryInfo?.area && (
                            <div>
                              <span className="text-gray-500">AREA:</span>
                              <span className="text-white ml-2 font-black">
                                {countryInfo.area.toLocaleString()} km²
                              </span>
                            </div>
                          )}
                          {countryInfo?.flags?.svg && (
                            <div className="mt-3 pt-3 border-t border-white">
                              <img 
                                src={countryInfo.flags.svg} 
                                alt={`${countryInfo.name?.common || 'Country'} flag`}
                                className="h-8 w-auto border border-white"
                                style={{ imageRendering: 'pixelated' }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

