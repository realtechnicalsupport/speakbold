import { Moon, Sun } from "lucide-react"
import { useTheme } from "./theme-provider"
import { motion } from "framer-motion"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative h-10 w-10 rounded-full border border-border/60 flex items-center justify-center hover:bg-muted transition-colors overflow-hidden"
      title="Toggle theme"
    >
      <motion.div
        initial={false}
        animate={{
          y: theme === "dark" ? 0 : 40,
          opacity: theme === "dark" ? 1 : 0
        }}
        className="absolute"
      >
        <Moon className="h-4 w-4 text-primary" strokeWidth={2} />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          y: theme === "light" ? 0 : -40,
          opacity: theme === "light" ? 1 : 0
        }}
        className="absolute"
      >
        <Sun className="h-4 w-4 text-primary" strokeWidth={2} />
      </motion.div>
    </button>
  )
}
