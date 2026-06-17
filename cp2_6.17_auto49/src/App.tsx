import { useState, useCallback, useRef } from 'react';
import { ColorInfo, ExtractResponse } from './types';
import UploadZone from './components/UploadZone';
import ColorPalette from './components/ColorPalette';
import TemplatePreview from './components/TemplatePreview';

const DEFAULT_COLORS: ColorInfo[] = [
  { hex: '#264653', percentage: 30, locked: false },
  { hex: '#2a9d8f', percentage: 25, locked: false },
  { hex: '#e9c46a', percentage: 20, locked: false },
  { hex: '#f4a261', percentage: 15, locked: false },
  { hex: '#e76f51', percentage: 10, locked: false },
];

export default function App() {
  const [colors, setColors] = useState<ColorInfo[]>(DEFAULT_COLORS);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const lockedColorsRef = useRef<Set<number>>(new Set());

  const handleFileUpload = useCallback(async (base64DataUrl: string) => {
    setLoading(true);
    try {
      const encoded = encodeURIComponent(base64DataUrl);
      const res = await fetch(`/api/extract-colors?image=${encoded}`, {
        method: 'GET',
      });
      const data: ExtractResponse = await res.json();
      if (data.colors) {
        setColors(prev => {
          return data.colors.map((c, i) => {
            const isLocked = prev[i]?.locked || lockedColorsRef.current.has(i);
            return {
              hex: isLocked ? prev[i].hex : c.hex,
              percentage: isLocked ? prev[i].percentage : c.percentage,
              locked: isLocked,
            };
          });
        });
      }
    } catch (err) {
      console.error('Color extraction failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleColorChange = useCallback((index: number, newHex: string) => {
    setColors(prev =>
      prev.map((c, i) => (i === index ? { ...c, hex: newHex } : c))
    );
  }, []);

  const handleToggleLock = useCallback((index: number) => {
    setColors(prev =>
      prev.map((c, i) => {
        if (i !== index) return c;
        const newLocked = !c.locked;
        if (newLocked) {
          lockedColorsRef.current.add(i);
        } else {
          lockedColorsRef.current.delete(i);
        }
        return { ...c, locked: newLocked };
      })
    );
  }, []);

  const cssCode = `:root {\n${colors
    .map((c, i) => {
      const names = ['--primary', '--secondary', '--tertiary', '--quaternary', '--quinary'];
      return `  ${names[i]}: ${c.hex};`;
    })
    .join('\n')}\n}`;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(cssCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [cssCode]);

  return (
    <div style={styles.container}>
      <div style={styles.mainRow}>
        <div style={styles.leftPanel}>
          <UploadZone onFileSelect={handleFileUpload} loading={loading} />
          <ColorPalette
            colors={colors}
            onColorChange={handleColorChange}
            onToggleLock={handleToggleLock}
          />
        </div>
        <div style={styles.divider} />
        <div style={styles.rightPanel}>
          <TemplatePreview colors={colors} />
        </div>
      </div>
      <div style={styles.bottomBar}>
        <div style={styles.codeArea}>{cssCode}</div>
        <div style={styles.copyWrapper}>
          <button style={styles.copyBtn} onClick={handleCopy}>
            {copied ? '已复制 ✓' : '复制'}
          </button>
          {copied && <div style={styles.copiedToast}>已复制到剪贴板</div>}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#121212',
    color: '#e0e0e0',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  mainRow: {
    display: 'flex',
    flex: '1 1 auto',
    alignItems: 'stretch',
  },
  leftPanel: {
    width: '45%',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  divider: {
    width: '1px',
    background: '#333',
    flexShrink: 0,
  },
  rightPanel: {
    width: '54%',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  bottomBar: {
    width: '100%',
    padding: '16px 24px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  codeArea: {
    flex: 1,
    height: '120px',
    background: '#1e1e1e',
    color: '#a5d6a7',
    fontFamily: 'monospace',
    fontSize: '14px',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    overflowX: 'auto',
    overflowY: 'auto',
    whiteSpace: 'pre',
    lineHeight: 1.6,
  },
  copyWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  copyBtn: {
    padding: '8px 20px',
    background: '#333',
    color: '#e0e0e0',
    border: '1px solid #555',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    transition: 'background 0.2s',
  },
  copiedToast: {
    position: 'absolute',
    top: '40px',
    background: '#64ffda',
    color: '#121212',
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    animation: 'fadeIn 0.2s ease',
  },
};
