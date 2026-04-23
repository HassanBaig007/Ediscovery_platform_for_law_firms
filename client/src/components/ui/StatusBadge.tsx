import * as React from "react"
import { cn } from "../../lib/utils"
import { formatCaseStatus, formatPrivilegeStatus, formatRelevanceStatus, formatProductionStatus } from "../../utils/formatters"
import { CaseStatus, PrivilegeStatus, RelevanceStatus, ProductionSetStatus } from "../../../../shared/types"

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string
  type?: "case" | "privilege" | "relevance" | "production" | "default"
  size?: "sm" | "md"
}

const getStatusConfig = (status: string, type: "case" | "privilege" | "relevance" | "production" | "default" = "default") => {
    let label = status;
    const normalizedStatus = status.toUpperCase().replace(/ /g, "_");

    switch(type) {
        case "case":
            label = formatCaseStatus(normalizedStatus as CaseStatus);
            break;
        case "privilege":
            label = formatPrivilegeStatus(normalizedStatus as PrivilegeStatus);
            break;
        case "relevance":
            label = formatRelevanceStatus(normalizedStatus as RelevanceStatus);
            break;
        case "production":
            label = formatProductionStatus(normalizedStatus as ProductionSetStatus);
            break;
        default:
            const statusKey = status.toLowerCase().replace(/_/g, " ");
            label = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
    }

    const key = normalizedStatus.toLowerCase();
    
    // Determine styles based on key words in the status
    let classes = "bg-muted text-muted-foreground border-border";
    let dot = "bg-muted-foreground";

    if (["active", "approved", "completed", "success", "produced", "online"].includes(key)) {
        classes = "bg-success/10 text-success border-success/20";
        dot = "bg-success";
    } else if (["closed", "archived", "error", "failed", "rejected", "offline", "destructive"].includes(key)) {
        classes = "bg-destructive/10 text-destructive border-destructive/20";
        dot = "bg-destructive";
    } else if (["in_review", "pending", "draft", "warning", "needs_review"].includes(key)) {
        classes = "bg-warning/10 text-warning border-warning/20";
        dot = "bg-warning";
    } else if (["uploading", "processing", "primary", "highly_relevant", "attorney_client", "work_product", "relevant"].includes(key)) {
        classes = "bg-primary/10 text-primary border-primary/20";
        dot = "bg-primary";
    }

    if (["uploading", "processing", "online"].includes(key)) {
        dot += " animate-pulse";
    }

    return { label, classes, dot };
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, type = "default", size = "sm", className, ...props }, ref) => {
    const config = getStatusConfig(status, type);

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
