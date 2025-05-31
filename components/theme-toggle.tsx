import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Small button that toggles between light and dark themes using the `dark` class on <html>
// The current theme preference is saved in localStorage so it persists across page refreshes.
export function ThemeToggle() {
  // Track whether dark mode is currently active
  const [isDark, setIsDark] = useState<boolean>(false)

  // Initialise theme from localStorage or system preference
  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = window.localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = saved === 'dark' || (!saved && prefersDark)

    document.documentElement.classList.toggle('dark', shouldUseDark)
    setIsDark(shouldUseDark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    document.documentElement.classList.toggle('dark', next)
    window.localStorage.setItem('theme', next ? 'dark' : 'light')
    setIsDark(next)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-8 h-8"
      aria-label="Toggle appearance"
      title="Toggle appearance"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  )
} 