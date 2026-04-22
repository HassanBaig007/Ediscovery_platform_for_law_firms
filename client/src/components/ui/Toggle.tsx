import * as React from "react"
import { cn } from "../../lib/utils"

interface ToggleProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  className?: string
}

const Toggle: React.FC<ToggleProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  description,
  className,
}) => {
  const generatedId = React.useId()
  const toggleId = id || generatedId

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {(label || description) && (
        <div className="space-y-0.5">
          {label && (
            <label
              htmlFor={toggleId}
              className={cn(
                "text-sm font-medium cursor-pointer select-none",
                disabled ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <button
        id={toggleId}
        role="switch"
        type="button"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary" : "bg-muted-foreground/25"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-md ring-0",
            "transition-transform duration-200 ease-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  )
}

export { Toggle }
