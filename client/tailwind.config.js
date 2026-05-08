/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontSize: {
                // Accessibility-oriented fixed product scale
                xs: ['0.875rem', { lineHeight: '1.25rem' }],   // 14px
                sm: ['0.9375rem', { lineHeight: '1.375rem' }], // 15px
                base: ['1rem', { lineHeight: '1.55rem' }],     // 16px
                lg: ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
                xl: ['1.25rem', { lineHeight: '1.8rem' }],     // 20px
                '2xl': ['1.5rem', { lineHeight: '2.05rem' }],  // 24px
                '3xl': ['1.875rem', { lineHeight: '2.35rem' }],// 30px
            },
            fontFamily: {
                sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Plus Jakarta Sans', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                success: {
                    DEFAULT: "hsl(var(--success))",
                    foreground: "hsl(var(--success-foreground))",
                },
                warning: {
                    DEFAULT: "hsl(var(--warning))",
                    foreground: "hsl(var(--warning-foreground))",
                },
                info: {
                    DEFAULT: "hsl(var(--info))",
                    foreground: "hsl(var(--info-foreground))",
                },
                purple: {
                    DEFAULT: "hsl(var(--purple))",
                    foreground: "hsl(var(--purple-foreground))",
                },
                sidebar: {
                    DEFAULT: "hsl(var(--sidebar-bg))",
                    foreground: "hsl(var(--sidebar-fg))",
                    muted: "hsl(var(--sidebar-muted))",
                    border: "hsl(var(--sidebar-border))",
                    accent: "hsl(var(--sidebar-accent))",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                xl: "calc(var(--radius) + 4px)",
                "2xl": "calc(var(--radius) + 8px)",
            },
            boxShadow: {
                'xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
                'elevation-1': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
                'elevation-2': '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
                'elevation-3': '0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
                'elevation-4': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.04)',
                'glow-primary': '0 0 20px -5px hsl(var(--primary) / 0.4)',
                'glow-accent': '0 0 20px -5px hsl(var(--accent) / 0.4)',
                'inner-glow': 'inset 0 1px 0 0 rgb(255 255 255 / 0.05)',
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                "fade-in": {
                    from: { opacity: "0" },
                    to: { opacity: "1" },
                },
                "fade-in-up": {
                    from: { opacity: "0", transform: "translateY(8px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                "fade-in-down": {
                    from: { opacity: "0", transform: "translateY(-8px)" },
                    to: { opacity: "1", transform: "translateY(0)" },
                },
                "slide-in-from-bottom": {
                    from: { transform: "translateY(16px)", opacity: "0" },
                    to: { transform: "translateY(0)", opacity: "1" },
                },
                "slide-in-from-right": {
                    from: { transform: "translateX(16px)", opacity: "0" },
                    to: { transform: "translateX(0)", opacity: "1" },
                },
                "slide-in-from-left": {
                    from: { transform: "translateX(-100%)" },
                    to: { transform: "translateX(0)" },
                },
                "slide-out-to-left": {
                    from: { transform: "translateX(0)" },
                    to: { transform: "translateX(-100%)" },
                },
                "scale-in": {
                    from: { transform: "scale(0.95)", opacity: "0" },
                    to: { transform: "scale(1)", opacity: "1" },
                },
                "shimmer": {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                "pulse-soft": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.6" },
                },
                "float": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-6px)" },
                },
                "progress-fill": {
                    from: { width: "0%" },
                    to: { width: "var(--progress-value)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.3s ease-out",
                "fade-in-up": "fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                "fade-in-down": "fade-in-down 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-up": "slide-in-from-bottom 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-in-right": "slide-in-from-right 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-in-left": "slide-in-from-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                "slide-out-left": "slide-out-to-left 0.2s ease-in",
                "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                "shimmer": "shimmer 2s linear infinite",
                "pulse-soft": "pulse-soft 2s ease-in-out infinite",
                "float": "float 3s ease-in-out infinite",
                "progress-fill": "progress-fill 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            },
            transitionTimingFunction: {
                'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
                'micro': 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
        },
    },
    plugins: [],
}
