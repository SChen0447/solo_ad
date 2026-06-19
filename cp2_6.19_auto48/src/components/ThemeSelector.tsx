import React from 'react';
import { themes } from '../config/themes';
import type { Theme } from '../types';

interface ThemeSelectorProps {
  selectedTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ selectedTheme, onThemeChange }) => {
  return (
    <div className="theme-section">
      <div className="section-title">主题色</div>
      <div className="theme-list">
        {themes.map((theme) => (
          <div
            key={theme.id}
            className={`theme-card ${selectedTheme.id === theme.id ? 'selected' : ''}`}
            style={{ backgroundColor: theme.primaryColor }}
            onClick={() => onThemeChange(theme)}
            title={theme.name}
          >
            {theme.name.slice(0, 2)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;
