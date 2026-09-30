import { Moon, Sun } from 'lucide-react';

export function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      className="icon-button theme-toggle"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}