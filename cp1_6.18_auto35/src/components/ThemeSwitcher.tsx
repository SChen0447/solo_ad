import React, { useEffect, useRef } from 'react';
import { useResumeStore } from '../store/resumeStore';
import { THEMES } from '../types';

export const ThemeSwitcher: React.FC = () => {
  const { currentTheme, setTheme, isThemePanelOpen, toggleThemePanel } = useResumeStore();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', currentTheme.primary);
    root.style.setProperty('--secondary', currentTheme.secondary);
    root.style.setProperty('--bg-canvas', currentTheme.background);
    root.style.setProperty('--card-bg', currentTheme.cardBg);
    root.style.setProperty('--text-primary', currentTheme.textColor);
    root.style.setProperty('--text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--border-color', currentTheme.borderColor);
    root.style.setProperty('--divider-color', currentTheme.dividerColor);
  }, [currentTheme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isThemePanelOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        toggleThemePanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isThemePanelOpen, toggleThemePanel]);

  return (
    <div className="theme-switcher" ref={panelRef}>
      {isThemePanelOpen && (
        <div className="theme-panel">
          {THEMES.map((theme) => (
            <div
              key={theme.id}
              className={`theme-option ${
                currentTheme.id === theme.id ? 'active' : ''
              }`}
              onClick={() => setTheme(theme.id)}
              title={theme.name}
            >
              <div className="theme-preview">
                <div
                  className="theme-preview-primary"
                  style={{ backgroundColor: theme.primary }}
                />
                <div
                  className="theme-preview-secondary"
                  style={{ backgroundColor: theme.secondary }}
                />
                <div
                  className="theme-preview-bg"
                  style={{ backgroundColor: theme.background }}
                />
              </div>
              <div className="theme-name">{theme.name}</div>
            </div>
          ))}
        </div>
      )}
      <button
        className="theme-switcher-btn"
        onClick={() => toggleThemePanel()}
        title="切换主题"
      >
        🎨
      </button>
    </div>
  );
};
