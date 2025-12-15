import * as React from "react"
import { cn } from "@/lib/utils"

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "activate" | "success" | "pulse" | "liquid"
  color?: "emerald" | "blue" | "purple" | "orange"
}

const colorMap = {
  emerald: {
    border: "border-emerald-500",
    text: "text-emerald-500",
    bg: "bg-emerald-500",
    glow: "shadow-emerald-500/50",
    gradient: "from-emerald-400 via-emerald-500 to-emerald-600",
  },
  blue: {
    border: "border-blue-500",
    text: "text-blue-500",
    bg: "bg-blue-500",
    glow: "shadow-blue-500/50",
    gradient: "from-blue-400 via-blue-500 to-blue-600",
  },
  purple: {
    border: "border-purple-500",
    text: "text-purple-500",
    bg: "bg-purple-500",
    glow: "shadow-purple-500/50",
    gradient: "from-purple-400 via-purple-500 to-purple-600",
  },
  orange: {
    border: "border-orange-500",
    text: "text-orange-500",
    bg: "bg-orange-500",
    glow: "shadow-orange-500/50",
    gradient: "from-orange-400 via-orange-500 to-orange-600",
  },
}

export function AnimatedButton({ 
  children, 
  className, 
  variant = "activate",
  color = "emerald",
  onClick,
  ...props 
}: AnimatedButtonProps) {
  const [isActivated, setIsActivated] = React.useState(false)
  const [isAnimating, setIsAnimating] = React.useState(false)
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([])
  const buttonRef = React.useRef<HTMLButtonElement>(null)
  const colors = colorMap[color]

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isAnimating) return
    
    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) {
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setRipples(prev => [...prev, { x, y, id: Date.now() }])
    }
    
    setIsAnimating(true)
    
    setTimeout(() => {
      setIsActivated(true)
    }, 400)
    
    setTimeout(() => {
      setIsAnimating(false)
      onClick?.(e)
    }, 800)
    
    setTimeout(() => {
      setRipples([])
    }, 1000)
  }

  const resetButton = () => {
    setIsActivated(false)
    setIsAnimating(false)
  }

  if (variant === "liquid") {
    return (
      <button
        ref={buttonRef}
        className={cn(
          "relative overflow-hidden px-8 py-3 font-semibold text-sm uppercase tracking-wider",
          "border-2 rounded-none transition-all duration-500",
          colors.border, colors.text,
          "hover:shadow-lg",
          isActivated && `${colors.bg} text-white shadow-lg ${colors.glow}`,
          className
        )}
        onClick={handleClick}
        onMouseLeave={resetButton}
        {...props}
      >
        <span className={cn(
          "absolute inset-0 origin-center",
          colors.bg,
          "transition-all duration-500 ease-out",
          isAnimating ? "scale-150 opacity-100" : "scale-0 opacity-0",
          "rounded-full"
        )} style={{
          left: ripples[0]?.x || '50%',
          top: ripples[0]?.y || '50%',
          transform: isAnimating ? 'translate(-50%, -50%) scale(3)' : 'translate(-50%, -50%) scale(0)',
        }} />
        
        <span className={cn(
          "relative z-10 flex items-center justify-center gap-2 transition-all duration-300",
          isActivated && "text-white"
        )}>
          {isActivated ? (
            <svg className="w-5 h-5 animate-success-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" className="animate-draw-check" />
            </svg>
          ) : children}
        </span>
      </button>
    )
  }

  if (variant === "pulse") {
    return (
      <button
        ref={buttonRef}
        className={cn(
          "relative overflow-hidden px-8 py-3 font-semibold text-sm uppercase tracking-wider",
          "border-2 rounded-none",
          colors.border, colors.text,
          "group",
          isActivated && "animate-pulse-glow",
          className
        )}
        onClick={handleClick}
        onMouseLeave={resetButton}
        {...props}
      >
        <span className={cn(
          "absolute inset-0 bg-gradient-to-r",
          colors.gradient,
          "transform transition-transform duration-700 ease-out",
          isAnimating ? "translate-x-0" : "-translate-x-full"
        )} />
        
        <span className="absolute inset-0 flex items-center justify-center">
          {ripples.map(({ x, y, id }) => (
            <span
              key={id}
              className={cn("absolute w-4 h-4 rounded-full", colors.bg, "opacity-50")}
              style={{
                left: x,
                top: y,
                animation: 'ripple-expand 0.6s ease-out forwards',
              }}
            />
          ))}
        </span>
        
        <span className={cn(
          "relative z-10 flex items-center justify-center gap-2 transition-colors duration-300",
          isAnimating && "text-white"
        )}>
          {isActivated ? (
            <>
              <svg className="w-5 h-5 animate-bounce-once" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Activated!</span>
            </>
          ) : children}
        </span>
      </button>
    )
  }

  if (variant === "success") {
    return (
      <button
        ref={buttonRef}
        className={cn(
          "relative overflow-hidden px-8 py-3 font-semibold text-sm uppercase tracking-wider",
          "border-2 rounded-none transition-all duration-500",
          isActivated 
            ? `${colors.bg} border-transparent text-white shadow-2xl ${colors.glow}` 
            : `${colors.border} ${colors.text} bg-transparent`,
          className
        )}
        onClick={handleClick}
        onMouseLeave={resetButton}
        {...props}
      >
        <span className={cn(
          "absolute inset-0",
          colors.bg,
          "transform origin-bottom transition-transform duration-500 ease-out",
          isAnimating || isActivated ? "scale-y-100" : "scale-y-0"
        )} />
        
        <span className={cn(
          "relative z-10 flex items-center justify-center gap-2 transition-all duration-300",
          (isAnimating || isActivated) && "text-white"
        )}>
          {isActivated ? (
            <span className="flex items-center gap-2 animate-success-pulse">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Done!</span>
            </span>
          ) : children}
        </span>
      </button>
    )
  }

  return (
    <button
      ref={buttonRef}
      className={cn(
        "relative overflow-hidden px-8 py-3 font-semibold text-sm uppercase tracking-wider",
        "border-2 rounded-none transition-all duration-300 group",
        colors.border, colors.text,
        "hover:text-white",
        isActivated && `${colors.bg} text-white shadow-xl ${colors.glow}`,
        className
      )}
      onClick={handleClick}
      onMouseLeave={resetButton}
      {...props}
    >
      <span className={cn(
        "absolute inset-0",
        colors.bg,
        "transform origin-left transition-transform duration-500 ease-out",
        isAnimating || isActivated 
          ? "scale-x-100" 
          : "scale-x-0 group-hover:scale-x-100"
      )} />
      
      <span className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none"
      )}>
        {ripples.map(({ x, y, id }) => (
          <span
            key={id}
            className="absolute w-2 h-2 rounded-full bg-white/30"
            style={{
              left: x,
              top: y,
              animation: 'ripple-expand 0.8s ease-out forwards',
            }}
          />
        ))}
      </span>
      
      <span className={cn(
        "relative z-10 flex items-center justify-center gap-2 transition-colors duration-300",
        "group-hover:text-white",
        (isAnimating || isActivated) && "text-white"
      )}>
        {isActivated ? (
          <span className="flex items-center gap-2 animate-success-pulse">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" className="animate-draw-check" />
            </svg>
            <span>Activated!</span>
          </span>
        ) : children}
      </span>
    </button>
  )
}
