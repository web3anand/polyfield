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
    <Card className="p-6 h-[120px] flex flex-col justify-between">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <div className={`p-2 bg-primary/5 ${color}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-bold tabular-nums ${color}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {value}
        </p>
        {suffix && (
          <p className="text-sm text-muted-foreground">{suffix}</p>
        )}
      </div>
    </Card>
  );
}
