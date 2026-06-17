import React, { useState, useCallback, useEffect } from 'react';
import ColorEditorPanel from './ColorEditorPanel';
import ThemeManager from './ThemeManager';
import ThemePreview from './ThemePreview';
import { ColorItem } from './types';

const defaultColors: ColorItem[] = [
  { id: 'primary', name: 'primary', label: '主色', value: '#1976D2', locked: false },
  { id: 'secondary', name: 'secondary', label: '辅色', value: '#9C27B0', locked: false },
  { id: 'background', name: 'background', label: '背景色', value: '#F5F5F5', locked: false },
  { id: 'text', name: 'text', label: '文字色', value: '#333333', locked: false },
  { id: 'buttonHover', name: 'buttonHover', label: '按钮交互色', value: '#1565C0', locked: false },
  { id: 'surface', name: 'surface', label: '卡片色', value: '#FFFFFF', locked: false },
  { id: 'border', name: 'border', label: '边框色', value: '#DDDDDD', locked: false },
  { id: 'navBg', name: 'navBg', label: '导航栏色', value: '#333333', locked: false },
  { id: 'alertBg', name: 'alertBg', label: '提示条色', value: '#FFF3CD', locked: false },
];

const App: React.FC = () => {
  const [colors, setColors] = useState<ColorItem[]>(defaultColors);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleColorsChange = useCallback((newColors: ColorItem[]) => {
    setColors(newColors);
  }, []);

  const handleLoadTheme = useCallback((themeColors: ColorItem[]) => {
    setColors(themeColors);
    const event = new CustomEvent('palette-set-colors', { detail: themeColors });
    window.dispatchEvent(event);
  }, []);

  if (isMobile) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}>
        <div style={{
          flex: '0 0 auto',
          height: '50%',
          display: 'flex',
          borderBottom: '1px solid #e0e0e0',
        }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ColorEditorPanel
              initialColors={colors}
              onColorsChange={handleColorsChange}
            />
          </div>
          <div style={{
            width: '240px',
            flexShrink: 0,
            borderLeft: '1px solid #e0e0e0',
            overflow: 'hidden',
          }}>
            <ThemeManager
              currentColors={colors}
              onLoadTheme={handleLoadTheme}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ThemePreview colors={colors} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
    }}>
      <div style={{
        width: '320px',
        flexShrink: 0,
        borderRight: '1px solid #e0e0e0',
        overflow: 'hidden',
      }}>
        <ColorEditorPanel
          initialColors={colors}
          onColorsChange={handleColorsChange}
        />
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ThemePreview colors={colors} />
      </div>
      <div style={{
        width: '280px',
        flexShrink: 0,
        borderLeft: '1px solid #e0e0e0',
        overflow: 'hidden',
      }}>
        <ThemeManager
          currentColors={colors}
          onLoadTheme={handleLoadTheme}
        />
      </div>
    </div>
  );
};

export default App;
