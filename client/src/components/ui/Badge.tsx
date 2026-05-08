import * as React from "react"
import { cn } from "../../lib/utils"

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple"
  className?: string
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-primary/12 text-primary border-primary/20",
      secondary: "bg-muted text-muted-foreground border-transparent",
      destructive: "bg-destructive/12 text-destructive border-destructive/20",
      outline: "bg-transparent border-border text-foreground",
      success: "bg-success/12 text-success border-success/20",
      warning: "bg-warning/12 text-warning border-warning/20",
      info: "bg-info/12 text-info border-info/20",
      purple: "bg-purple/12 text-purple border-purple/20",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold leading-5",
          "transition-colors duration-200 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
