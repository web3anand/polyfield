import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
}

function AnimatedTrendingUp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function AnimatedTrendingDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

function AnimatedActivity({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function AnimatedDollarSign({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function AnimatedPercent({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

export const AnimatedIcons = {
  TrendingUp: AnimatedTrendingUp,
  TrendingDown: AnimatedTrendingDown,
  Activity: AnimatedActivity,
  DollarSign: AnimatedDollarSign,
  Percent: AnimatedPercent,
};

export function StatCard({ icon, label, value, suffix, color = "text-foreground" }: StatCardProps) {
  return (
    <Card className="h-full p-4 md:p-5 border-border/50 group hover:border-border transition-colors duration-300">
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
        <div className={`p-2.5 md:p-3 rounded-xl ${color} bg-gradient-to-br from-background to-muted/20 border border-border/50 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}