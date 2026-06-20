import React from 'react';
import { THEMES } from '../store/types';
import { useAppStore } from '../store';

const ThemeSelector: React.FC = () => {
  const { activeThemeId, setActiveThemeId, setCurrentTheme } = useAppStore();

  const handleThemeClick = (theme: typeof THEMES[number]) => {
    if (activeThemeId === theme.id) {
      setActiveThemeId(null);
      setCurrentTheme(null);
    } else {
      setActiveThemeId(theme.id);
      setCurrentTheme(theme.name);
    }
  };

  return (
    <div className="flex flex-wrap justify-center gap-3 py-4">
      {THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => handleThemeClick(theme)}
          className="theme-card"
          style={{
            width: '140px',
            background: theme.gradient,
            borderRadius: '8px',
            padding: '16px 12px',
            border: activeThemeId === theme.id ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
            boxShadow: activeThemeId === theme.id
              ? `0 0 20px rgba(108,99,255,0.5), 0 4px 12px rgba(0,0,0,0.3)`
              : '0 2px 8px rgba(0,0,0,0.3)',
            transform: activeThemeId === theme.id ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            if (activeThemeId !== theme.id) {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(108,99,255,0.4), 0 4px 12px rgba(0,0,0,0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeThemeId !== theme.id) {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
            }
          }}
        >
          <span style={{ fontSize: '28px' }}>{theme.icon}</span>
          <span style={{
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          }}>
            {theme.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
