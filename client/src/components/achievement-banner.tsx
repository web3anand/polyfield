import { Card } from "@/components/ui/card";
import { Trophy, Target, TrendingUp, Zap, Award, Star } from "lucide-react";
import type { Achievement } from "@shared/schema";

interface AchievementBannerProps {
  achievements: Achievement[];
}

const iconMap: Record<string, any> = {
  trophy: Trophy,
  target: Target,
  trending: TrendingUp,
  zap: Zap,
  award: Award,
  star: Star,
};

export function AchievementBanner({ achievements }: AchievementBannerProps) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Achievements</h2>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Unlock badges by trading on Polymarket</p>
      </div>
      
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {achievements.map((achievement) => {
          const Icon = iconMap[achievement.icon] || Trophy;
          const isUnlocked = achievement.unlocked;
          
          return (
            <div
              key={achievement.id}
              className="flex-shrink-0"
              data-testid={`achievement-${achievement.id}`}
            >
              <div className="flex flex-col items-center gap-2 w-24">
                <div
                  className={`
                    w-16 h-16 rounded-2xl flex items-center justify-center
                    transition-all duration-300
                    ${isUnlocked 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                      : 'bg-muted/50 text-muted-foreground opacity-60'
                    }
                  `}
                >
                  <Icon className="w-8 h-8" />
                </div>
                <div className="text-center">
                  <p className={`text-xs font-medium ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {achievement.name}
                  </p>
                  {!isUnlocked && (
                    <p className="text-xs text-muted-foreground">
                      {achievement.progress}/{achievement.total}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </Card>
  );
}
