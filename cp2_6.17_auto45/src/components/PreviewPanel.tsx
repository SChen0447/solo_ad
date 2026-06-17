import React, { useEffect, useState } from 'react';
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

const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

interface ComponentSetProps {
  theme: Theme;
}

const ComponentSet: React.FC<ComponentSetProps> = ({ theme }) => {
  const cardBg = lightenColor(theme.background, 10);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: 20,
        padding: '24px 24px',
        alignContent: 'start',
        width: '100%',
        transition: 'all 0.3s ease'
      }}
    >
      <ComponentWrapper label="主按钮" varName="--primary" varValue={theme.primary} theme={theme}>
        <button
          style={{
            padding: '12px 28px',
            borderRadius: 8,
            border: 'none',
            backgroundColor: theme.primary,
            color: theme.text,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: `0 2px 8px ${theme.primary}40`
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

      <ComponentWrapper label="次级按钮" varName="--secondary" varValue={theme.secondary} theme={theme}>
        <button
          style={{
            padding: '12px 28px',
            borderRadius: 8,
            border: `1px solid ${theme.secondary}`,
            backgroundColor: 'transparent',
            color: theme.secondary,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${theme.secondary}15`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Secondary Button
        </button>
      </ComponentWrapper>

      <ComponentWrapper label="卡片" varName="--background" varValue={cardBg} theme={theme} gridColumn={2}>
        <div
          style={{
            padding: 20,
            borderRadius: 12,
            backgroundColor: cardBg,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transition: 'all 0.3s ease',
            width: '100%'
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
            Card Title
          </h3>
          <p style={{ fontSize: 13, color: theme.text, opacity: 0.7, lineHeight: 1.6 }}>
            这是一张示例卡片，用于展示主题在卡片组件上的应用效果。卡片背景色为主题背景色提亮10%。
          </p>
        </div>
      </ComponentWrapper>

      <ComponentWrapper label="输入框" varName="--secondary" varValue={theme.secondary} theme={theme}>
        <input
          type="text"
          placeholder="请输入内容..."
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: `1px solid ${theme.secondary}`,
            backgroundColor: 'transparent',
            color: theme.text,
            fontSize: 14,
            outline: 'none',
            transition: 'all 0.25s ease'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderWidth = '2px';
            e.currentTarget.style.boxShadow = `0 0 12px ${theme.secondary}50`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderWidth = '1px';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </ComponentWrapper>

      <ComponentWrapper label="进度条" varName="--primary" varValue={theme.primary} theme={theme}>
        <div style={{ width: '100%' }}>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: theme.primary,
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
                backgroundColor: theme.primary,
                transition: 'all 0.3s ease'
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: theme.text, opacity: 0.6 }}>
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
  theme: Theme;
  children: React.ReactNode;
  gridColumn?: number;
}

const ComponentWrapper: React.FC<ComponentWrapperProps> = ({
  label,
  varName,
  varValue,
  theme,
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
      <div style={{ fontSize: 12, color: theme.text, opacity: 0.5, fontWeight: 500 }}>
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

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const containerStyle: React.CSSProperties = {
    flex: 1,
    height: '100vh',
    overflow: 'auto',
    display: 'flex',
    transition: 'all 0.3s ease'
  };

  if (!compareMode) {
    return (
      <div
        style={{
          ...containerStyle,
          backgroundColor: currentTheme.background
        }}
      >
        <div style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}>
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
              backgroundColor: currentTheme.primary
            }} />
            <h2 style={{
              fontSize: 20,
              fontWeight: 600,
              color: currentTheme.text,
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
    <div style={containerStyle}>
      <div
        style={{
          flex: 1,
          backgroundColor: currentTheme.background,
          transition: 'all 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          borderRight: isMobile ? 'none' : '1px dashed rgba(255,255,255,0.2)',
          borderBottom: isMobile ? '1px dashed rgba(255,255,255,0.2)' : 'none',
          minWidth: 0
        }}
      >
        <div style={{
          padding: '24px 24px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: currentTheme.primary
          }} />
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: currentTheme.text
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
            backgroundColor: compareTheme.background,
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0
          }}
        >
          <div style={{
            padding: '24px 24px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: compareTheme.primary
            }} />
            <span style={{
              fontSize: 14,
              fontWeight: 600,
              color: compareTheme.text
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
