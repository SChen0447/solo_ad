import React, { useState, useEffect, useCallback, useRef } from 'react';
import ColorPalette from './components/ColorPalette';
import PreviewPanel from './components/PreviewPanel';
import HistoryTimeline from './components/HistoryTimeline';
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
  const [displayHue, setDisplayHue] = useState<number>(220);

  const hueAnimationRef = useRef<number | null>(null);
  const lastSaveTimeRef = useRef<number>(0);

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
      const updated = [snapshot, ...prev].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, [primaryScale, secondaryScale, primaryColor, secondaryColor, tokenNames]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const animateHue = useCallback((targetHue: number) => {
    if (hueAnimationRef.current) {
      cancelAnimationFrame(hueAnimationRef.current);
    }

    const startHue = displayHue;
    const diff = targetHue - startHue;
    const duration = 100;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentHue = Math.round(startHue + diff * easeProgress);

      setDisplayHue(currentHue);

      if (progress < 1) {
        hueAnimationRef.current = requestAnimationFrame(animate);
      }
    };

    hueAnimationRef.current = requestAnimationFrame(animate);
  }, [displayHue]);

  const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseInt(e.target.value, 10);
    setHueValue(newHue);
    animateHue(newHue);

    const hsl = hexToHsl(primaryColor);
    const newColor = hslToHex(newHue, hsl.s, 45);
    setPrimaryColor(newColor);
  }, [primaryColor, animateHue]);

  const handlePrimaryInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isValidHex(value)) {
      const normalized = normalizeHex(value);
      setPrimaryColor(normalized);
      const hsl = hexToHsl(normalized);
      setHueValue(hsl.h);
      setDisplayHue(hsl.h);
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
    setDisplayHue(hsl.h);

    setTimeout(() => {
      setIsAnimating(false);
    }, 800);
  }, []);

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
                  <div className="hue-ring-wrapper">
                    <div className="hue-ring" />
                    <div
                      className="hue-indicator"
                      style={{
                        transform: `rotate(${displayHue}deg) translateY(-110px)`
                      }}
                    >
                      <div
                        className="hue-indicator-dot"
                        style={{ backgroundColor: `hsl(${displayHue}, 80%, 50%)` }}
                      />
                    </div>
                    <div className="hue-center-display">
                      <span className="hue-value">{displayHue}°</span>
                      <span className="hue-label">HUE</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    className="hue-slider"
                    min="0"
                    max="360"
                    value={hueValue}
                    onChange={handleHueChange}
                    style={{
                      background: `linear-gradient(to right, 
                        hsl(0, 80%, 50%), 
                        hsl(60, 80%, 50%), 
                        hsl(120, 80%, 50%), 
                        hsl(180, 80%, 50%), 
                        hsl(240, 80%, 50%), 
                        hsl(300, 80%, 50%), 
                        hsl(360, 80%, 50%)
                      )`
                    }}
                  />
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
    </div>
  );
}

export default App;
