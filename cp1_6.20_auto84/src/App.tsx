import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import {
  ColorPaletteData,
  buildDefaultPalette,
  updateTokenByKey,
  exportCSSVars,
  darkenColor,
  getContrastText
} from './colorUtils';
import { ColorPalette } from './ColorPalette';
import { ThemePreview } from './ThemePreview';

function App() {
  const [palette, setPalette] = useState<ColorPaletteData>(() => buildDefaultPalette());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  const pendingPaletteRef = useRef(palette);
  const paletteRafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = viewportWidth < 768;
  const isMedium = viewportWidth >= 768 && viewportWidth <= 1024;

  const leftWidth: string = isMobile ? '100%' : isMedium ? '40%' : '35%';
  const rightWidth: string = isMobile ? '100%' : isMedium ? '60%' : '65%';

  const handleUpdateColor = useCallback((key: string, hex: string) => {
    pendingPaletteRef.current = updateTokenByKey(pendingPaletteRef.current, key, hex);
    if (paletteRafRef.current !== null) return;
    paletteRafRef.current = requestAnimationFrame(() => {
      paletteRafRef.current = null;
      setPalette(pendingPaletteRef.current);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (paletteRafRef.current !== null) cancelAnimationFrame(paletteRafRef.current);
    };
  }, []);

  const handleSelectKey = useCallback((key: string | null) => {
    setSelectedKey(prev => (prev === key ? null : key));
  }, []);

  const cssCode = useMemo(() => exportCSSVars(palette), [palette]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = cssCode;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [cssCode]);

  const primary = palette.primary.hex;
  const primaryText = getContrastText(primary);
  const hoverPrimary = darkenColor(primary, 0.12);

  const codeLines = useMemo(() => {
    const lines = cssCode.split('\n');
    return lines;
  }, [cssCode]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          background: '#ffffff',
          borderBottom: '1px solid #eaeaea',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${palette.primary.hex}, ${palette.secondary[0].hex}, ${palette.functional.success.hex})`,
              boxShadow: `0 2px 8px ${palette.primary.hex}44`
            }}
          />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a', letterSpacing: 0.3 }}>
              配色方案生成器
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
              Color Palette Generator
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowExport(true)}
          onMouseEnter={(e) => {
            const t = e.currentTarget as HTMLButtonElement;
            t.style.background = hoverPrimary;
          }}
          onMouseLeave={(e) => {
            const t = e.currentTarget as HTMLButtonElement;
            t.style.background = primary;
          }}
          style={{
            background: primary,
            color: primaryText,
            border: 'none',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s ease, transform 0.2s ease',
            letterSpacing: 0.2,
            boxShadow: `0 2px 6px ${primary}44`
          }}
        >
          导出 CSS
        </button>
      </div>

      <div
        style={{
          display: isMobile ? 'block' : 'flex',
          flex: 1,
          height: 'calc(100vh - 60px)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: leftWidth,
            height: isMobile ? 'auto' : '100%',
            flexShrink: 0,
            background: '#ffffff',
            overflowY: 'auto',
            borderRight: isMobile ? 'none' : '1px solid #eaeaea',
            borderBottom: isMobile ? '1px solid #eaeaea' : 'none'
          }}
        >
          <ColorPalette
            palette={palette}
            selectedKey={selectedKey}
            onSelectKey={handleSelectKey}
            onUpdateColor={handleUpdateColor}
          />
        </div>
        <div
          style={{
            width: rightWidth,
            flex: isMobile ? 'none' : 1,
            height: isMobile ? 'auto' : '100%',
            overflowY: 'auto'
          }}
        >
          <ThemePreview palette={palette} isMobile={isMobile} />
        </div>
      </div>

      {showExport && (
        <div
          onClick={() => setShowExport(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            animation: 'fadeBg 0.2s ease-out'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '85vh',
              borderRadius: 12,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'modalPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div
              style={{
                background: '#252526',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #3c3c3c'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ff5f56' }} />
                  <div style={{ width: 12, height: 12, borderRadius: 6, background: '#ffbd2e' }} />
                  <div style={{ width: 12, height: 12, borderRadius: 6, background: '#27ca40' }} />
                </div>
                <div style={{ color: '#cccccc', fontSize: 12, marginLeft: 10, fontWeight: 500 }}>
                  theme.css — CSS 自定义属性
                </div>
              </div>
              <button
                onClick={handleCopy}
                onMouseEnter={(e) => {
                  const t = e.currentTarget as HTMLButtonElement;
                  if (!copied) t.style.background = hoverPrimary;
                }}
                onMouseLeave={(e) => {
                  const t = e.currentTarget as HTMLButtonElement;
                  if (!copied) t.style.background = primary;
                }}
                style={{
                  background: copied ? '#27ca40' : primary,
                  color: copied ? '#ffffff' : primaryText,
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                  minWidth: 92,
                  textAlign: 'center'
                }}
              >
                {copied ? '已复制 ✓' : '复制代码'}
              </button>
            </div>
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                background: '#1e1e1e',
                padding: 0,
                fontSize: 14,
                lineHeight: 1.55,
                fontFamily: '"Fira Code", "SF Mono", Monaco, Consolas, "Courier New", monospace',
                color: '#d4d4d4'
              }}
            >
              <pre style={{ margin: 0, padding: 0 }}>
                <code>
                  {codeLines.map((line, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        minHeight: 22
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          flexShrink: 0,
                          textAlign: 'right',
                          padding: '0 12px 0 16px',
                          color: '#858585',
                          userSelect: 'none',
                          fontSize: 13,
                          borderRight: '1px solid #333333',
                          marginRight: 14
                        }}
                      >
                        {i + 1}
                      </div>
                      <div
                        style={{
                          flex: 1,
                          paddingRight: 18,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                          ...highlightLine(line)
                        }}
                      >
                        {line.length === 0 ? '\u00a0' : line}
                      </div>
                    </div>
                  ))}
                </code>
              </pre>
            </div>
          </div>
          <style>{`
            @keyframes fadeBg {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
            @keyframes modalPop {
              0% { transform: scale(0.96) translateY(8px); opacity: 0; }
              100% { transform: scale(1) translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function highlightLine(line: string): React.CSSProperties {
  if (/^(\s)*\/\*/.test(line)) return { color: '#6A9955' };
  if (/:root/.test(line)) return { color: '#DCDCAA', fontWeight: 500 };
  if (/--color-/.test(line)) return { color: '#9CDCFE' };
  if (/#[0-9A-Fa-f]{6}/.test(line)) return { color: '#CE9178' };
  if (/^(\s)*\{/.test(line) || /^(\s)*\}/.test(line)) return { color: '#D4D4D4' };
  return { color: '#d4d4d4' };
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<App />);
}

export default App;
