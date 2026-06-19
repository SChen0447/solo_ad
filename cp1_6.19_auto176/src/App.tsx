import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import KeywordGrid from '@/components/KeywordGrid';
import PaletteViewer from '@/components/PaletteViewer';
import { generatePalette, generateRandomPalette, KEYWORDS } from '@/utils/paletteGenerator';

interface SavedPalette {
  id: string;
  keyword: string;
  colors: string[];
  createdAt: number;
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function App() {
  const [currentKeyword, setCurrentKeyword] = useState<string | null>(null);
  const [currentPalette, setCurrentPalette] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('colorMoodBoard_saved');
    if (saved) {
      try {
        setSavedPalettes(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (savedPalettes.length > 0) {
      localStorage.setItem('colorMoodBoard_saved', JSON.stringify(savedPalettes));
    }
  }, [savedPalettes]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleKeywordSelect = useCallback((keyword: string) => {
    setCurrentKeyword(keyword);
    setTransitioning(true);
    setCurrentPalette(generatePalette(keyword));
    setTimeout(() => setTransitioning(false), 600);
  }, []);

  const handleRandomInspiration = useCallback(() => {
    setCurrentKeyword(null);
    setTransitioning(true);
    setCurrentPalette(generateRandomPalette());
    setTimeout(() => setTransitioning(false), 600);
  }, []);

  const handleSave = useCallback(() => {
    if (currentPalette.length === 0) return;
    const newPalette: SavedPalette = {
      id: uuidv4(),
      keyword: currentKeyword || '随机灵感',
      colors: [...currentPalette],
      createdAt: Date.now(),
    };
    setSavedPalettes((prev) => [newPalette, ...prev]);
    showToast('色板已保存到收藏夹');
  }, [currentPalette, currentKeyword]);

  const handleCopyCSS = useCallback(() => {
    if (currentPalette.length === 0) return;
    const cssVars = currentPalette
      .map((color, i) => `  --color-${i + 1}: ${color};`)
      .join('\n');
    const css = `:root {\n${cssVars}\n}`;
    navigator.clipboard.writeText(css).then(() => {
      showToast('CSS变量已复制到剪贴板');
    });
  }, [currentPalette]);

  const handleToggleTheme = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const handleLoadSaved = useCallback((sp: SavedPalette) => {
    setCurrentKeyword(sp.keyword === '随机灵感' ? null : sp.keyword);
    setTransitioning(true);
    setCurrentPalette(sp.colors);
    setTimeout(() => setTransitioning(false), 600);
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }, []);

  const bgColor = currentKeyword
    ? (() => {
        const kw = KEYWORDS.find((k) => k.label === currentKeyword);
        if (!kw) return 'rgba(255,255,255,0.05)';
        const { h, s, l } = kw.hsl;
        return `hsla(${h}, ${s}%, ${l}%, 0.12)`;
      })()
    : 'rgba(255,255,255,0.05)';

  const adaptiveBg = currentPalette.length > 0
    ? (() => {
        const base = currentPalette[0];
        return isDarkMode
          ? `radial-gradient(ellipse at 30% 50%, ${base}22 0%, #0f0f1a 70%)`
          : `radial-gradient(ellipse at 30% 50%, ${base}18 0%, #f5f5fa 70%)`;
      })()
    : undefined;

  return (
    <div
      className="app-layout"
      style={{
        background: adaptiveBg,
        transition: 'background 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)',
      }}
    >
      <KeywordGrid
        selected={currentKeyword}
        onSelect={handleKeywordSelect}
        bgColor={bgColor}
      />

      <PaletteViewer
        palette={currentPalette}
        transitioning={transitioning}
      />

      <div className="action-panel glass">
        <div className="section-title">操作</div>
        <button className="action-btn primary" onClick={handleRandomInspiration}>
          🎲 随机灵感
        </button>
        <button
          className="action-btn"
          onClick={handleSave}
          disabled={currentPalette.length === 0}
          style={{ opacity: currentPalette.length === 0 ? 0.4 : 1 }}
        >
          💾 保存收藏
        </button>
        <button
          className="action-btn"
          onClick={handleCopyCSS}
          disabled={currentPalette.length === 0}
          style={{ opacity: currentPalette.length === 0 ? 0.4 : 1 }}
        >
          📋 复制CSS变量
        </button>
        <button className="action-btn" onClick={handleToggleTheme}>
          {isDarkMode ? '☀️ 白天模式' : '🌙 黑夜模式'}
        </button>

        {savedPalettes.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 12 }}>
              收藏夹
            </div>
            <div className="saved-list">
              {savedPalettes.map((sp) => (
                <div
                  key={sp.id}
                  className="saved-item"
                  onClick={() => handleLoadSaved(sp)}
                >
                  {sp.colors.map((c, i) => (
                    <div
                      key={i}
                      className="saved-swatch"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className={`copy-toast ${toastVisible ? 'show' : ''}`}>
        {toastMessage}
      </div>
    </div>
  );
}

export default App;
