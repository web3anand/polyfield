import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
}

export function StatCard({ icon, label, value, suffix, color = "text-foreground" }: StatCardProps) {
  return (
    <Card className="h-full p-4 md:p-5 border-border/50">
      <div className="h-full flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
            {label}
          </p>
          <div className="flex items-baseline gap-1.5">
            <p className={`text-xl md:text-2xl font-bold tabular-nums ${color}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {suffix && (
              <p className="text-xs text-muted-foreground">{suffix}</p>
            )}
          </div>
        </div>
        <div className={`p-2.5 md:p-3 rounded-xl ${color} bg-gradient-to-br from-background to-muted/20 border border-border/50`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
