import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Shield, Loader2 } from "lucide-react";
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
}

async function fetchBuilderLeaderboard(): Promise<BuilderLeaderboardEntry[]> {
  const response = await fetch("/api/leaderboard/builders?timePeriod=ALL&limit=50&offset=0");
  if (!response.ok) {
    throw new Error("Failed to fetch builder leaderboard");
  }
  return response.json();
}

async function fetchUserLeaderboard(): Promise<UserLeaderboardEntry[]> {
  const response = await fetch("/api/leaderboard/users?timePeriod=ALL&limit=50&offset=0");
  if (!response.ok) {
    throw new Error("Failed to fetch user leaderboard");
  }
  return response.json();
}


function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `$${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(2)}K`;
  }
  return `$${volume.toFixed(2)}`;
}

export default function Leaderboard() {
  const [location] = useLocation();
  const [volumeTimeFrame, setVolumeTimeFrame] = useState<string>("DAY");
  const isUsersPage = location === "/leaderboard/users";

  const { data: builders, isLoading: isLoadingBuilders, error: buildersError } = useQuery({
    queryKey: ["builder-leaderboard"],
    queryFn: fetchBuilderLeaderboard,
    enabled: !isUsersPage,
    staleTime: 5 * 60 * 1000,
  });

  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ["user-leaderboard"],
    queryFn: fetchUserLeaderboard,
    enabled: isUsersPage,
    staleTime: 5 * 60 * 1000,
  });


  const { data: volumeData, isLoading: isLoadingVolume, error: volumeError } = useQuery({
    queryKey: ["builder-volume-timeseries", volumeTimeFrame],
    queryFn: async () => {
      console.log(`📊 Fetching volume data for timePeriod: ${volumeTimeFrame}`);
      try {
        const url = `/api/leaderboard/builders/volume?timePeriod=${volumeTimeFrame}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch builder volume time-series: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
          return [];
        }
        
        return data;
      } catch (error) {
        console.error("❌ Error in queryFn:", error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  return (
    <div className="min-h-screen bg-background pt-12 md:pt-16">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-3 md:gap-4 mb-3">
              <div className="p-2 md:p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg border border-primary/30 shadow-lg">
                <Trophy className="w-5 h-5 md:w-7 md:h-7 text-primary" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight">
                  <ShinyText>Leaderboard</ShinyText>
                </h1>
                <p className="text-muted-foreground text-sm md:text-base mt-1">
                  {isUsersPage 
                    ? "Top traders ranked by trading volume"
                    : "Top builders ranked by trading volume"}
                </p>
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
              <Card className="bg-card border-border shadow-xl" style={{ imageRendering: "pixelated" }}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl md:text-3xl font-black text-foreground tracking-tight" style={{ imageRendering: "pixelated" }}>
                    <ShinyText>{isUsersPage ? "User Rankings" : "Builder Rankings"}</ShinyText>
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-sm mt-1" style={{ imageRendering: "pixelated" }}>
                    Ranked by total trading volume across all time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isUsersPage ? (
                    // Users Table
                    isLoadingUsers ? (
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
                    ) : users && users.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-0" style={{ imageRendering: "pixelated" }}>
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                RANK
                              </th>
                              <th className="text-left py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                {isUsersPage ? "PLAYER" : "BUILDER"}
                              </th>
                              <th className="text-right py-2 px-3 text-[10px] font-medium text-muted-foreground uppercase tracking-wider" style={{ imageRendering: "pixelated" }}>
                                VOLUME
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user, index) => {
                              const rankNum = parseInt(user.rank) || index + 1;
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
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-foreground text-sm" style={{ imageRendering: "pixelated" }}>
                                            {user.userName}
                                          </span>
                                          {user.xUsername && (
                                            <a
                                              href={`https://x.com/${user.xUsername}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-muted-foreground hover:text-foreground transition-colors"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <svg className="w-3 h-3 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                              </svg>
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <span className="font-black text-primary text-sm tracking-tight" style={{ imageRendering: "pixelated" }}>
                                      {formatVolume(user.vol)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No users found</p>
                      </div>
                    )
                  ) : (
                    // Builders Table
                    isLoadingBuilders ? (
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
                    ) : builders && builders.length > 0 ? (
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
                            {builders.map((builder, index) => {
                              const rankNum = parseInt(builder.rank) || index + 1;
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
                    ) : (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">No builders found</p>
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
          </div>
        </div>
    </div>
  );
}
