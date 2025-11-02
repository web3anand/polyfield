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
    <Card className="p-3 md:p-6 h-[90px] md:h-[120px] flex flex-col justify-between">
      <div className="flex items-start justify-between mb-1 md:mb-2">
        <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <div className={`p-1.5 md:p-2 bg-primary/5 ${color}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1 md:gap-2">
        <p className={`text-lg md:text-2xl font-bold tabular-nums ${color}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </p>
        {suffix && (
          <p className="text-xs md:text-sm text-muted-foreground">{suffix}</p>
        )}
      </div>
    </Card>
  );
}
