import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  icon?: React.ReactNode
}

const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ className, children, label, icon, id, ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground mb-1.5 block">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
          <select
            ref={ref}
            id={id}
            className={cn(
              "flex h-11 w-full rounded-xl border border-input bg-background text-sm ring-offset-background",
              "appearance-none cursor-pointer",
              "transition-[border-color,box-shadow] duration-200 ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:border-primary/60",
              "disabled:cursor-not-allowed disabled:opacity-50",
              icon ? "pl-10 pr-10" : "pl-3 pr-10",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
    )
  }
)
SelectField.displayName = "SelectField"

export { SelectField }
