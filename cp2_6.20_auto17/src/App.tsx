import React, { useState, useEffect, useCallback, useRef } from 'react';
import ColorPalette from './components/ColorPalette';
import PreviewPanel from './components/PreviewPanel';
import HistoryTimeline from './components/HistoryTimeline';
import HueCanvasPicker from './components/HueCanvasPicker';
import {
  generateColorScale,
  isValidHex,
  normalizeHex,
  hexToHsl,
  hslToHex
} from './colorSystem/colorEngine';
import type {
  ColorSwatch,
  HistorySnapshot,
  ThemeMode
} from './colorSystem/colorTypes';
import './App.css';

const STORAGE_KEY = 'color-system-history';
const MAX_HISTORY = 10;

const DEFAULT_PRIMARY = '#3b82f6';
const DEFAULT_SECONDARY = '#8b5cf6';

function App(): React.ReactElement {
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_PRIMARY);
  const [secondaryColor, setSecondaryColor] = useState<string>(DEFAULT_SECONDARY);
  const [primaryScale, setPrimaryScale] = useState<ColorSwatch[]>([]);
  const [secondaryScale, setSecondaryScale] = useState<ColorSwatch[]>([]);
  const [tokenNames, setTokenNames] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [hueValue, setHueValue] = useState<number>(220);
  const [showCopied, setShowCopied] = useState<boolean>(false);

  const lastSaveTimeRef = useRef<number>(0);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
      } catch (e) {
        console.error('加载历史记录失败:', e);
      }
    }
  }, []);

  useEffect(() => {
    const startTime = performance.now();

    const newPrimaryScale = generateColorScale(primaryColor, 'primary');
    const newSecondaryScale = generateColorScale(secondaryColor, 'secondary');

    setPrimaryScale(newPrimaryScale);
    setSecondaryScale(newSecondaryScale);

    const endTime = performance.now();
    console.log(`色板生成时间: ${(endTime - startTime).toFixed(2)}ms`);
  }, [primaryColor, secondaryColor]);

  useEffect(() => {
    if (primaryScale.length === 0 || secondaryScale.length === 0) return;

    const now = Date.now();
    if (now - lastSaveTimeRef.current < 500) return;
    lastSaveTimeRef.current = now;

    const snapshot: HistorySnapshot = {
      id: `snapshot-${now}`,
      timestamp: now,
      primaryColor,
      secondaryColor,
      primaryScale,
      secondaryScale,
      tokenNames
    };

    setHistory((prev) => {
      if (prev.length > 0 && prev[0].primaryColor === primaryColor && prev[0].secondaryColor === secondaryColor) {
        return prev;
      }
      const updated = [snapshot, ...prev].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [primaryScale, secondaryScale, primaryColor, secondaryColor, tokenNames]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const handleHueChange = useCallback((newHue: number) => {
    setHueValue(newHue);
    const hsl = hexToHsl(primaryColor);
    const newColor = hslToHex(newHue, hsl.s, 45);
    setPrimaryColor(newColor);
  }, [primaryColor]);

  const handlePrimaryInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidHex(value)) {
      const normalized = normalizeHex(value);
      setPrimaryColor(normalized);
      const hsl = hexToHsl(normalized);
      setHueValue(hsl.h);
    }
  }, []);

  const handleSecondaryInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidHex(value)) {
      setSecondaryColor(normalizeHex(value));
    }
  }, []);

  const handleTokenNameChange = useCallback((swatchName: string, newName: string) => {
    setTokenNames((prev) => ({
      ...prev,
      [swatchName]: newName
    }));
  }, []);

  const handleThemeModeChange = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
  }, []);

  const handleRestoreSnapshot = useCallback((snapshot: HistorySnapshot) => {
    setIsAnimating(true);

    setPrimaryColor(snapshot.primaryColor);
    setSecondaryColor(snapshot.secondaryColor);
    setTokenNames(snapshot.tokenNames);

    const hsl = hexToHsl(snapshot.primaryColor);
    setHueValue(hsl.h);

    setTimeout(() => {
      setIsAnimating(false);
    }, 1000);
  }, []);

  const handleShowCopied = useCallback(() => {
    if (copiedTimerRef.current) {
      clearTimeout(copiedTimerRef.current);
    }
    setShowCopied(false);

    requestAnimationFrame(() => {
      setShowCopied(true);
    });

    copiedTimerRef.current = setTimeout(() => {
      setShowCopied(false);
      copiedTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const primaryHsl = hexToHsl(primaryColor);
  const secondaryHsl = hexToHsl(secondaryColor);

  return (
    <div
      className={`app-container theme-${themeMode}`}
      style={{
        '--accent-color': primaryColor,
        '--accent-secondary': secondaryColor
      } as React.CSSProperties}
    >
      <div className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            <span className="title-icon">🎨</span>
            色彩系统生成器
          </h1>
          <p className="app-subtitle">
            自动生成专业色阶系统，一键导出设计令牌
          </p>
        </div>
      </div>

      <div className="app-main">
        <div className="main-content">
          <div className="color-input-section glass-panel">
            <h2 className="section-title">选择色彩</h2>

            <div className="color-inputs">
              <div className="color-input-group">
                <label className="input-label">
                  <span
                    className="color-preview-dot"
                    style={{ backgroundColor: primaryColor }}
                  />
                  主色调
                </label>

                <div className="hue-picker-container">
                  <HueCanvasPicker
                    hue={hueValue}
                    saturation={primaryHsl.s}
                    lightness={50}
                    onChange={handleHueChange}
                  />

                  <div className="color-values-display">
                    <div className="color-value-item">
                      <span className="value-label">HEX</span>
                      <span className="value-content">{primaryColor.toUpperCase()}</span>
                    </div>
                    <div className="color-value-item">
                      <span className="value-label">HSL</span>
                      <span className="value-content">
                        {primaryHsl.h}°, {primaryHsl.s}%, {primaryHsl.l}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hex-input-wrapper">
                  <span className="hex-prefix">#</span>
                  <input
                    type="text"
                    className="hex-input"
                    value={primaryColor.replace('#', '')}
                    onChange={handlePrimaryInput}
                    placeholder="3b82f6"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="color-input-group">
                <label className="input-label">
                  <span
                    className="color-preview-dot"
                    style={{ backgroundColor: secondaryColor }}
                  />
                  辅助色
                </label>

                <div className="secondary-preview">
                  <div
                    className="secondary-color-block"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <span className="color-block-hex">{secondaryColor.toUpperCase()}</span>
                  </div>
                </div>

                <div className="color-values-display">
                  <div className="color-value-item">
                    <span className="value-label">HEX</span>
                    <span className="value-content">{secondaryColor.toUpperCase()}</span>
                  </div>
                  <div className="color-value-item">
                    <span className="value-label">HSL</span>
                    <span className="value-content">
                      {secondaryHsl.h}°, {secondaryHsl.s}%, {secondaryHsl.l}%
                    </span>
                  </div>
                </div>

                <div className="hex-input-wrapper">
                  <span className="hex-prefix">#</span>
                  <input
                    type="text"
                    className="hex-input"
                    value={secondaryColor.replace('#', '')}
                    onChange={handleSecondaryInput}
                    placeholder="8b5cf6"
                    maxLength={6}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="palette-section glass-panel">
            <ColorPalette
              primaryScale={primaryScale}
              secondaryScale={secondaryScale}
              tokenNames={tokenNames}
              onTokenNameChange={handleTokenNameChange}
              isAnimating={isAnimating}
              primaryColor={primaryColor}
              onShowCopied={handleShowCopied}
            />
          </div>

          <div className="preview-section glass-panel">
            <PreviewPanel
              primaryScale={primaryScale}
              secondaryScale={secondaryScale}
              themeMode={themeMode}
              onThemeModeChange={handleThemeModeChange}
            />
          </div>
        </div>

        <aside className="sidebar glass-panel">
          <HistoryTimeline
            history={history}
            onRestore={handleRestoreSnapshot}
          />
        </aside>
      </div>

      <div className="app-footer">
        <p>拖动色相环选择主色 · 点击色块查看脉冲动画 · 支持一键导出多种格式</p>
      </div>

      {showCopied && (
        <div className="copy-toast show">
          <span className="toast-icon">✓</span>
          <span>已复制</span>
        </div>
      )}
    </div>
  );
}

export default App;
