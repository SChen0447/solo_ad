import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ColorPalette as Palette,
  HistorySnapshot,
  ThemeMode,
  TokenMap,
} from './colorSystem/colorTypes';
import {
  generatePalette,
  generateDefaultTokenNames,
  hexToHsl,
  hslToHex,
} from './colorSystem/colorEngine';
import ColorPalette from './components/ColorPalette';
import PreviewPanel from './components/PreviewPanel';
import HistoryTimeline from './components/HistoryTimeline';
import './App.css';

const DEFAULT_PRIMARY = '#6366F1';
const DEFAULT_SECONDARY = '#A855F7';
const MAX_HISTORY = 10;
const STORAGE_KEY = 'color-design-token-history-v1';
const THEME_KEY = 'color-design-token-theme-v1';

function uuid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  );
}

function cloneTokens(tokens: TokenMap): TokenMap {
  return {
    primary: { ...tokens.primary },
    secondary: { ...tokens.secondary },
    neutral: { ...tokens.neutral },
  };
}

interface Toast {
  id: string;
  message: string;
  fading: boolean;
}

export default function App() {
  const [primaryHex, setPrimaryHex] = useState<string>(DEFAULT_PRIMARY);
  const [secondaryHex, setSecondaryHex] = useState<string>(DEFAULT_SECONDARY);
  const [primaryHue, setPrimaryHue] = useState<number>(() => hexToHsl(DEFAULT_PRIMARY).h);
  const [secondaryHue, setSecondaryHue] = useState<number>(() => hexToHsl(DEFAULT_SECONDARY).h);
  const [huePulsing, setHuePulsing] = useState<'primary' | 'secondary' | null>(null);
  const huePulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = useMemo<Palette>(
    () => generatePalette(primaryHex, secondaryHex),
    [primaryHex, secondaryHex],
  );

  const [tokens, setTokens] = useState<TokenMap>({
    primary: generateDefaultTokenNames(),
    secondary: generateDefaultTokenNames(),
    neutral: generateDefaultTokenNames(),
  });

  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark' ? 'dark' : 'light';
  });

  const [history, setHistory] = useState<HistorySnapshot[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-primary', primaryHex);
    document.documentElement.style.setProperty('--app-secondary', secondaryHex);
  }, [primaryHex, secondaryHex]);

  useEffect(() => {
    const body = document.body;
    if (themeMode === 'dark') {
      body.classList.add('theme-dark');
    } else {
      body.classList.remove('theme-dark');
    }
    localStorage.setItem(THEME_KEY, themeMode);
  }, [themeMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      /* ignore storage errors */
    }
  }, [history]);

  const showToast = useCallback((message: string) => {
    const id = uuid();
    setToasts((prev) => [...prev, { id, message, fading: false }]);
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, fading: true } : t)),
      );
    }, 2600);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const snapshotKey = useMemo(
    () => `${primaryHex}|${secondaryHex}`,
    [primaryHex, secondaryHex],
  );

  useEffect(() => {
    if (snapshotKey === lastSavedSnapshot) return;
    if (!lastSavedSnapshot) {
      setLastSavedSnapshot(snapshotKey);
      return;
    }
    const snap: HistorySnapshot = {
      id: uuid(),
      timestamp: Date.now(),
      primaryBase: primaryHex,
      secondaryBase: secondaryHex,
      palette: JSON.parse(JSON.stringify(palette)),
      tokens: cloneTokens(tokens),
    };
    setHistory((prev) => [snap, ...prev].slice(0, MAX_HISTORY));
    setActiveHistoryId(snap.id);
    setLastSavedSnapshot(snapshotKey);
  }, [snapshotKey]);

  const handleTokenChange = useCallback(
    (
      category: 'primary' | 'secondary' | 'neutral',
      level: number,
      value: string,
    ) => {
      setTokens((prev) => {
        const next = cloneTokens(prev);
        next[category][level] = value || String(level);
        return next;
      });
    },
    [],
  );

  const handlePrimaryHex = useCallback(
    (hex: string) => {
      const h = hex.startsWith('#') ? hex : `#${hex}`;
      if (!/^#[0-9a-fA-F]{6}$/.test(h)) return;
      setPrimaryHex(h.toUpperCase());
      const { h: hue } = hexToHsl(h);
      setPrimaryHue(hue);
    },
    [],
  );

  const handleSecondaryHex = useCallback(
    (hex: string) => {
      const h = hex.startsWith('#') ? hex : `#${hex}`;
      if (!/^#[0-9a-fA-F]{6}$/.test(h)) return;
      setSecondaryHex(h.toUpperCase());
      const { h: hue } = hexToHsl(h);
      setSecondaryHue(hue);
    },
    [],
  );

  const triggerHuePulse = useCallback((which: 'primary' | 'secondary') => {
    setHuePulsing(which);
    if (huePulseTimer.current) clearTimeout(huePulseTimer.current);
    huePulseTimer.current = setTimeout(() => setHuePulsing(null), 110);
  }, []);

  const handlePrimaryHue = useCallback(
    (hue: number) => {
      const h = Math.round(hue);
      setPrimaryHue(h);
      triggerHuePulse('primary');
      const current = hexToHsl(primaryHex);
      const newHex = hslToHex({ h, s: current.s, l: Math.min(55, current.l) });
      setPrimaryHex(newHex);
    },
    [primaryHex, triggerHuePulse],
  );

  const handleSecondaryHue = useCallback(
    (hue: number) => {
      const h = Math.round(hue);
      setSecondaryHue(h);
      triggerHuePulse('secondary');
      const current = hexToHsl(secondaryHex);
      const newHex = hslToHex({ h, s: current.s, l: Math.min(55, current.l) });
      setSecondaryHex(newHex);
    },
    [secondaryHex, triggerHuePulse],
  );

  const handleToggleTheme = useCallback(() => {
    setThemeMode((m) => (m === 'light' ? 'dark' : 'light'));
  }, []);

  const handleRestore = useCallback(
    (snapshot: HistorySnapshot) => {
      setActiveHistoryId(snapshot.id);
      setPrimaryHex(snapshot.primaryBase);
      setSecondaryHex(snapshot.secondaryBase);
      setPrimaryHue(hexToHsl(snapshot.primaryBase).h);
      setSecondaryHue(hexToHsl(snapshot.secondaryBase).h);
      setTokens(cloneTokens(snapshot.tokens));
      setAnimationKey((k) => k + 1);
      setLastSavedSnapshot(
        `${snapshot.primaryBase}|${snapshot.secondaryBase}`,
      );
      showToast('已恢复历史色板');
    },
    [showToast],
  );

  const handleClearHistoryItem = useCallback(
    (snapshot: HistorySnapshot) => {
      setHistory((prev) => prev.filter((h) => h.id !== snapshot.id));
    },
    [],
  );

  const handleColorPicker = useCallback(
    (which: 'primary' | 'secondary', hex: string) => {
      if (which === 'primary') handlePrimaryHex(hex);
      else handleSecondaryHex(hex);
    },
    [handlePrimaryHex, handleSecondaryHex],
  );

  return (
    <div className="app-root">
      <header className="glass-panel app-header fade-in-up">
        <div className="app-title">
          <span className="app-title-icon">🎨</span>
          <span>色彩系统与设计令牌生成器</span>
        </div>
        <div className="header-actions">
          <div className="btn-group">
            <button
              className={`btn ${themeMode === 'light' ? 'active' : ''}`}
              onClick={() => themeMode !== 'light' && handleToggleTheme()}
              title="亮色模式"
            >
              ☀
            </button>
            <button
              className={`btn ${themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => themeMode !== 'dark' && handleToggleTheme()}
              title="暗色模式"
            >
              ☾
            </button>
          </div>
          <button
            className="btn"
            onClick={() => {
              handlePrimaryHex(DEFAULT_PRIMARY);
              handleSecondaryHex(DEFAULT_SECONDARY);
              showToast('已重置为默认色板');
            }}
          >
            ↺ 重置
          </button>
        </div>
      </header>

      <div className="main-content">
        <section className="glass-panel fade-in-up" style={{ animationDelay: '0.03s' }}>
          <h2 className="section-title">颜色输入</h2>
          <div className="color-input-group">
            <div className="color-input-wrapper">
              <label className="color-input-label">
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--app-primary)',
                  }}
                />
                主色 (Primary)
                <span
                  className={`hue-value-display ${huePulsing === 'primary' ? 'pulsing' : ''}`}
                  style={{ marginLeft: 'auto', background: 'var(--app-primary)' }}
                >
                  H {primaryHue}°
                </span>
              </label>
              <div className="color-input-inner">
                <div className="color-swatch" style={{ background: primaryHex }}>
                  <input
                    type="color"
                    value={primaryHex}
                    onChange={(e) => handleColorPicker('primary', e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="hex-input"
                  value={primaryHex}
                  onChange={(e) => handlePrimaryHex(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className="hue-slider-container">
                <input
                  type="range"
                  className="hue-slider"
                  min={0}
                  max={360}
                  value={primaryHue}
                  onChange={(e) => handlePrimaryHue(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="color-input-wrapper">
              <label className="color-input-label">
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--app-secondary)',
                  }}
                />
                辅色 (Secondary)
                <span
                  className={`hue-value-display ${huePulsing === 'secondary' ? 'pulsing' : ''}`}
                  style={{ marginLeft: 'auto', background: 'var(--app-secondary)' }}
                >
                  H {secondaryHue}°
                </span>
              </label>
              <div className="color-input-inner">
                <div className="color-swatch" style={{ background: secondaryHex }}>
                  <input
                    type="color"
                    value={secondaryHex}
                    onChange={(e) => handleColorPicker('secondary', e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="hex-input"
                  value={secondaryHex}
                  onChange={(e) => handleSecondaryHex(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div className="hue-slider-container">
                <input
                  type="range"
                  className="hue-slider"
                  min={0}
                  max={360}
                  value={secondaryHue}
                  onChange={(e) => handleSecondaryHue(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </section>

        <PreviewPanel
          palette={palette}
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
        />

        <ColorPalette
          palette={palette}
          tokens={tokens}
          onTokenChange={handleTokenChange}
          onShowToast={showToast}
          animationKey={animationKey}
        />
      </div>

      <HistoryTimeline
        history={history}
        activeId={activeHistoryId}
        onRestore={handleRestore}
        onClear={handleClearHistoryItem}
      />

      <div aria-live="polite" style={{ pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.fading ? 'fading' : ''}`}>
            ✓ {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
