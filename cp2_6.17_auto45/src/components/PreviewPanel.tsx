import React, { useEffect, useState, useRef } from 'react';
import { Theme } from '../types';

interface PreviewPanelProps {
  currentTheme: Theme;
  compareTheme?: Theme | null;
  compareMode: boolean;
}

const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

const getThemeVars = (theme: Theme): React.CSSProperties => ({
  '--theme-primary': theme.primary,
  '--theme-secondary': theme.secondary,
  '--theme-background': theme.background,
  '--theme-text': theme.text,
  '--theme-card-bg': lightenColor(theme.background, 10),
  '--theme-primary-light': lightenColor(theme.primary, 10),
  '--theme-secondary-alpha': `${theme.secondary}15`,
  '--theme-secondary-glow': `${theme.secondary}50`,
  '--theme-primary-shadow': `${theme.primary}40`,
} as React.CSSProperties);

interface ComponentSetProps {
  theme: Theme;
  prefix?: string;
}

const ComponentSet: React.FC<ComponentSetProps> = ({ theme }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 20,
        padding: '24px 24px',
        alignContent: 'start',
        width: '100%',
        ...getThemeVars(theme),
        transition: 'all 0.3s ease'
      }}
    >
      <ComponentWrapper
        label="主按钮"
        varName="--primary"
        varValue={theme.primary}

      >
        <button
          className="preview-primary-btn"
          style={{
            padding: '12px 28px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: 'var(--theme-primary)',
            color: 'var(--theme-text)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px var(--theme-primary-shadow)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = lightenColor(theme.primary, 10);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = theme.primary;
          }}
        >
          Primary Button
        </button>
      </ComponentWrapper>

      <ComponentWrapper
        label="次级按钮"
        varName="--secondary"
        varValue={theme.secondary}

      >
        <button
          style={{
            padding: '12px 28px',
            borderRadius: 8,
            border: '1px solid var(--theme-secondary)',
            backgroundColor: 'transparent',
            color: 'var(--theme-secondary)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--theme-secondary-alpha)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Secondary Button
        </button>
      </ComponentWrapper>

      <ComponentWrapper
        label="卡片"
        varName="--background"
        varValue={lightenColor(theme.background, 10)}

        gridColumn={2}
      >
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            backgroundColor: 'var(--theme-card-bg)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            width: '100%'
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--theme-text)', marginBottom: 8, transition: 'color 0.3s ease' }}>
            Card Title
          </h3>
          <p style={{ fontSize: 13, color: 'var(--theme-text)', opacity: 0.7, lineHeight: 1.6, transition: 'color 0.3s ease' }}>
            这是一张示例卡片，用于展示主题在卡片组件上的应用效果。卡片背景色为主题背景色提亮10%。
          </p>
        </div>
      </ComponentWrapper>

      <ComponentWrapper
        label="输入框"
        varName="--secondary"
        varValue={theme.secondary}

      >
        <input
          type="text"
          placeholder="请输入内容..."
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid var(--theme-secondary)',
            backgroundColor: 'transparent',
            color: 'var(--theme-text)',
            fontSize: 14,
            outline: 'none',
            transition: 'all 0.25s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderWidth = '2px';
            e.currentTarget.style.boxShadow = '0 0 12px var(--theme-secondary-glow)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderWidth = '1px';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </ComponentWrapper>

      <ComponentWrapper
        label="进度条"
        varName="--primary"
        varValue={theme.primary}

      >
        <div style={{ width: '100%' }}>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'var(--theme-primary)',
              opacity: 0.2,
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
          >
            <div
              style={{
                width: '65%',
                height: '100%',
                borderRadius: 4,
                backgroundColor: 'var(--theme-primary)',
                transition: 'all 0.3s ease'
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--theme-text)', opacity: 0.6, transition: 'color 0.3s ease' }}>
            65%
          </div>
        </div>
      </ComponentWrapper>
    </div>
  );
};

interface ComponentWrapperProps {
  label: string;
  varName: string;
  varValue: string;
  children: React.ReactNode;
  gridColumn?: number;
}

const ComponentWrapper: React.FC<ComponentWrapperProps> = ({
  label,
  varName,
  varValue,
  children,
  gridColumn
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        gridColumn: gridColumn ? `span ${gridColumn}` : undefined,
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--theme-text)', opacity: 0.5, fontWeight: 500, transition: 'color 0.3s ease' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {children}
      </div>
      <div style={{ fontSize: 11, color: '#999', fontFamily: 'monospace' }}>
        {varName}: {varValue}
      </div>
    </div>
  );
};

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  currentTheme,
  compareTheme,
  compareMode
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const containerStyle: React.CSSProperties = {
    flex: 1,
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    transition: 'all 0.3s ease',
    position: 'relative'
  };

  if (!compareMode) {
    return (
      <div
        ref={containerRef}
        style={{
          ...containerStyle,
          ...getThemeVars(currentTheme),
          backgroundColor: 'var(--theme-background)'
        }}
      >
        <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', overflow: 'auto', height: '100%' }}>
          <div style={{
            padding: '32px 24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: 'var(--theme-primary)',
              transition: 'background-color 0.3s ease'
            }} />
            <h2 style={{
              fontSize: 20,
              fontWeight: 600,
              color: 'var(--theme-text)',
              transition: 'color 0.3s ease'
            }}>
              {currentTheme.name}
            </h2>
          </div>
          <ComponentSet theme={currentTheme} />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={containerStyle}>
      <div
        style={{
          flex: 1,
          ...getThemeVars(currentTheme),
          backgroundColor: 'var(--theme-background)',
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'relative'
        }}
      >
        <div className="compare-divider" style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: isMobile ? '100%' : 0,
          height: isMobile ? 0 : '100%',
          zIndex: 1,
          pointerEvents: 'none'
        }}>
          {!isMobile && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: -0.5,
              width: 1,
              borderRight: '1px dashed rgba(255,255,255,0.3)',
            }} />
          )}
          {isMobile && (
            <div style={{
              position: 'absolute',
              bottom: -0.5,
              left: 0,
              right: 0,
              height: 1,
              borderBottom: '1px dashed rgba(255,255,255,0.3)',
            }} />
          )}
        </div>

        <div style={{
          padding: '24px 24px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'var(--theme-primary)',
            transition: 'background-color 0.3s ease'
          }} />
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--theme-text)',
            transition: 'color 0.3s ease'
          }}>
            A · {currentTheme.name}
          </span>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <ComponentSet theme={currentTheme} />
        </div>
      </div>

      {compareTheme && (
        <div
          style={{
            flex: 1,
            ...getThemeVars(compareTheme),
            backgroundColor: 'var(--theme-background)',
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            position: 'relative'
          }}
        >
          <div style={{
            padding: '24px 24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--theme-primary)',
              transition: 'background-color 0.3s ease'
            }} />
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--theme-text)',
              transition: 'color 0.3s ease'
            }}>
              B · {compareTheme.name}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            <ComponentSet theme={compareTheme} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
