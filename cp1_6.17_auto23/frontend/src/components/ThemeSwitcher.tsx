import { useState } from 'react';
import type { Theme } from '../types';
import { ChromePicker } from 'react-color';

interface ThemeSwitcherProps {
  currentTheme: Theme;
  presetThemes: Theme[];
  onThemeChange: (theme: Theme) => void;
  onCustomTheme: (primary: string, secondary: string) => void;
}

function ThemeSwitcher({
  currentTheme,
  presetThemes,
  onThemeChange,
  onCustomTheme,
}: ThemeSwitcherProps) {
  const [customPrimary, setCustomPrimary] = useState(currentTheme.primary);
  const [customSecondary, setCustomSecondary] = useState(currentTheme.secondary);
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);

  const handlePresetClick = (theme: Theme) => {
    onThemeChange(theme);
    setCustomPrimary(theme.primary);
    setCustomSecondary(theme.secondary);
  };

  const handlePrimaryChange = (color: { hex: string }) => {
    setCustomPrimary(color.hex);
    onCustomTheme(color.hex, customSecondary);
  };

  const handleSecondaryChange = (color: { hex: string }) => {
    setCustomSecondary(color.hex);
    onCustomTheme(customPrimary, color.hex);
  };

  return (
    <>
      <div className="theme-preset-grid">
        {presetThemes.map((theme) => (
          <div
            key={theme.id}
            className={`theme-preset ${currentTheme.id === theme.id ? 'active' : ''}`}
            onClick={() => handlePresetClick(theme)}
            title={theme.name}
          >
            <div className="theme-colors">
              <div
                className="theme-color-swatch"
                style={{ backgroundColor: theme.primary }}
              />
              <div
                className="theme-color-swatch"
                style={{ backgroundColor: theme.secondary }}
              />
              <div
                className="theme-color-swatch"
                style={{ backgroundColor: theme.background, border: '1px solid #313244' }}
              />
            </div>
            <span className="theme-name">{theme.name}</span>
          </div>
        ))}
      </div>

      <div className="custom-color-picker">
        <div className="color-picker-item">
          <label>主色调</label>
          <div className="color-input-wrapper" style={{ position: 'relative' }}>
            <input
              type="color"
              value={customPrimary}
              onClick={() => {
                setShowPrimaryPicker(!showPrimaryPicker);
                setShowSecondaryPicker(false);
              }}
              readOnly
            />
            <span>{customPrimary}</span>
            {showPrimaryPicker && (
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  zIndex: 1000,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <ChromePicker
                  color={customPrimary}
                  onChange={handlePrimaryChange}
                  disableAlpha
                />
                <div
                  onClick={() => setShowPrimaryPicker(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: -1,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="color-picker-item">
          <label>辅助色</label>
          <div className="color-input-wrapper" style={{ position: 'relative' }}>
            <input
              type="color"
              value={customSecondary}
              onClick={() => {
                setShowSecondaryPicker(!showSecondaryPicker);
                setShowPrimaryPicker(false);
              }}
              readOnly
            />
            <span>{customSecondary}</span>
            {showSecondaryPicker && (
              <div
                style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  zIndex: 1000,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                }}
              >
                <ChromePicker
                  color={customSecondary}
                  onChange={handleSecondaryChange}
                  disableAlpha
                />
                <div
                  onClick={() => setShowSecondaryPicker(false)}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: -1,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ThemeSwitcher;
