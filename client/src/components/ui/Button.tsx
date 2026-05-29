import * as React from "react"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading = false, children, disabled, ...props }, ref) => {

    // ── Neobrutalism base ──────────────────────────────────────────────────────
    // Every non-ghost/link variant gets:
    //   • thick 2px black border
    //   • a hard offset box-shadow (the "neo" shadow)
    //   • on hover: shadow shrinks + button translates down-right (press illusion)
    //   • on active/click: shadow disappears + full translate (full press)
    //
    // Colors are vivid and flat — no gradients, no blur.

    const variants = {
      // ── Primary — vivid indigo/blue ──────────────────────────────────────────
      default: [
        "bg-indigo-500 text-white",
        "border-2 border-black",
        "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
        "hover:bg-indigo-600 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]",
        "active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
      ].join(" "),

      // ── Destructive — vivid red ───────────────────────────────────────────────
      destructive: [
        "bg-red-500 text-white",
        "border-2 border-black",
        "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
        "hover:bg-red-600 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]",
        "active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
      ].join(" "),

      // ── Outline — white/card bg with black border ─────────────────────────────
      outline: [
        "bg-background text-foreground",
        "border-2 border-black dark:border-white/80",
        "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.5)]",
        "hover:bg-muted hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]",
        "active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
      ].join(" "),

      // ── Secondary — amber/yellow ──────────────────────────────────────────────
      secondary: [
        "bg-amber-400 text-black",
        "border-2 border-black",
        "shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]",
        "hover:bg-amber-500 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]",
        "active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
      ].join(" "),

      // ── Ghost — no border, no shadow, subtle hover ────────────────────────────
      ghost: [
        "bg-transparent text-foreground",
        "border-2 border-transparent",
        "hover:bg-muted hover:border-border",
      ].join(" "),

      // ── Link — plain text link ────────────────────────────────────────────────
      link: "text-primary underline-offset-4 hover:underline",
    }

    const sizes = {
      default: "h-10 px-4 py-2 rounded-md text-sm",
      sm:      "h-8  px-3 py-1 rounded-md text-xs",
      lg:      "h-12 px-6 py-2 rounded-md text-base",
      icon:    "h-9  w-9  rounded-md",
    }

    return (
      <button
        className={cn(
          // Base
          "inline-flex items-center justify-center whitespace-nowrap font-semibold",
          "ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-40",
          // Smooth transition for transform + colors (shadow is CSS so transitions via Tailwind)
          "transition-all duration-100 ease-out",
          // Focus ring
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/50 focus-visible:ring-offset-2",
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
