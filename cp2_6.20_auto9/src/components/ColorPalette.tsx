import { useState, useCallback } from 'react';
import {
  ColorPalette as Palette,
  TokenMap,
  ColorShade,
  ExportFormat,
} from '../colorSystem/colorTypes';
import {
  generateCssVariables,
  generateJson,
  generateTailwindConfig,
} from '../colorSystem/colorEngine';

interface ColorPaletteProps {
  palette: Palette;
  tokens: TokenMap;
  onTokenChange: (
    category: 'primary' | 'secondary' | 'neutral',
    level: number,
    value: string,
  ) => void;
  onShowToast: (message: string) => void;
  animationKey: number;
}

const CATEGORIES: Array<{
  key: 'primary' | 'secondary' | 'neutral';
  label: string;
  dotColor: string;
}> = [
  { key: 'primary', label: '主色系 (Primary)', dotColor: 'var(--app-primary)' },
  { key: 'secondary', label: '辅色系 (Secondary)', dotColor: 'var(--app-secondary)' },
  { key: 'neutral', label: '中性色 (Neutral)', dotColor: '#6b7280' },
];

function wcagClass(level: string): string {
  switch (level) {
    case 'AAA':
      return 'wcag-badge aaa';
    case 'AA':
      return 'wcag-badge aa';
    case 'Large-AA':
      return 'wcag-badge large-aa';
    default:
      return 'wcag-badge fail';
  }
}

function textColorFor(shade: ColorShade): string {
  return shade.hsl.l > 60 ? '#1a1a2e' : '#ffffff';
}

interface ShadeCardProps {
  shade: ColorShade;
  category: 'primary' | 'secondary' | 'neutral';
  tokenName: string;
  onTokenChange: (level: number, value: string) => void;
  stagger: number;
  animationKey: number;
  onShowToast: (msg: string) => void;
}

function ShadeCard({
  shade,
  category,
  tokenName,
  onTokenChange,
  stagger,
  animationKey,
  onShowToast,
}: ShadeCardProps) {
  const [pulse, setPulse] = useState(false);
  const bgTextColor = textColorFor(shade);
  const cardBg =
    category === 'primary'
      ? 'rgba(255,255,255,0.15)'
      : category === 'secondary'
      ? 'rgba(255,255,255,0.12)'
      : 'rgba(255,255,255,0.1)';

  const handleClick = useCallback(() => {
    setPulse(true);
    navigator.clipboard?.writeText(shade.hex);
    onShowToast(`已复制 ${shade.hex}`);
    window.setTimeout(() => setPulse(false), 320);
  }, [shade.hex, onShowToast]);

  return (
    <div
      className={`color-card ${pulse ? 'pulse' : ''} fade-in-up color-fly-in stagger-${Math.min(
        stagger + 1,
        10,
      )}`}
      key={`${animationKey}-${category}-${shade.level}`}
      style={{
        background: `${shade.hex}22`,
        border: `1px solid ${shade.hex}44`,
        color: bgTextColor,
      }}
      onClick={handleClick}
    >
      <div
        className="color-card-block"
        style={{
          background: shade.hex,
          backgroundColor: shade.hex,
        }}
      />
      <div className="color-card-meta">
        <span className="color-card-level">{shade.level}</span>
        <span
          className="color-card-hex"
          style={{
            background: cardBg,
            color: bgTextColor,
          }}
        >
          {shade.hex}
        </span>
      </div>
      <div className="contrast-ratio">对比度 {shade.contrastRatio.toFixed(2)}:1</div>
      <span className={wcagClass(shade.wcagLevel)}>
        {shade.wcagLevel === 'Large-AA' ? 'L-AA' : shade.wcagLevel}
      </span>
      <input
        type="text"
        className="token-input"
        value={tokenName}
        placeholder="令牌名"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onTokenChange(shade.level, e.target.value)}
      />
    </div>
  );
}

export default function ColorPalette({
  palette,
  tokens,
  onTokenChange,
  onShowToast,
  animationKey,
}: ColorPaletteProps) {
  const [activeFormat, setActiveFormat] = useState<ExportFormat>('css');

  const buildTokensParam = () => ({
    primary: tokens.primary,
    secondary: tokens.secondary,
    neutral: tokens.neutral,
  });

  const handleCopyAll = useCallback(() => {
    const t = buildTokensParam();
    let content: string;
    switch (activeFormat) {
      case 'json':
        content = generateJson(palette, t);
        break;
      case 'tailwind':
        content = generateTailwindConfig(palette, t);
        break;
      default:
        content = generateCssVariables(palette, t);
    }
    navigator.clipboard?.writeText(content);
    onShowToast(`已复制全部令牌为 ${activeFormat.toUpperCase()} 格式`);
  }, [activeFormat, palette, tokens, onShowToast]);

  const handleDownload = useCallback(() => {
    const t = buildTokensParam();
    let content: string;
    let filename: string;
    let mime: string;
    switch (activeFormat) {
      case 'json':
        content = generateJson(palette, t);
        filename = 'design-tokens.json';
        mime = 'application/json';
        break;
      case 'tailwind':
        content = generateTailwindConfig(palette, t);
        filename = 'tailwind.colors.js';
        mime = 'text/javascript';
        break;
      default:
        content = generateCssVariables(palette, t);
        filename = 'tokens.css';
        mime = 'text/css';
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast(`已下载 ${filename}`);
  }, [activeFormat, palette, tokens, onShowToast]);

  return (
    <section className="glass-panel fade-in-up">
      <div className="flex justify-between items-center mb-5">
        <h2 className="section-title" style={{ margin: 0 }}>
          色彩系统色阶
        </h2>
        <div className="flex items-center gap-3">
          <div className="btn-group">
            <button
              className={`btn ${activeFormat === 'css' ? 'active' : ''}`}
              onClick={() => setActiveFormat('css')}
            >
              CSS
            </button>
            <button
              className={`btn ${activeFormat === 'json' ? 'active' : ''}`}
              onClick={() => setActiveFormat('json')}
            >
              JSON
            </button>
            <button
              className={`btn ${activeFormat === 'tailwind' ? 'active' : ''}`}
              onClick={() => setActiveFormat('tailwind')}
            >
              Tailwind
            </button>
          </div>
          <button className="btn btn-primary" onClick={handleCopyAll}>
            ⧉ 复制全部
          </button>
          <button className="btn" onClick={handleDownload}>
            ⬇ 下载
          </button>
        </div>
      </div>

      {CATEGORIES.map((cat, catIdx) => (
        <div className="palette-section" key={cat.key}>
          <div className="palette-label">
            <h3>
              <span
                className="dot"
                style={{
                  background:
                    cat.key === 'neutral'
                      ? palette.neutral[5]?.hex || '#6b7280'
                      : cat.dotColor,
                }}
              />
              {cat.label}
            </h3>
          </div>
          <div className="color-grid">
            {palette[cat.key].map((shade, idx) => (
              <ShadeCard
                shade={shade}
                category={cat.key}
                tokenName={tokens[cat.key][shade.level] || String(shade.level)}
                onTokenChange={(level, val) =>
                  onTokenChange(cat.key, level, val)
                }
                stagger={idx + catIdx * 10}
                animationKey={animationKey}
                onShowToast={onShowToast}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
