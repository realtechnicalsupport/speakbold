import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "960px",
        xl: "1140px",
        "2xl": "1320px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
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
          glow: "hsl(var(--primary-glow))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      boxShadow: {
        'glow': '0 0 20px hsl(var(--primary) / 0.3)',
        'soft': '0 20px 40px rgba(0, 0, 0, 0.1)',
        'clay':              '8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.8), inset 2px 2px 8px rgba(255,255,255,0.9), inset -2px -2px 8px rgba(0,0,0,0.05)',
        'clay-dark':         '8px 8px 16px rgba(0,0,0,0.4), -8px -8px 16px rgba(255,255,255,0.02), inset 2px 2px 8px rgba(255,255,255,0.05), inset -2px -2px 8px rgba(0,0,0,0.4)',
        'clay-primary':      '6px 6px 12px rgba(255,77,0,0.25), -6px -6px 12px rgba(255,255,255,0.8), inset 2px 2px 6px rgba(255,255,255,0.4), inset -2px -2px 6px rgba(200,50,0,0.3)',
        'clay-primary-dark': '6px 6px 12px rgba(255,77,0,0.4), -6px -6px 12px rgba(255,255,255,0.05), inset 2px 2px 6px rgba(255,255,255,0.2), inset -2px -2px 6px rgba(200,50,0,0.5)',
        'clay-inset':        'inset 6px 6px 12px rgba(0,0,0,0.06), inset -6px -6px 12px rgba(255,255,255,0.8)',
        'clay-inset-dark':   'inset 6px 6px 12px rgba(0,0,0,0.4), inset -6px -6px 12px rgba(255,255,255,0.03)',
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
