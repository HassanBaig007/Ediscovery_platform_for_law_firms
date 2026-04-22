import * as React from "react"
import { cn } from "../../lib/utils"

interface TooltipProps {
  content: string
  children: React.ReactElement
  side?: "top" | "bottom" | "left" | "right"
  className?: string
  delayMs?: number
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = "right",
  className,
  delayMs = 200,
}) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    timeoutRef.current = setTimeout(() => setIsVisible(true), delayMs)
  }

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  }

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {isVisible && content && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap",
            "rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium leading-5 text-background",
            "shadow-elevation-2 pointer-events-none",
            "animate-fade-in",
            sideClasses[side],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export { Tooltip }
