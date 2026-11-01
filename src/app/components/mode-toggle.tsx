'use client'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle color theme"
    >
      <Sun className="sun-icon" size={18} aria-hidden="true" />
      <Moon className="moon-icon" size={18} aria-hidden="true" />
    </button>
  )
}
