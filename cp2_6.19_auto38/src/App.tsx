import { useState, useCallback, useEffect, useRef } from 'react';
import EditorPanel from './components/EditorPanel';
import PreviewPanel from './components/PreviewPanel';
import {
  generateTheme,
  Theme,
  PresetTheme,
  presetThemes,
  checkContrastCompliance,
} from './theme/ThemeEngine';

function App() {
  const [primary, setPrimary] = useState(presetThemes[0].primary);
  const [secondary, setSecondary] = useState(presetThemes[0].secondary);
  const [background, setBackground] = useState(presetThemes[0].background);
  const [brightness, setBrightness] = useState(0);
  const [theme, setTheme] = useState<Theme>(() =>
    generateTheme(primary, secondary, background, brightness)
  );
  const [contrastIssues, setContrastIssues] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      const newTheme = generateTheme(primary, secondary, background, brightness);
      setTheme(newTheme);
      const compliance = checkContrastCompliance(newTheme);
      setContrastIssues(compliance.issues);
    });
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [primary, secondary, background, brightness]);

  const handlePrimaryChange = useCallback((color: string) => {
    setPrimary(color);
  }, []);

  const handleSecondaryChange = useCallback((color: string) => {
    setSecondary(color);
  }, []);

  const handleBackgroundChange = useCallback((color: string) => {
    setBackground(color);
  }, []);

  const handleBrightnessChange = useCallback((value: number) => {
    setBrightness(value);
  }, []);

  const handlePresetSelect = useCallback((preset: PresetTheme) => {
    setPrimary(preset.primary);
    setSecondary(preset.secondary);
    setBackground(preset.background);
    setBrightness(0);
  }, []);

  const handleExport = useCallback(async () => {
    const themeJson = JSON.stringify(theme, null, 2);
    try {
      await navigator.clipboard.writeText(themeJson);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [theme]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '14px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '25%',
          minWidth: '240px',
          maxWidth: '400px',
          background: '#f9fafb',
          borderRight: '1px solid #e5e7eb',
          height: '100%',
        }}
      >
        <EditorPanel
          theme={theme}
          brightness={brightness}
          contrastIssues={contrastIssues}
          onPrimaryChange={handlePrimaryChange}
          onSecondaryChange={handleSecondaryChange}
          onBackgroundChange={handleBackgroundChange}
          onBrightnessChange={handleBrightnessChange}
          onPresetSelect={handlePresetSelect}
          onExport={handleExport}
        />
      </div>

      <div
        style={{ flex: 1, height: '100%' }}>
        <PreviewPanel theme={theme} />
      </div>

      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1f2937',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
            fontSize: '14px',
            fontWeight: 500,
            zIndex: 1000,
            animation: 'fadeInUp 0.3s ease-out',
          }}
        >
          ✓ 已复制到剪贴板
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${theme.primary};
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${theme.primary};
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

export default App;
