import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "../../lib/utils"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  variant?: "default" | "primary" | "success" | "warning" | "destructive" | "info" | "purple"
  subtitle?: string
}

const variantStyles = {
  default: {
    card: "bg-card border-border",
    icon: "bg-muted text-muted-foreground",
    label: "text-muted-foreground",
    value: "text-foreground",
  },
  primary: {
    card: "bg-primary/5 border-primary/20 dark:bg-primary/10",
    icon: "bg-primary/15 text-primary dark:bg-primary/20",
    label: "text-primary/70 dark:text-primary/80",
    value: "text-foreground",
  },
  success: {
    card: "bg-success/5 border-success/20 dark:bg-success/10",
    icon: "bg-success/15 text-success dark:bg-success/20",
    label: "text-success/70 dark:text-success/80",
    value: "text-foreground",
  },
  warning: {
    card: "bg-warning/5 border-warning/20 dark:bg-warning/10",
    icon: "bg-warning/15 text-warning dark:bg-warning/20",
    label: "text-warning/70 dark:text-warning/80",
    value: "text-foreground",
  },
  destructive: {
    card: "bg-destructive/5 border-destructive/20 dark:bg-destructive/10",
    icon: "bg-destructive/15 text-destructive dark:bg-destructive/20",
    label: "text-destructive/70 dark:text-destructive/80",
    value: "text-foreground",
  },
  info: {
    card: "bg-sky-500/5 border-sky-500/20 dark:bg-sky-500/10",
    icon: "bg-sky-500/15 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
    label: "text-sky-600/70 dark:text-sky-400/80",
    value: "text-foreground",
  },
  purple: {
    card: "bg-purple-500/5 border-purple-500/20 dark:bg-purple-500/10",
    icon: "bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    label: "text-purple-600/70 dark:text-purple-400/80",
    value: "text-foreground",
  },
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, icon: Icon, trend, variant = "default", subtitle, ...props }, ref) => {
    const styles = variantStyles[variant]

    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5 transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-lg",
          styles.card,
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn("text-xs font-semibold uppercase tracking-wider", styles.label)}>
              {label}
            </p>
            <p className={cn("text-2xl font-bold tracking-tight", styles.value)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p className={cn(
                "text-xs font-medium",
                trend.positive ? "text-success" : "text-destructive"
              )}>
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className={cn("rounded-xl p-2.5", styles.icon)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    )
  }
)
StatCard.displayName = "StatCard"

export { StatCard }
