import * as React from "react"
import { cn } from "../../lib/utils"

type StatusType =
  | "active" | "closed" | "archived" | "draft"
  | "in_review" | "approved" | "produced"
  | "pending" | "uploading" | "completed" | "error" | "duplicate"
  | "online" | "offline"

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string
  size?: "sm" | "md"
}

const statusConfig: Record<StatusType, { label: string; classes: string; dot: string }> = {
  active:    { label: "Active",    classes: "bg-primary/10 text-primary border-primary/20",              dot: "bg-primary" },
  closed:    { label: "Closed",    classes: "bg-success/10 text-success border-success/20",              dot: "bg-success" },
  archived:  { label: "Archived",  classes: "bg-warning/10 text-warning border-warning/20",              dot: "bg-warning" },
  draft:     { label: "Draft",     classes: "bg-muted text-muted-foreground border-border",              dot: "bg-muted-foreground" },
  in_review: { label: "In Review", classes: "bg-warning/10 text-warning border-warning/20",              dot: "bg-warning" },
  approved:  { label: "Approved",  classes: "bg-primary/10 text-primary border-primary/20",              dot: "bg-primary" },
  produced:  { label: "Produced",  classes: "bg-success/10 text-success border-success/20",              dot: "bg-success" },
  pending:   { label: "Pending",   classes: "bg-muted text-muted-foreground border-border",              dot: "bg-muted-foreground" },
  uploading: { label: "Uploading", classes: "bg-primary/10 text-primary border-primary/20",              dot: "bg-primary animate-pulse" },
  completed: { label: "Completed", classes: "bg-success/10 text-success border-success/20",              dot: "bg-success" },
  error:     { label: "Error",     classes: "bg-destructive/10 text-destructive border-destructive/20",  dot: "bg-destructive" },
  duplicate: { label: "Duplicate", classes: "bg-warning/10 text-warning border-warning/20",              dot: "bg-warning" },
  online:    { label: "Online",    classes: "bg-success/10 text-success border-success/20",              dot: "bg-success animate-pulse" },
  offline:   { label: "Offline",   classes: "bg-muted text-muted-foreground border-border",              dot: "bg-muted-foreground" },
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, size = "sm", className, ...props }, ref) => {
    const key = status.toLowerCase().replace(/ /g, "_") as StatusType
    const config = statusConfig[key] || {
      label: status,
      classes: "bg-muted text-muted-foreground border-border",
      dot: "bg-muted-foreground",
    }

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border font-medium",
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
          config.classes,
          className
        )}
        {...props}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
        {config.label}
      </span>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge }
