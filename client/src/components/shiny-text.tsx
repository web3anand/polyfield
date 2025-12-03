import { cn } from "@/lib/utils";

interface ShinyTextProps {
  children: React.ReactNode;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "p" | "div";
}

export function ShinyText({ children, className, as: Component = "span" }: ShinyTextProps) {
  return (
    <Component
      className={cn(
        "animate-shimmer",
        className
      )}
    >
      {children}
    </Component>
  );
}

