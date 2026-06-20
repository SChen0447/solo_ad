import React, { useState, useRef, useEffect } from 'react';
import { THEMES } from '../store/types';
import { useAppStore } from '../store';

const ThemeSelector: React.FC = () => {
  const { activeThemeId, setActiveThemeId, setCurrentTheme } = useAppStore();
  const [prevThemeId, setPrevThemeId] = useState<string | null>(null);
  const [animatingThemeId, setAnimatingThemeId] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const handleThemeClick = (theme: typeof THEMES[number]) => {
    if (activeThemeId === theme.id) {
      setPrevThemeId(activeThemeId);
      setAnimatingThemeId(theme.id);
      setActiveThemeId(null);
      setCurrentTheme(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setAnimatingThemeId(null);
        setPrevThemeId(null);
      }, 300);
    } else {
      setPrevThemeId(activeThemeId);
      setAnimatingThemeId(theme.id);
      setActiveThemeId(theme.id);
      setCurrentTheme(theme.name);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setAnimatingThemeId(null);
        setPrevThemeId(null);
      }, 300);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getCardAnimation = (themeId: string) => {
    if (animatingThemeId === themeId && activeThemeId === themeId) {
      return 'slide-in-right 0.3s ease-out forwards';
    }
    if (prevThemeId === themeId && animatingThemeId !== null) {
      return 'slide-out-left 0.3s ease-in forwards';
    }
    return 'none';
  };

  return (
    <>
      <style>{`
        @keyframes slide-out-left {
          0% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateX(-30px) scale(0.8);
          }
        }
        @keyframes slide-in-right {
          0% {
            opacity: 0;
            transform: translateX(30px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
      <div className="flex flex-wrap justify-center gap-3 py-4">
        {THEMES.map((theme) => {
          const isActive = activeThemeId === theme.id;
          const animation = getCardAnimation(theme.id);

          return (
            <button
              key={theme.id}
              onClick={() => handleThemeClick(theme)}
              style={{
                width: '140px',
                background: theme.gradient,
                borderRadius: '8px',
                padding: '16px 12px',
                border: isActive ? '2px solid rgba(255,255,255,0.8)' : '2px solid transparent',
                boxShadow: isActive
                  ? `0 0 20px rgba(108,99,255,0.5), 0 4px 12px rgba(0,0,0,0.3)`
                  : '0 2px 8px rgba(0,0,0,0.3)',
                transform: isActive ? 'scale(1.08)' : 'scale(1)',
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                animation,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                opacity: prevThemeId === theme.id && animatingThemeId !== null ? 0 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isActive && !(prevThemeId === theme.id && animatingThemeId !== null)) {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(108,99,255,0.4), 0 4px 12px rgba(0,0,0,0.3)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
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
          );
        })}
      </div>
    </>
  );
};

export default ThemeSelector;
