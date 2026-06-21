import React from 'react';
import { Sun, Moon } from 'lucide-react';

export type Theme = 'light' | 'dark';

interface ThemeSwitcherProps {
  theme: Theme;
  onToggle: () => void;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, onToggle }) => {
  return (
    <button
      className="theme-switcher"
      onClick={onToggle}
      aria-label="切换主题"
    >
      {theme === 'light' ? (
        <Moon size={20} strokeWidth={2} />
      ) : (
        <Sun size={20} strokeWidth={2} />
      )}
    </button>
  );
};
