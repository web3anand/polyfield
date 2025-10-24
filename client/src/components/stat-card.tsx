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
    <Card className="p-6 hover-elevate transition-all duration-300">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </p>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-bold font-gaming tabular-nums ${color}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {suffix && (
              <p className="text-sm text-muted-foreground">{suffix}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
