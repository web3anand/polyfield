import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardSkeletonProps {
  username: string;
  onDisconnect: () => void;
}

export function DashboardSkeleton({ username, onDisconnect }: DashboardSkeletonProps) {
  return (
    <div className="min-h-screen bg-background pt-[clamp(48px,40px+2vw,64px)]">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-8 w-32" />
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <Skeleton className="h-3 w-24 mb-2" />
                <p className="text-2xl font-black text-foreground tracking-tight">
                  {username}
                </p>
              </div>
              <Button onClick={onDisconnect} variant="outline" size="sm">
                Disconnect
              </Button>
            </div>
          </div>

          <Card className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-10 w-32" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Achievement Banner */}
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48 mb-4" />
          <div className="flex gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="w-16 h-16" />
            ))}
          </div>
        </Card>

        {/* PnL Chart + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <Skeleton className="h-6 w-32 mb-6" />
            <Skeleton className="h-[300px] w-full" />
          </Card>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-16 w-full" />
              </Card>
            ))}
          </div>
        </div>

        {/* Positions Table */}
        <Card className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>

        {/* Volume + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-[200px] w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}