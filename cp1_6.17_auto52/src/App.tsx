import React, { useState, useCallback, useEffect } from 'react';
import ThemeEditor from './ThemeEditor';
import PreviewPanel from './PreviewPanel';
import ThemeManager from './ThemeManager';
import { ThemeColors, ColorKey, DEFAULT_THEME_COLORS, COLOR_KEYS, isValidThemeColors } from './types';

function loadThemeFromURL(): ThemeColors | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    if (themeParam) {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(themeParam))));
      if (isValidThemeColors(decoded)) return decoded;
    }
  } catch {
  }
  return null;
}

const App: React.FC = () => {
  const [colors, setColors] = useState<ThemeColors>(() => loadThemeFromURL() || DEFAULT_THEME_COLORS);
  const [colorOrder, setColorOrder] = useState<ColorKey[]>(COLOR_KEYS);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    COLOR_KEYS.forEach((key) => {
      const cssVar = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, colors[key]);
    });
  }, [colors]);

  const handleColorChange = useCallback((key: ColorKey, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleColorOrderChange = useCallback((order: ColorKey[]) => {
    setColorOrder(order);
  }, []);

  const handleLoadTheme = useCallback((newColors: ThemeColors) => {
    setColors(newColors);
  }, []);

  const handleToggleDark = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return (
    <div className="app-layout">
      <ThemeEditor
        colors={colors}
        colorOrder={colorOrder}
        onColorChange={handleColorChange}
        onColorOrderChange={handleColorOrderChange}
      />
      <div className="preview-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        <PreviewPanel
          colors={colors}
          isDark={isDark}
          onToggleDark={handleToggleDark}
        />
        <div style={{ padding: '0 24px 24px 24px' }}>
          <div className="divider" />
          <ThemeManager
            currentColors={colors}
            onLoadTheme={handleLoadTheme}
          />
        </div>
      </div>
    </div>
  );
};

export default App;
