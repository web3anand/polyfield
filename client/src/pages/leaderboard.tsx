import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, Search, ChevronLeft, ChevronRight, Check, Wallet, Filter, ArrowUpDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PixelChart } from "@/components/pixel-chart";
import { ShinyText } from "@/components/shiny-text";

interface BuilderLeaderboardEntry {
  rank: string;
  builder: string;
  volume: number;
  activeUsers: number;
  verified: boolean;
  builderLogo?: string;
}

interface UserLeaderboardEntry {
  rank: string;
  userName: string;
  vol: number;
  xUsername?: string;
  walletAddress?: string;
  profileImage?: string;
  pnl?: number; // Total PnL if available
}



function formatVolume(volume: number): string {
  const absVolume = Math.abs(volume);
  const sign = volume < 0 ? '-' : '';
  
  if (absVolume >= 1_000_000_000) {
    return `${sign}$${(absVolume / 1_000_000_000).toFixed(2)}B`;
  }
  if (absVolume >= 1_000_000) {
    return `${sign}$${(absVolume / 1_000_000).toFixed(2)}M`;
  }
  if (absVolume >= 1_000) {
    return `${sign}$${(absVolume / 1_000).toFixed(2)}K`;
  }
  return `${sign}$${absVolume.toFixed(2)}`;
}

export default function Leaderboard() {
  const [location] = useLocation();
  const [volumeTimeFrame, setVolumeTimeFrame] = useState<string>("DAY");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("rank");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pnlFilter, setPnlFilter] = useState<string>("all");
  const [volumeFilter, setVolumeFilter] = useState<string>("all");
  const { toast } = useToast();
  const itemsPerPage = 25;
  const isUsersPage = location === "/leaderboard/users";
  
  // Fetch all profiles until zero data is returned
  // No page limit - will fetch until API returns empty data
  
  const handleCopyWallet = async (walletAddress: string) => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedWallet(walletAddress);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopiedWallet(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // Fetch data from DB cache using React Query - only fetch once, cache forever
  const { data: builders = [], isLoading: isLoadingBuilders, error: buildersError } = useQuery({
    queryKey: ["leaderboard-builders"],
    queryFn: async () => {
      const allBuilders: BuilderLeaderboardEntry[] = [];
      let page = 0;
      const limit = 1000; // Fetch in chunks from Supabase
      
      while (true) {
        const offset = page * limit;
        const response = await fetch(`/api/leaderboard/builders?timePeriod=ALL&limit=${limit}&offset=${offset}&fetchAll=true`);
        
        if (!response.ok) {
          if (page === 0) throw new Error("Failed to fetch builders");
          break;
        }
        
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) break;
        
        allBuilders.push(...data);
        if (data.length < limit) break; // No more data
        page++;
      }
      
      return allBuilders;
    },
    enabled: !isUsersPage,
    staleTime: Infinity, // Never refetch - data is updated by cron job
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const { data: users = [], isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ["leaderboard-users"],
    queryFn: async () => {
      const allUsers: UserLeaderboardEntry[] = [];
      let page = 0;
      const limit = 1000; // Fetch in chunks from Supabase
      
      while (true) {
        const offset = page * limit;
        const response = await fetch(`/api/leaderboard/users?timePeriod=ALL&limit=${limit}&offset=${offset}&fetchAll=true`);
        
        if (!response.ok) {
          if (page === 0) throw new Error("Failed to fetch users");
          break;
        }
        
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) break;
        
        allUsers.push(...data);
        if (data.length < limit) break; // No more data
        page++;
      }
      
      // Sort by rank
      allUsers.sort((a, b) => {
        const rankA = parseInt(a.rank) || 0;
        const rankB = parseInt(b.rank) || 0;
        return rankA - rankB;
      });
      
      return allUsers;
    },
    enabled: isUsersPage,
    staleTime: Infinity, // Never refetch - data is updated by cron job
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  
  // Filter and sort data
  const filteredBuilders = useMemo(() => {
    if (!builders) return [];
    
    let filtered = [...builders];
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(builder => 
        builder.builder.toLowerCase().includes(query)
      );
    }
    
    // Apply volume filter
    if (volumeFilter !== "all") {
      const volumes = filtered.map(b => b.volume).filter(v => v > 0);
      if (volumes.length > 0) {
        const maxVol = Math.max(...volumes);
        const highThreshold = maxVol * 0.7;
        const mediumThreshold = maxVol * 0.3;
        
        filtered = filtered.filter(builder => {
          if (volumeFilter === "high") return builder.volume >= highThreshold;
          if (volumeFilter === "medium") return builder.volume >= mediumThreshold && builder.volume < highThreshold;
          if (volumeFilter === "low") return builder.volume < mediumThreshold;
          return true;
        });
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "rank") {
        comparison = (parseInt(a.rank) || 0) - (parseInt(b.rank) || 0);
      } else if (sortBy === "volume") {
        comparison = (a.volume || 0) - (b.volume || 0);
      } else if (sortBy === "builder") {
        comparison = (a.builder || "").localeCompare(b.builder || "");
      } else if (sortBy === "activeUsers") {
        comparison = (a.activeUsers || 0) - (b.activeUsers || 0);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [builders, searchQuery, sortBy, sortOrder, volumeFilter]);
  
  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = [...users];
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.userName.toLowerCase().includes(query) ||
        user.xUsername?.toLowerCase().includes(query) ||
        user.walletAddress?.toLowerCase().includes(query)
      );
    }
    
    // Apply PnL filter
    if (pnlFilter !== "all") {
      filtered = filtered.filter(user => {
        const pnl = user.pnl || 0;
        if (pnlFilter === "positive") return pnl > 0;
        if (pnlFilter === "negative") return pnl < 0;
        return true;
      });
    }
    
    // Apply volume filter
    if (volumeFilter !== "all") {
      const volumes = filtered.map(u => u.vol || 0).filter(v => v > 0);
      if (volumes.length > 0) {
        const maxVol = Math.max(...volumes);
        const highThreshold = maxVol * 0.7;
        const mediumThreshold = maxVol * 0.3;
        
        filtered = filtered.filter(user => {
          const vol = user.vol || 0;
          if (volumeFilter === "high") return vol >= highThreshold;
          if (volumeFilter === "medium") return vol >= mediumThreshold && vol < highThreshold;
          if (volumeFilter === "low") return vol < mediumThreshold;
          return true;
        });
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "rank") {
        comparison = (parseInt(a.rank) || 0) - (parseInt(b.rank) || 0);
      } else if (sortBy === "volume") {
        comparison = (a.vol || 0) - (b.vol || 0);
      } else if (sortBy === "pnl") {
        comparison = (a.pnl || 0) - (b.pnl || 0);
      } else if (sortBy === "username") {
        comparison = (a.userName || "").localeCompare(b.userName || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  }, [users, searchQuery, sortBy, sortOrder, pnlFilter, volumeFilter]);
  
  // Paginate filtered data
  const paginatedBuilders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredBuilders.slice(start, end);
  }, [filteredBuilders, currentPage, itemsPerPage]);
  
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Clear structure:
  // 1. Leaderboard API gives us: username list
  // 2. For each username: call search API (public-search?q=username&search_profiles=true) -> get proxyWallet from profiles array
  // 3. For each wallet: call PnL API -> get real PnL
  
  // Step 1: Fetch wallets for all users via search API (username -> search API -> proxyWallet)
  // Only fetch if wallet is not already in user data
  const { data: walletData = {}, isLoading: isLoadingWallets } = useQuery<Record<string, string>>({
    queryKey: ["users-wallets", paginatedUsers.map(u => u.userName).filter(Boolean).join(',')],
    queryFn: async () => {
      const usernames = paginatedUsers
        .filter(u => !u.walletAddress) // Only fetch if wallet not already available
        .map(u => u.userName)
        .filter(Boolean);
      
      if (usernames.length === 0) return {};
      
      // Process each username individually: username -> search API -> wallet
      const walletPromises = usernames.map(async (username) => {
        try {
          const response = await fetch(`/api/leaderboard/wallet?username=${encodeURIComponent(username)}`);
          if (!response.ok) return { username, wallet: null };
          
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            return { username, wallet: null };
          }
          
          const data = await response.json();
          const wallet = data.walletAddress || null;
          return { username, wallet };
        } catch (error) {
          return { username, wallet: null };
        }
      });
      
      const results = await Promise.all(walletPromises);
      const walletMap: Record<string, string> = {};
      results.forEach(({ username, wallet }) => {
        if (wallet) {
          walletMap[username.toLowerCase()] = wallet;
        }
      });
      
      return walletMap;
    },
    enabled: isUsersPage && paginatedUsers.length > 0,
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
    gcTime: 24 * 60 * 60 * 1000,
  });

  // Step 2: Fetch PnL for all wallets (wallet -> PnL API -> real PnL)
  // Only fetch for users that don't already have PnL from leaderboard API
  const walletsToFetch = useMemo(() => {
    const wallets: string[] = [];
    paginatedUsers.forEach(user => {
      // Skip if PnL is already available from leaderboard API
      if (user.pnl !== undefined && user.pnl !== null) {
        return; // Already have PnL, skip fetching
      }
      
      // Use wallet from search API if available, otherwise use from leaderboard API
      const wallet = walletData?.[user.userName.toLowerCase()] || user.walletAddress;
      if (wallet) wallets.push(wallet);
    });
    return [...new Set(wallets)]; // Remove duplicates
  }, [paginatedUsers, walletData]);

  const { data: pnlData = {}, isLoading: isLoadingPnL } = useQuery<Record<string, number>>({
    queryKey: ["users-pnl", walletsToFetch.join(',')],
    queryFn: async () => {
      if (walletsToFetch.length === 0) return {};
      
      // Process each wallet individually: wallet -> PnL API -> real PnL
      const pnlPromises = walletsToFetch.map(async (wallet) => {
        try {
          const timeoutPromise = new Promise<{ wallet: string; pnl: number }>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 10000); // 10 second timeout
          });
          
          const fetchPromise = (async () => {
            const response = await fetch(`/api/leaderboard/pnl?wallet=${encodeURIComponent(wallet)}`);
            if (!response.ok) return { wallet, pnl: 0 };
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              return { wallet, pnl: 0 };
            }
            
            const data = await response.json();
            const pnl = data.totalPnL || 0;
            return { wallet: wallet.toLowerCase(), pnl };
          })();
          
          return await Promise.race([fetchPromise, timeoutPromise]);
        } catch (error) {
          return { wallet: wallet.toLowerCase(), pnl: 0 };
        }
      });
      
      const results = await Promise.all(pnlPromises);
      const pnlMap: Record<string, number> = {};
      results.forEach(({ wallet, pnl }) => {
        pnlMap[wallet] = pnl;
      });
      
      return pnlMap;
    },
    enabled: isUsersPage && walletsToFetch.length > 0 && !isLoadingWallets,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });
  
  // Calculate total pages
  const totalPagesBuilders = Math.ceil(filteredBuilders.length / itemsPerPage);
  const totalPagesUsers = Math.ceil(filteredUsers.length / itemsPerPage);
  const totalPages = isUsersPage ? totalPagesUsers : totalPagesBuilders;
  
  // Reset to page 1 when search, filter, or sort changes
  // Handlers - simple and clean, no scroll manipulation
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };
  
  const handleSortOrderChange = (value: "asc" | "desc") => {
    setSortOrder(value);
    setCurrentPage(1);
  };
  
  const handlePnlFilterChange = (value: string) => {
    setPnlFilter(value);
    setCurrentPage(1);
  };
  
  const handleVolumeFilterChange = (value: string) => {
    setVolumeFilter(value);
    setCurrentPage(1);
  };


  const { data: volumeData, isLoading: isLoadingVolume, error: volumeError } = useQuery({
    queryKey: ["builder-volume-timeseries", volumeTimeFrame],
    queryFn: async () => {
      console.log(`📊 Fetching volume data for timePeriod: ${volumeTimeFrame}`);
      try {
        const url = `/api/leaderboard/builders/volume?timePeriod=${volumeTimeFrame}`;
        const response = await fetch(url);
        
        // Check if response is OK
        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`⚠️ API returned ${response.status}: ${errorText.substring(0, 100)}`);
          return []; // Return empty array instead of throwing
        }
        
        // Check content type to ensure it's JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`⚠️ API returned non-JSON content: ${contentType}`);
          return []; // Return empty array instead of throwing
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          console.warn(`⚠️ API returned non-array data:`, typeof data);
          return [];
        }
        
        return data;
      } catch (error: any) {
        // Handle JSON parse errors (when API returns HTML instead of JSON)
        if (error instanceof SyntaxError && error.message.includes('JSON')) {
          console.error("❌ Error parsing JSON (likely got HTML):", error.message);
          return []; // Return empty array instead of throwing
        }
        
        console.error("❌ Error in queryFn:", error);
        return []; // Return empty array instead of throwing to prevent UI crashes
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1, // Reduced retries since we're handling errors gracefully
  });

  return (
    <div className="min-h-screen bg-background pt-12 md:pt-16" style={{ contain: 'layout style paint', overflowAnchor: 'none' }}>
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8 max-w-7xl" style={{ contain: 'layout', overflowAnchor: 'none' }}>
          {/* Sleek & Elegant Header */}
          <div className="mb-8 md:mb-10">
            <div className="flex flex-col gap-6">
              {/* Title Section */}
              <div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-2">
                  Leaderboard
                </h1>
                <p className="text-muted-foreground text-sm md:text-base font-normal">
                  {isUsersPage 
                    ? "Top traders ranked by trading volume"
                    : "Top builders ranked by trading volume"}
                </p>
              </div>
              
              {/* Search, Filters, and Sort Controls */}
              <div className="w-full space-y-3" style={{ contain: 'layout' }}>
                {/* Search Bar */}
                <div className="relative" style={{ contain: 'layout' }}>
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    type="text"
                    placeholder={isUsersPage ? "Search users by name, username, or wallet..." : "Search builders..."}
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-11 pr-4 h-11 bg-background/50 backdrop-blur-sm border-border/50"
                  />
                </div>
                
                {/* Filters and Sort - Users */}
                {isUsersPage && (
                  <div className="flex flex-wrap gap-2" style={{ contain: 'layout', minHeight: '44px', height: '44px', position: 'relative' }}>
                    <Select value={pnlFilter} onValueChange={handlePnlFilterChange}>
                      <SelectTrigger className="w-[140px] h-10 bg-background/50 backdrop-blur-sm border-border/50" style={{ contain: 'layout', flexShrink: 0 }}>
                        <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                        <SelectValue placeholder="PnL Filter" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="all">All PnL</SelectItem>
                        <SelectItem value="positive">Positive Only</SelectItem>
                        <SelectItem value="negative">Negative Only</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={volumeFilter} onValueChange={handleVolumeFilterChange}>
                      <SelectTrigger className="w-[140px] h-10 bg-background/50 backdrop-blur-sm border-border/50" style={{ contain: 'layout', flexShrink: 0 }}>
                        <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                        <SelectValue placeholder="Volume Filter" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="all">All Volume</SelectItem>
                        <SelectItem value="high">High Volume</SelectItem>
                        <SelectItem value="medium">Medium Volume</SelectItem>
                        <SelectItem value="low">Low Volume</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-[140px] h-10 bg-background/50 backdrop-blur-sm border-border/50" style={{ contain: 'layout', flexShrink: 0 }}>
                        <ArrowUpDown className="w-4 h-4 mr-2 flex-shrink-0" />
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="rank">Rank</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="pnl">PnL</SelectItem>
                        <SelectItem value="username">Username</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortOrder} onValueChange={handleSortOrderChange}>
                      <SelectTrigger className="w-[120px] h-10 bg-background/50 backdrop-blur-sm border-border/50" style={{ contain: 'layout', flexShrink: 0 }}>
                        <SelectValue placeholder="Order" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {/* Filters and Sort - Builders */}
                {!isUsersPage && (
                  <div className="flex flex-wrap gap-2" style={{ contain: 'layout', minHeight: '44px', height: '44px', position: 'relative' }}>
                    <Select value={volumeFilter} onValueChange={handleVolumeFilterChange}>
                      <SelectTrigger className="w-[140px] h-10 bg-background/50 backdrop-blur-sm border-border/50" style={{ contain: 'layout', flexShrink: 0 }}>
                        <Filter className="w-4 h-4 mr-2 flex-shrink-0" />
                        <SelectValue placeholder="Volume Filter" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="all">All Volume</SelectItem>
                        <SelectItem value="high">High Volume</SelectItem>
                        <SelectItem value="medium">Medium Volume</SelectItem>
                        <SelectItem value="low">Low Volume</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-[140px] h-10 bg-background/50 backdrop-blur-sm border-border/50" style={{ contain: 'layout', flexShrink: 0 }}>
                        <ArrowUpDown className="w-4 h-4 mr-2 flex-shrink-0" />
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="rank">Rank</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="builder">Builder Name</SelectItem>
                        <SelectItem value="activeUsers">Active Users</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortOrder} onValueChange={handleSortOrderChange}>
                      <SelectTrigger className="w-[120px] h-10 bg-background/50 backdrop-blur-sm border-border/50" style={{ contain: 'layout', flexShrink: 0 }}>
                        <SelectValue placeholder="Order" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Leaderboard Content */}
          <div className="space-y-8">
              {/* Pixel Chart - Only for Builders */}
              {!isUsersPage && (
                <div className="w-full">
                  {volumeError && (
                    <div className="mb-4 p-4 bg-destructive/10 border border-destructive/30 rounded">
                      <p className="text-destructive text-sm">
                        Error loading volume data: {volumeError instanceof Error ? volumeError.message : "Unknown error"}
                      </p>
                    </div>
                  )}
                  <PixelChart 
                    data={volumeData || []} 
                    isLoading={isLoadingVolume}
                    onTimeFrameChange={setVolumeTimeFrame}
                  />
                </div>
              )}

              {/* Rankings Table */}
              <Card className="bg-card border-border shadow-xl" style={{ imageRendering: "pixelated", contain: 'layout style', willChange: 'auto', position: 'relative' }}>
                {!isUsersPage && (
                  <CardHeader className="pb-4" style={{ contain: 'layout', position: 'relative' }}>
                    <CardTitle className="text-2xl md:text-3xl font-black text-foreground tracking-tight" style={{ imageRendering: "pixelated" }}>
                      <ShinyText>Builder Rankings</ShinyText>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-1" style={{ imageRendering: "pixelated" }}>
                      Ranked by total trading volume across all time
                    </CardDescription>
                  </CardHeader>
                )}
                <CardContent style={{ contain: 'layout', position: 'relative' }}>
                  {isUsersPage ? (
                    <>
                      {/* Users Table */}
                      {isLoadingUsers ? (
                        <div className="flex items-center justify-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" strokeWidth={2.5} />
                            <p className="text-muted-foreground text-sm">Loading rankings...</p>
                          </div>
                        </div>
                      ) : usersError ? (
                        <div className="text-center py-12">
                          <p className="text-destructive">Failed to load leaderboard</p>
                          <p className="text-muted-foreground text-sm mt-2">
                            {usersError instanceof Error ? usersError.message : "Unknown error"}
                          </p>
                        </div>
                      ) : null}
                      <div className="min-h-[600px]" style={{ contain: 'layout', isolation: 'isolate', position: 'relative', willChange: 'auto' }}>
                        {filteredUsers.length > 0 ? (
                          <>
                            <div className="mb-4 px-3 py-2 h-10 flex items-center justify-end text-xs text-muted-foreground border-b border-border/30" style={{ contain: 'layout', position: 'relative', minHeight: '40px', height: '40px', flexShrink: 0 }}>
                              <span className="font-medium whitespace-nowrap">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} {searchQuery ? 'filtered ' : ''}users
                              </span>
                            </div>
                            <div className="overflow-x-auto" style={{ contain: 'layout', position: 'relative', willChange: 'auto', minHeight: '500px' }}>
                              <table className="w-full border-separate border-spacing-0 table-fixed" style={{ imageRendering: "pixelated", tableLayout: 'fixed', width: '100%', borderCollapse: 'separate' }}>
                            <colgroup>
                              <col style={{ width: '64px' }} />
                              <col style={{ width: 'auto' }} />
                              <col style={{ width: '128px' }} />
                              <col style={{ width: '128px' }} />
                            </colgroup>
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                  RANK
                                </th>
                                <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                  PLAYER
                                </th>
                                <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                  VOLUME
                                </th>
                                <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                  PNL
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedUsers.map((user, index) => {
                                const rankNum = parseInt(user.rank) || ((currentPage - 1) * itemsPerPage) + index + 1;
                                const isTopThree = rankNum <= 3;
                                
                                return (
                                  <tr
                                    key={user.walletAddress || user.userName}
                                    className={`border-b border-border/30 hover:bg-accent/30 ${
                                      isTopThree ? "bg-gradient-to-r from-primary/5 to-transparent" : ""
                                    }`}
                                    style={{ imageRendering: "pixelated" }}
                                  >
                                    <td className="py-2 px-3">
                                      <span
                                        className={`font-black text-sm ${
                                          isTopThree ? "text-foreground" : "text-muted-foreground"
                                        }`}
                                        style={{ imageRendering: "pixelated" }}
                                      >
                                        [{rankNum}]
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="w-8 h-8 border border-border flex-shrink-0" style={{ imageRendering: "pixelated" }}>
                                          <AvatarImage
                                            src={user.profileImage}
                                            alt={user.userName}
                                            style={{ imageRendering: "pixelated" }}
                                          />
                                          <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs" style={{ imageRendering: "pixelated" }}>
                                            {user.userName.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-foreground text-sm truncate" style={{ imageRendering: "pixelated" }}>
                                              {user.userName}
                                            </span>
                                            {user.xUsername && (
                                              <a
                                                href={`https://x.com/${user.xUsername}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted-foreground hover:text-foreground flex-shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <svg className="w-3 h-3 text-[#1DA1F2] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                                </svg>
                                              </a>
                                            )}
                                            {(() => {
                                              // Get wallet: priority = search API wallet > leaderboard API wallet
                                              const walletAddress = walletData?.[user.userName.toLowerCase()] || user.walletAddress;
                                              
                                              if (walletAddress) {
                                                return (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleCopyWallet(walletAddress);
                                                    }}
                                                    className="ml-1.5 w-5 h-5 flex items-center justify-center hover:bg-accent rounded flex-shrink-0 group"
                                                    title="Copy wallet address"
                                                  >
                                                    {copiedWallet === walletAddress ? (
                                                      <Check className="w-3.5 h-3.5 text-green-500" />
                                                    ) : (
                                                      <Wallet className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                                                    )}
                                                  </button>
                                                );
                                              }
                                              return <span className="w-5 h-5 flex-shrink-0" />;
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <span className="font-black text-primary text-sm tracking-tight" style={{ imageRendering: "pixelated" }}>
                                        {formatVolume(user.vol)}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <div className="min-h-[20px] flex items-center justify-end">
                                        {(() => {
                                          // Get wallet: priority = search API wallet > leaderboard API wallet
                                          const wallet = walletData?.[user.userName.toLowerCase()] || user.walletAddress;
                                          
                                          // Get PnL: priority = leaderboard API PnL > fetched PnL (positions + subgraph)
                                          // Both use the same calculation method (positions + subgraph)
                                          let pnl: number | undefined = undefined;
                                          
                                          // First, check if PnL is available from leaderboard API (fast, already fetched)
                                          if (user.pnl !== undefined && user.pnl !== null) {
                                            pnl = user.pnl;
                                          }
                                          // Fall back to fetched PnL (from /api/leaderboard/pnl which uses positions + subgraph)
                                          else if (wallet && pnlData) {
                                            const walletKey = wallet.toLowerCase();
                                            pnl = pnlData[walletKey];
                                          }
                                          
                                          if (pnl !== undefined) {
                                            return (
                                              <span className={`font-bold text-sm ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`} style={{ imageRendering: "pixelated" }}>
                                                {formatVolume(pnl)}
                                              </span>
                                            );
                                          } else if (isLoadingPnL && wallet && user.pnl === undefined) {
                                            return (
                                              <span className="text-muted-foreground text-xs animate-pulse" style={{ imageRendering: "pixelated" }}>
                                                Loading...
                                              </span>
                                            );
                                          } else {
                                            return (
                                              <span className="text-muted-foreground text-xs" style={{ imageRendering: "pixelated" }}>
                                                —
                                              </span>
                                            );
                                          }
                                        })()}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                            </div>
                          </>
                        ) : searchQuery ? (
                          <div className="text-center py-12">
                            <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
                          </div>
                        ) : null}
                      </div>
                      {/* Pagination Controls */}
                      {totalPages > 1 && filteredUsers.length > 0 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isLoadingUsers}
                            className="gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  disabled={isLoadingUsers}
                                  className="min-w-[2.5rem]"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || isLoadingUsers}
                            className="gap-1"
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Builders Table */}
                      {isLoadingBuilders && builders.length === 0 ? (
                      <div className="flex items-center justify-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" strokeWidth={2.5} />
                          <p className="text-muted-foreground text-sm">Loading rankings...</p>
                        </div>
                      </div>
                    ) : buildersError ? (
                      <div className="text-center py-12">
                        <p className="text-destructive">Failed to load leaderboard</p>
                        <p className="text-muted-foreground text-sm mt-2">
                          {buildersError instanceof Error ? buildersError.message : "Unknown error"}
                        </p>
                      </div>
                      ) : null}
                      <div className="min-h-[600px]" style={{ contain: 'layout', isolation: 'isolate', position: 'relative', willChange: 'auto' }}>
                        {filteredBuilders.length > 0 ? (
                          <>
                            <div className="mb-4 h-10 flex items-center justify-between text-sm text-muted-foreground" style={{ contain: 'layout', minHeight: '40px', height: '40px', flexShrink: 0 }}>
                              <span className="whitespace-nowrap">
                                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredBuilders.length)} of {filteredBuilders.length} {searchQuery ? 'filtered ' : ''}builders
                              </span>
                            </div>
                            <div className="overflow-x-auto" style={{ contain: 'layout', position: 'relative', willChange: 'auto', minHeight: '500px' }}>
                              <table className="w-full border-separate border-spacing-0 table-fixed" style={{ imageRendering: "pixelated", tableLayout: 'fixed', width: '100%', borderCollapse: 'separate' }}>
                            <colgroup>
                              <col style={{ width: '64px' }} />
                              <col style={{ width: 'auto' }} />
                              <col style={{ width: '128px' }} />
                              <col style={{ width: '128px' }} />
                              <col style={{ width: '100px' }} />
                            </colgroup>
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                  RANK
                                </th>
                                <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                  BUILDER
                                </th>
                                <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                  VOLUME
                                </th>
                                <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                  ACTIVE USERS
                                </th>
                                <th className="text-center py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                  STATUS
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {paginatedBuilders.map((builder, index) => {
                                const rankNum = parseInt(builder.rank) || ((currentPage - 1) * itemsPerPage) + index + 1;
                                const isTopThree = rankNum <= 3;
                                
                                return (
                                  <tr
                                    key={builder.builder}
                                    className={`border-b border-border/30 hover:bg-accent/30 ${
                                      isTopThree ? "bg-gradient-to-r from-primary/5 to-transparent" : ""
                                    }`}
                                    style={{ imageRendering: "pixelated" }}
                                  >
                                    <td className="py-2 px-3">
                                      <span
                                        className={`font-black text-sm ${
                                          isTopThree ? "text-foreground" : "text-muted-foreground"
                                        }`}
                                        style={{ imageRendering: "pixelated" }}
                                      >
                                        [{rankNum}]
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="w-8 h-8 border border-border" style={{ imageRendering: "pixelated" }}>
                                          <AvatarImage
                                            src={builder.builderLogo}
                                            alt={builder.builder}
                                            style={{ imageRendering: "pixelated" }}
                                          />
                                          <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs" style={{ imageRendering: "pixelated" }}>
                                            {builder.builder.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-foreground text-sm" style={{ imageRendering: "pixelated" }}>
                                              {builder.builder}
                                            </span>
                                            {builder.verified && (
                                              <Shield className="w-3 h-3 text-amber-400" strokeWidth={2.5} />
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <span className="font-black text-primary text-sm tracking-tight" style={{ imageRendering: "pixelated" }}>
                                        {formatVolume(builder.volume)}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <span className="text-muted-foreground font-medium text-sm" style={{ imageRendering: "pixelated" }}>
                                        {builder.activeUsers.toLocaleString()}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      {builder.verified ? (
                                        <span className="text-amber-400 font-bold text-xs" style={{ imageRendering: "pixelated" }}>
                                          Verified
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground text-xs" style={{ imageRendering: "pixelated" }}>—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                            </div>
                          </>
                        ) : searchQuery ? (
                          <div className="text-center py-12">
                            <p className="text-muted-foreground">No builders found matching "{searchQuery}"</p>
                          </div>
                        ) : null}
                      </div>
                      {/* Pagination Controls */}
                      {totalPages > 1 && filteredBuilders.length > 0 && (
                        <div className="mt-6 flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || isLoadingBuilders}
                            className="gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  disabled={isLoadingBuilders}
                                  className="min-w-[2.5rem]"
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || isLoadingBuilders}
                            className="gap-1"
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
          </div>
        </div>
    </div>
  );
}
