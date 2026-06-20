import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ColorSwatch, ColorToken } from '../colorSystem/colorTypes';
import { createColorTokens, exportCSSVariables, exportJSON, exportTailwindConfig } from '../colorSystem/colorEngine';

interface ColorPaletteProps {
  primaryScale: ColorSwatch[];
  secondaryScale: ColorSwatch[];
  tokenNames: Record<string, string>;
  onTokenNameChange: (swatchName: string, newName: string) => void;
  isAnimating: boolean;
  primaryColor: string;
  onShowCopied?: () => void;
}

const ColorPalette: React.FC<ColorPaletteProps> = ({
  primaryScale,
  secondaryScale,
  tokenNames,
  onTokenNameChange,
  isAnimating,
  primaryColor,
  onShowCopied
}) => {
  const [pulsedIndex, setPulsedIndex] = useState<number | null>(null);
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [animationKey, setAnimationKey] = useState<number>(0);
  const prevAnimatingRef = useRef<boolean>(false);

  useEffect(() => {
    if (isAnimating && !prevAnimatingRef.current) {
      setAnimationKey((prev) => prev + 1);
    }
    prevAnimatingRef.current = isAnimating;
  }, [isAnimating]);

  const primaryTokens = createColorTokens(primaryScale, 'primary', tokenNames);
  const secondaryTokens = createColorTokens(secondaryScale, 'secondary', tokenNames);

  const handleSwatchClick = useCallback((index: number) => {
    setPulsedIndex(null);
    requestAnimationFrame(() => {
      setPulsedIndex(index);
      setTimeout(() => setPulsedIndex(null), 300);
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (onShowCopied) {
        onShowCopied();
      }
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [onShowCopied]);

  const handleCopyAllCSS = useCallback(() => {
    const css = `:root {\n${exportCSSVariables(primaryTokens, secondaryTokens)}\n}`;
    copyToClipboard(css);
  }, [primaryTokens, secondaryTokens, copyToClipboard]);

  const handleExportJSON = useCallback(() => {
    const json = exportJSON(primaryTokens, secondaryTokens);
    copyToClipboard(json);
  }, [primaryTokens, secondaryTokens, copyToClipboard]);

  const handleExportTailwind = useCallback(() => {
    const config = exportTailwindConfig(primaryScale, secondaryScale);
    copyToClipboard(config);
  }, [primaryScale, secondaryScale, copyToClipboard]);

  const handleTokenNameClick = useCallback((token: ColorToken) => {
    setEditingToken(token.swatch.name);
    setEditValue(token.customName);
  }, []);

  const handleTokenNameBlur = useCallback((swatchName: string) => {
    if (editValue.trim() && editValue.startsWith('--')) {
      onTokenNameChange(swatchName, editValue.trim());
    }
    setEditingToken(null);
  }, [editValue, onTokenNameChange]);

  const handleTokenNameKeyDown = useCallback((e: React.KeyboardEvent, swatchName: string) => {
    if (e.key === 'Enter') {
      handleTokenNameBlur(swatchName);
    } else if (e.key === 'Escape') {
      setEditingToken(null);
    }
  }, [handleTokenNameBlur]);

  const getWCAGColor = (level: string): string => {
    switch (level) {
      case 'AAA':
        return '#10b981';
      case 'AA':
        return '#f59e0b';
      default:
        return '#ef4444';
    }
  };

  const renderSwatch = (token: ColorToken, _index: number, totalIndex: number) => {
    const isPulsed = pulsedIndex === totalIndex;
    const staggerDelay = totalIndex * 0.05;

    return (
      <div
        key={`${token.swatch.name}-${animationKey}`}
        className={`color-swatch ${isPulsed ? 'pulse-animation' : ''}`}
        style={{
          '--swatch-color': token.swatch.hex,
          '--stagger-delay': `${staggerDelay}s`,
          '--text-color': token.swatch.l > 50 ? '#000000' : '#ffffff'
        } as React.CSSProperties}
        onClick={() => handleSwatchClick(totalIndex)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSwatchClick(totalIndex);
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`${token.swatch.name}, ${token.swatch.hex}, WCAG ${token.swatch.wcagLevel}, 对比度 ${token.swatch.contrast.toFixed(2)}:1`}
      >
        <div
          className={`swatch-color ${isAnimating ? 'stagger-fly-in' : ''}`}
          style={{
            backgroundColor: token.swatch.hex,
            animationDelay: `${staggerDelay}s`
          }}
        >
          <span className="swatch-level">{token.swatch.level}</span>
        </div>
        <div className={`swatch-info ${isAnimating ? 'stagger-fade-in' : ''}`}
             style={{ animationDelay: `${staggerDelay + 0.1}s` }}>
          <div className="swatch-hex">{token.swatch.hex.toUpperCase()}</div>
          <div className="swatch-meta">
            <span
              className="wcag-badge"
              style={{ backgroundColor: getWCAGColor(token.swatch.wcagLevel) }}
            >
              {token.swatch.wcagLevel}
            </span>
            <span className="contrast-value">{token.swatch.contrast.toFixed(2)}:1</span>
          </div>
          {editingToken === token.swatch.name ? (
            <input
              type="text"
              className="token-name-input"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleTokenNameBlur(token.swatch.name)}
              onKeyDown={(e) => handleTokenNameKeyDown(e, token.swatch.name)}
              autoFocus
              style={{ borderColor: primaryColor }}
            />
          ) : (
            <div
              className="token-name"
              onClick={(e) => {
                e.stopPropagation();
                handleTokenNameClick(token);
              }}
              title="点击编辑令牌名称"
            >
              {token.customName}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="color-palette-container">
      <div className="palette-header">
        <h2 className="palette-title">色彩系统</h2>
        <div className="export-buttons">
          <button
            className="export-btn"
            onClick={handleCopyAllCSS}
            style={{ '--accent-color': primaryColor } as React.CSSProperties}
          >
            复制全部 CSS
          </button>
          <button
            className="export-btn secondary"
            onClick={handleExportJSON}
          >
            导出 JSON
          </button>
          <button
            className="export-btn secondary"
            onClick={handleExportTailwind}
          >
            导出 Tailwind
          </button>
        </div>
      </div>

      <div className="palette-section">
        <h3 className="section-title">主色板</h3>
        <div className="swatch-grid" key={`primary-${animationKey}`}>
          {primaryTokens.map((token, index) =>
            renderSwatch(token, index, index)
          )}
        </div>
      </div>

      <div className="palette-section">
        <h3 className="section-title">辅色板</h3>
        <div className="swatch-grid" key={`secondary-${animationKey}`}>
          {secondaryTokens.map((token, index) =>
            renderSwatch(token, index, primaryTokens.length + index)
          )}
        </div>
      </div>
    </div>
  );
};

export default ColorPalette;
