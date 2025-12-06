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

// Fetch multiple pages of leaderboard data using pagination
async function fetchBuilderLeaderboardPages(pages: number = 1): Promise<BuilderLeaderboardEntry[]> {
  const limit = 50; // API max per request
  
  // Fetch all pages in parallel for better performance
  const fetchPromises = Array.from({ length: pages }, async (_, page) => {
    const offset = page * limit;
    
    try {
      const response = await fetch(`/api/leaderboard/builders?timePeriod=ALL&limit=${limit}&offset=${offset}`);
      
      if (!response.ok) {
        if (page === 0) {
          throw new Error("Failed to fetch builder leaderboard");
        }
        return null;
      }
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching builder page ${page + 1}:`, error);
      return null;
    }
  });
  
  // Wait for all pages to fetch in parallel
  const results = await Promise.all(fetchPromises);
  
  // Combine all results and filter out nulls
  const allBuilders: BuilderLeaderboardEntry[] = [];
  for (const result of results) {
    if (result && Array.isArray(result)) {
      allBuilders.push(...result);
    }
  }
  
  return allBuilders;
}

async function fetchUserLeaderboardPages(pages: number = 1): Promise<UserLeaderboardEntry[]> {
  const limit = 50; // API max per request (Polymarket only returns 50)
  
  console.log(`📊 [FRONTEND] Fetching ${pages} page(s) of users leaderboard (up to ${pages * limit} users)...`);
  
  // Fetch all pages in parallel for better performance
  const fetchPromises = Array.from({ length: pages }, async (_, page) => {
    const offset = page * limit;
    const url = `/api/leaderboard/users?timePeriod=ALL&limit=${limit}&offset=${offset}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`  ❌ Page ${page + 1} failed: ${response.status} - ${errorText.substring(0, 100)}`);
        return null;
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        console.error(`  ❌ Page ${page + 1} returned non-array:`, typeof data);
        return null;
      }
      
      if (data.length === 0) {
        console.log(`  ⚠️ Page ${page + 1} returned no data`);
        return null;
      }
      
      console.log(`  ✓ Page ${page + 1}: Got ${data.length} users`);
      return data;
    } catch (error) {
      console.error(`  ❌ Page ${page + 1} error:`, error);
      return null;
    }
  });
  
  // Wait for all pages to fetch in parallel
  const results = await Promise.all(fetchPromises);
  
  // Combine all results and filter out nulls
  const allUsers: UserLeaderboardEntry[] = [];
  for (const result of results) {
    if (result && Array.isArray(result)) {
      allUsers.push(...result);
    }
  }
  
  // Sort by rank to ensure correct order (in case parallel fetching returns out of order)
  allUsers.sort((a, b) => {
    const rankA = parseInt(a.rank) || 0;
    const rankB = parseInt(b.rank) || 0;
    return rankA - rankB;
  });
  
  console.log(`✓ [FRONTEND] Total users fetched: ${allUsers.length}`);
  return allUsers;
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
  const [pnlFilter, setPnlFilter] = useState<string>("all"); // all, positive, negative
  const [volumeFilter, setVolumeFilter] = useState<string>("all"); // all, high, medium, low
  const { toast } = useToast();
  const itemsPerPage = 25;
  const isUsersPage = location === "/leaderboard/users";
  
  // Fetch more profiles upfront for better UX
  // Fetch 30 pages = 1500 users (API limit is 50 per request, so 30 pages = 1500 users)
  // This allows users to navigate through 60 pages (1500 / 25 = 60 pages) without additional fetches
  // No hard limit from Polymarket API - can fetch as many pages as needed via offset
  const pagesToFetch = 30; // Fetch 1500 users initially (30 pages × 50 users per page)
  
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

  const { data: builders, isLoading: isLoadingBuilders, error: buildersError } = useQuery({
    queryKey: ["builder-leaderboard", pagesToFetch],
    queryFn: () => fetchBuilderLeaderboardPages(pagesToFetch),
    enabled: !isUsersPage,
    staleTime: 5 * 60 * 1000,
  });

  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ["user-leaderboard", pagesToFetch],
    queryFn: () => fetchUserLeaderboardPages(pagesToFetch),
    enabled: isUsersPage,
    staleTime: 5 * 60 * 1000,
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
  const { data: walletData, isLoading: isLoadingWallets } = useQuery({
    queryKey: ["users-wallets", paginatedUsers.map(u => u.userName).filter(Boolean)],
    queryFn: async () => {
      const usernames = paginatedUsers.map(u => u.userName).filter(Boolean);
      if (usernames.length === 0) return {};
      
      console.log('📊 Step 1: Fetching wallets via search API for usernames:', usernames);
      
      // Process each username individually: username -> search API -> wallet
      // Use our API endpoint (same pattern as tracker page uses /api/dashboard/username)
      const walletPromises = usernames.map(async (username) => {
        try {
          // Call our API endpoint which handles the search API call server-side (avoids CORS)
          // Use simpler wallet-only endpoint (faster, same pattern as dashboard)
          const response = await fetch(`/api/leaderboard/wallet?username=${encodeURIComponent(username)}`);
          
          if (!response.ok) {
            console.warn(`⚠️ API failed for ${username}: ${response.status}`);
            return { username, wallet: null };
          }
          
          // Check if response is JSON (not HTML error page)
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            console.warn(`⚠️ Non-JSON response for ${username}: ${contentType}`);
            return { username, wallet: null };
          }
          
          const data = await response.json();
          
          // Extract walletAddress from response (same structure as tracker)
          const wallet = data.walletAddress || null;
          console.log(`✓ ${username}: wallet=${wallet ? wallet.slice(0, 10) + '...' : 'NOT FOUND'}`);
          return { username, wallet };
        } catch (error) {
          console.error(`❌ Error fetching wallet for ${username}:`, error);
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
      
      console.log(`✓ Step 1 Complete: Found ${Object.keys(walletMap).length} wallets`);
      return walletMap;
    },
    enabled: isUsersPage && paginatedUsers.length > 0,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
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

  const { data: pnlData, isLoading: isLoadingPnL } = useQuery({
    queryKey: ["users-pnl", walletsToFetch],
    queryFn: async () => {
      if (walletsToFetch.length === 0) return {};
      
      console.log('📊 Step 2: Fetching PnL for wallets:', walletsToFetch);
      
      // Process each wallet individually: wallet -> PnL API -> real PnL
      // Add timeout to prevent hanging
      const pnlPromises = walletsToFetch.map(async (wallet) => {
        try {
          // Create a timeout promise
          const timeoutPromise = new Promise<{ wallet: string; pnl: number }>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 15000); // 15 second timeout per wallet
          });
          
          const fetchPromise = (async () => {
            const response = await fetch(`/api/leaderboard/pnl?wallet=${encodeURIComponent(wallet)}`);
            if (!response.ok) {
              console.warn(`⚠️ PnL API failed for ${wallet}: ${response.status}`);
              return { wallet, pnl: 0 };
            }
            
            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              const text = await response.text();
              console.warn(`⚠️ PnL API returned non-JSON for ${wallet}: ${text.substring(0, 100)}`);
              return { wallet, pnl: 0 };
            }
            
            const data = await response.json();
            const pnl = data.totalPnL || 0;
            console.log(`✓ ${wallet.slice(0, 10)}...: PnL=$${pnl.toLocaleString()}`);
            return { wallet: wallet.toLowerCase(), pnl };
          })();
          
          return await Promise.race([fetchPromise, timeoutPromise]);
        } catch (error) {
          console.error(`❌ Error fetching PnL for ${wallet}:`, error);
          return { wallet: wallet.toLowerCase(), pnl: 0 };
        }
      });
      
      const results = await Promise.all(pnlPromises);
      const pnlMap: Record<string, number> = {};
      results.forEach(({ wallet, pnl }) => {
        pnlMap[wallet] = pnl;
      });
      
      console.log(`✓ Step 2 Complete: Found PnL for ${Object.keys(pnlMap).length} wallets`);
      return pnlMap;
    },
    enabled: isUsersPage && walletsToFetch.length > 0 && !isLoadingWallets, // Wait for wallets to load first
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 1, // Only retry once
    retryDelay: 1000,
  });
  
  // Calculate total pages
  const totalPagesBuilders = Math.ceil(filteredBuilders.length / itemsPerPage);
  const totalPagesUsers = Math.ceil(filteredUsers.length / itemsPerPage);
  const totalPages = isUsersPage ? totalPagesUsers : totalPagesBuilders;
  
  // Reset to page 1 when search, filter, or sort changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };
  
  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };
  
  const handleSortOrderChange = (value: string) => {
    setSortOrder(value as "asc" | "desc");
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
    <div className="min-h-screen bg-background pt-12 md:pt-16">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8 max-w-7xl">
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
              
              {/* Extended Search Bar with Filters and Sort - Only for Users */}
              {isUsersPage && (
                <div className="w-full flex flex-col sm:flex-row gap-3">
                  {/* Extended Search Bar */}
                  <div className="relative flex-1 min-w-0">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary z-10" />
                      <Input
                        type="text"
                        placeholder="Search users by name, username, or wallet..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="pl-11 pr-4 h-11 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200 rounded-lg shadow-sm hover:border-border"
                      />
                    </div>
                  </div>
                  
                  {/* Filter Dropdowns */}
                  <div className="flex gap-2">
                    <Select value={pnlFilter} onValueChange={handlePnlFilterChange}>
                      <SelectTrigger className="w-[140px] h-11 bg-background/50 backdrop-blur-sm border-border/50 pl-9">
                        <Filter className="absolute left-3 w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="PnL Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All PnL</SelectItem>
                        <SelectItem value="positive">Positive Only</SelectItem>
                        <SelectItem value="negative">Negative Only</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={volumeFilter} onValueChange={handleVolumeFilterChange}>
                      <SelectTrigger className="w-[140px] h-11 bg-background/50 backdrop-blur-sm border-border/50 pl-9">
                        <Filter className="absolute left-3 w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="Volume Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Volume</SelectItem>
                        <SelectItem value="high">High Volume</SelectItem>
                        <SelectItem value="medium">Medium Volume</SelectItem>
                        <SelectItem value="low">Low Volume</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Sort Dropdowns */}
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-[140px] h-11 bg-background/50 backdrop-blur-sm border-border/50 pl-9">
                        <ArrowUpDown className="absolute left-3 w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rank">Rank</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="pnl">PnL</SelectItem>
                        <SelectItem value="username">Username</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortOrder} onValueChange={handleSortOrderChange}>
                      <SelectTrigger className="w-[120px] h-11 bg-background/50 backdrop-blur-sm border-border/50">
                        <SelectValue placeholder="Order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              {/* Filters and Sort for Builders */}
              {!isUsersPage && (
                <div className="w-full flex flex-col sm:flex-row gap-3">
                  <div className="flex gap-2">
                    <Select value={volumeFilter} onValueChange={handleVolumeFilterChange}>
                      <SelectTrigger className="w-[140px] h-11 bg-background/50 backdrop-blur-sm border-border/50 pl-9">
                        <Filter className="absolute left-3 w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="Volume Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Volume</SelectItem>
                        <SelectItem value="high">High Volume</SelectItem>
                        <SelectItem value="medium">Medium Volume</SelectItem>
                        <SelectItem value="low">Low Volume</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={sortBy} onValueChange={handleSortChange}>
                      <SelectTrigger className="w-[140px] h-11 bg-background/50 backdrop-blur-sm border-border/50 pl-9">
                        <ArrowUpDown className="absolute left-3 w-4 h-4 text-muted-foreground" />
                        <SelectValue placeholder="Sort By" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rank">Rank</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                        <SelectItem value="builder">Builder Name</SelectItem>
                        <SelectItem value="activeUsers">Active Users</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortOrder} onValueChange={handleSortOrderChange}>
                      <SelectTrigger className="w-[120px] h-11 bg-background/50 backdrop-blur-sm border-border/50">
                        <SelectValue placeholder="Order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
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
              <Card className="bg-card border-border shadow-xl" style={{ imageRendering: "pixelated" }}>
                {!isUsersPage && (
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl md:text-3xl font-black text-foreground tracking-tight" style={{ imageRendering: "pixelated" }}>
                      <ShinyText>Builder Rankings</ShinyText>
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-1" style={{ imageRendering: "pixelated" }}>
                      Ranked by total trading volume across all time
                    </CardDescription>
                  </CardHeader>
                )}
                <CardContent>
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
                      ) : filteredUsers.length > 0 ? (
                        <div className="mb-4 px-3 py-2 flex items-center justify-end text-xs text-muted-foreground border-b border-border/30">
                          <span className="font-medium">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} {searchQuery ? 'filtered ' : ''}users
                          </span>
                        </div>
                      ) : null}
                      {filteredUsers.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-separate border-spacing-0" style={{ imageRendering: "pixelated" }}>
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
                                    className={`border-b border-border/30 hover:bg-accent/30 transition-all duration-200 ${
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
                                            src={user.profileImage}
                                            alt={user.userName}
                                            style={{ imageRendering: "pixelated" }}
                                          />
                                          <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs" style={{ imageRendering: "pixelated" }}>
                                            {user.userName.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-foreground text-sm" style={{ imageRendering: "pixelated" }}>
                                              {user.userName}
                                            </span>
                                            {user.xUsername && (
                                              <a
                                                href={`https://x.com/${user.xUsername}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                                onClick={(e) => e.stopPropagation()}
                                              >
                                                <svg className="w-3 h-3 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
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
                                                    className="ml-1.5 p-1 hover:bg-accent rounded transition-colors flex-shrink-0 group"
                                                    title="Copy wallet address"
                                                  >
                                                    {copiedWallet === walletAddress ? (
                                                      <Check className="w-3.5 h-3.5 text-green-500" />
                                                    ) : (
                                                      <Wallet className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                    )}
                                                  </button>
                                                );
                                              }
                                              return null;
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
                                              $0.00
                                            </span>
                                          );
                                        }
                                      })()}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : searchQuery ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
                        </div>
                      ) : null}
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
                      {isLoadingBuilders ? (
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
                      ) : filteredBuilders.length > 0 ? (
                        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                          <span>
                            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredBuilders.length)} of {filteredBuilders.length} {searchQuery ? 'filtered ' : ''}builders
                          </span>
                        </div>
                      ) : null}
                      {filteredBuilders.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-separate border-spacing-0" style={{ imageRendering: "pixelated" }}>
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
                                    className={`border-b border-border/30 hover:bg-accent/30 transition-all duration-200 ${
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
                      ) : searchQuery ? (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground">No builders found matching "{searchQuery}"</p>
                        </div>
                      ) : null}
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
