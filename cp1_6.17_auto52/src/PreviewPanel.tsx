import React, { useState, useMemo } from 'react';
import { Sun, Moon } from 'lucide-react';
import { ThemeColors, ComponentState } from './types';

interface PreviewPanelProps {
  colors: ThemeColors;
  isDark: boolean;
  onToggleDark: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ colors, isDark, onToggleDark }) => {
  const [progress, setProgress] = useState(65);
  const [inputValue, setInputValue] = useState('');

  const cssVars = useMemo(() => {
    const vars: Record<string, string> = {};
    (Object.keys(colors) as Array<keyof ThemeColors>).forEach((key) => {
      vars[`--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`] = colors[key];
    });
    return vars;
  }, [colors]);

  const effectiveBg = isDark ? darkenColor(colors.background, 0.8) : colors.background;
  const effectiveSurface = isDark ? darkenColor(colors.surface, 0.7) : colors.surface;
  const effectiveTextPrimary = isDark ? lightenColor(colors.textPrimary, 0.9) : colors.textPrimary;
  const effectiveTextSecondary = isDark ? lightenColor(colors.textSecondary, 0.6) : colors.textSecondary;

  const panelStyle: React.CSSProperties = {
    ...cssVars,
    backgroundColor: effectiveBg,
    color: effectiveTextPrimary,
    '--color-background': effectiveBg,
    '--color-surface': effectiveSurface,
    '--color-text-primary': effectiveTextPrimary,
    '--color-text-secondary': effectiveTextSecondary,
  } as React.CSSProperties;

  return (
    <div className="preview-panel" style={panelStyle}>
      <div className="preview-header">
        <h2 className="section-title" style={{ color: effectiveTextPrimary }}>Live Preview</h2>
        <button
          className={`dark-mode-toggle ${isDark ? 'active' : ''}`}
          onClick={onToggleDark}
          aria-label="Toggle dark mode"
        >
          <div className="dark-mode-toggle-knob" />
        </button>
      </div>

      <div className="preview-card" style={{ backgroundColor: effectiveSurface }}>
        <h4 style={{ color: effectiveTextPrimary }}>Buttons</h4>
        <div className="component-states">
          <div className="component-state-row">
            <span className="component-state-label" style={{ color: effectiveTextSecondary }}>Primary</span>
            <StatefulButton
              normalStyle={{ backgroundColor: colors.primary, color: '#fff' }}
              hoverStyle={{ filter: 'brightness(1.15)' }}
              activeStyle={{ filter: 'brightness(0.9)' }}
              disabledStyle={{ backgroundColor: colors.primary, color: '#fff', opacity: 0.5 }}
              className="preview-btn preview-btn-primary"
            >
              Primary Button
            </StatefulButton>
          </div>
          <div className="component-state-row">
            <span className="component-state-label" style={{ color: effectiveTextSecondary }}>Secondary</span>
            <StatefulButton
              normalStyle={{ backgroundColor: colors.secondary, color: '#fff' }}
              hoverStyle={{ filter: 'brightness(1.15)' }}
              activeStyle={{ filter: 'brightness(0.9)' }}
              disabledStyle={{ backgroundColor: colors.secondary, color: '#fff', opacity: 0.5 }}
              className="preview-btn preview-btn-secondary"
            >
              Secondary Button
            </StatefulButton>
          </div>
          <div className="component-state-row">
            <span className="component-state-label" style={{ color: effectiveTextSecondary }}>Outline</span>
            <StatefulButton
              normalStyle={{ backgroundColor: 'transparent', color: colors.primary, border: `2px solid ${colors.primary}` }}
              hoverStyle={{ backgroundColor: colors.primary, color: '#fff' }}
              activeStyle={{ filter: 'brightness(0.9)' }}
              disabledStyle={{ backgroundColor: 'transparent', color: colors.primary, border: `2px solid ${colors.primary}`, opacity: 0.5 }}
              className="preview-btn preview-btn-outline"
            >
              Outline Button
            </StatefulButton>
          </div>
          <div className="component-state-row">
            <span className="component-state-label" style={{ color: effectiveTextSecondary }}>Disabled</span>
            <button className="preview-btn preview-btn-primary" disabled style={{ backgroundColor: colors.primary, color: '#fff', opacity: 0.5 }}>
              Disabled
            </button>
          </div>
        </div>
      </div>

      <div className="preview-card" style={{ backgroundColor: effectiveSurface }}>
        <h4 style={{ color: effectiveTextPrimary }}>Card Component</h4>
        <div style={{
          backgroundColor: effectiveBg,
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${effectiveTextSecondary}22`,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: effectiveTextPrimary, marginBottom: 6 }}>Card Title</div>
          <div style={{ fontSize: 13, color: effectiveTextSecondary, lineHeight: 1.6 }}>
            This is a sample card that demonstrates how your theme colors look in a typical card layout with title and body text.
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="preview-btn preview-btn-primary" style={{ backgroundColor: colors.primary, color: '#fff', padding: '6px 14px', fontSize: 13 }}>
              Action
            </button>
            <button className="preview-btn preview-btn-outline" style={{ backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, padding: '6px 14px', fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="preview-card" style={{ backgroundColor: effectiveSurface }}>
        <h4 style={{ color: effectiveTextPrimary }}>Input Fields</h4>
        <div className="component-states">
          <div className="component-state-row">
            <span className="component-state-label" style={{ color: effectiveTextSecondary }}>Normal</span>
            <input
              className="preview-input"
              placeholder="Type something..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ backgroundColor: effectiveBg, color: effectiveTextPrimary, borderColor: `${effectiveTextSecondary}33` }}
            />
          </div>
          <div className="component-state-row">
            <span className="component-state-label" style={{ color: effectiveTextSecondary }}>Focused</span>
            <input
              className="preview-input"
              placeholder="Focused input"
              style={{ backgroundColor: effectiveBg, color: effectiveTextPrimary, borderColor: colors.primary, boxShadow: `0 0 0 3px ${colors.primary}33` }}
            />
          </div>
          <div className="component-state-row">
            <span className="component-state-label" style={{ color: effectiveTextSecondary }}>Error</span>
            <input
              className="preview-input"
              placeholder="Invalid input"
              style={{ backgroundColor: effectiveBg, color: effectiveTextPrimary, borderColor: colors.error, boxShadow: `0 0 0 3px ${colors.error}22` }}
            />
          </div>
          <div className="component-state-row">
            <span className="component-state-label" style={{ color: effectiveTextSecondary }}>Disabled</span>
            <input
              className="preview-input"
              placeholder="Disabled input"
              disabled
              style={{ backgroundColor: effectiveBg, color: effectiveTextSecondary, opacity: 0.5 }}
            />
          </div>
        </div>
      </div>

      <div className="preview-card" style={{ backgroundColor: effectiveSurface }}>
        <h4 style={{ color: effectiveTextPrimary }}>Tags</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="preview-tag" style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}>Primary</span>
          <span className="preview-tag" style={{ backgroundColor: `${colors.secondary}20`, color: colors.secondary }}>Secondary</span>
          <span className="preview-tag" style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}>Accent</span>
          <span className="preview-tag" style={{ backgroundColor: `${colors.error}20`, color: colors.error }}>Error</span>
          <span className="preview-tag" style={{ backgroundColor: `${colors.success}20`, color: colors.success }}>Success</span>
          <span className="preview-tag" style={{ backgroundColor: `${colors.warning}20`, color: colors.warning }}>Warning</span>
        </div>
      </div>

      <div className="preview-card" style={{ backgroundColor: effectiveSurface }}>
        <h4 style={{ color: effectiveTextPrimary }}>Progress Bar</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: effectiveTextSecondary }}>Primary</span>
              <span style={{ fontSize: 12, color: effectiveTextSecondary }}>{progress}%</span>
            </div>
            <div className="preview-progress-bar" style={{ backgroundColor: `${effectiveTextSecondary}15` }}>
              <div className="preview-progress-fill" style={{ width: `${progress}%`, backgroundColor: colors.primary }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: effectiveTextSecondary }}>Success</span>
              <span style={{ fontSize: 12, color: effectiveTextSecondary }}>100%</span>
            </div>
            <div className="preview-progress-bar" style={{ backgroundColor: `${effectiveTextSecondary}15` }}>
              <div className="preview-progress-fill" style={{ width: '100%', backgroundColor: colors.success }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: effectiveTextSecondary }}>Warning</span>
              <span style={{ fontSize: 12, color: effectiveTextSecondary }}>30%</span>
            </div>
            <div className="preview-progress-bar" style={{ backgroundColor: `${effectiveTextSecondary}15` }}>
              <div className="preview-progress-fill" style={{ width: '30%', backgroundColor: colors.warning }} />
            </div>
          </div>
          <button
            className="preview-btn preview-btn-outline"
            style={{ marginTop: 4, backgroundColor: 'transparent', color: colors.primary, border: `1px solid ${colors.primary}`, padding: '6px 14px', fontSize: 12 }}
            onClick={() => setProgress((p) => (p >= 100 ? 0 : p + 15))}
          >
            Update Progress
          </button>
        </div>
      </div>

      <div className="preview-card" style={{ backgroundColor: effectiveSurface }}>
        <h4 style={{ color: effectiveTextPrimary }}>Typography</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: effectiveTextPrimary }}>Heading 1 — Bold 18px</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: effectiveTextPrimary }}>Heading 2 — Semibold 16px</div>
          <div style={{ fontSize: 14, fontWeight: 400, color: effectiveTextPrimary }}>Body text — Regular 14px</div>
          <div style={{ fontSize: 13, fontWeight: 400, color: effectiveTextSecondary }}>Caption text — Regular 13px</div>
        </div>
      </div>
    </div>
  );
};

interface StatefulButtonProps {
  normalStyle: React.CSSProperties;
  hoverStyle: React.CSSProperties;
  activeStyle: React.CSSProperties;
  disabledStyle: React.CSSProperties;
  className: string;
  children: React.ReactNode;
}

const StatefulButton: React.FC<StatefulButtonProps> = ({
  normalStyle,
  hoverStyle,
  activeStyle,
  disabledStyle,
  className,
  children,
}) => {
  const [state, setState] = useState<ComponentState>(ComponentState.Normal);

  const currentStyle: React.CSSProperties = {
    ...normalStyle,
    ...(state === ComponentState.Hover ? hoverStyle : {}),
    ...(state === ComponentState.Active ? activeStyle : {}),
    ...(state === ComponentState.Disabled ? disabledStyle : {}),
    transition: 'all 0.3s ease-out',
  };

  return (
    <button
      className={className}
      style={currentStyle}
      onMouseEnter={() => setState(ComponentState.Hover)}
      onMouseLeave={() => setState(ComponentState.Normal)}
      onMouseDown={() => setState(ComponentState.Active)}
      onMouseUp={() => setState(ComponentState.Hover)}
    >
      {children}
    </button>
  );
};

function darkenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `#${[rgb.r, rgb.g, rgb.b].map((c) => Math.max(0, Math.round(c * factor)).toString(16).padStart(2, '0')).join('')}`;
}

function lightenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `#${[rgb.r, rgb.g, rgb.b].map((c) => Math.min(255, Math.round(c + (255 - c) * factor)).toString(16).padStart(2, '0')).join('')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

export default PreviewPanel;
