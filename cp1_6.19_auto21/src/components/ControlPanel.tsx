import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/store';
import type { FontWeight, FontConfig, FontPair } from '@/types';
import { searchFonts, getFontWeights } from '@/modules/fontLoader';
import clsx from 'clsx';

const WEIGHTS: FontWeight[] = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const WEIGHT_LABELS: Record<FontWeight, string> = {
  100: 'Thin (100)',
  200: 'Extra Light (200)',
  300: 'Light (300)',
  400: 'Regular (400)',
  500: 'Medium (500)',
  600: 'Semi Bold (600)',
  700: 'Bold (700)',
  800: 'Extra Bold (800)',
  900: 'Black (900)',
};

type TabType = 'adjust' | 'presets';

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (family: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useMemo(() => searchFonts(query), [query]);

  return (
    <div className="control-group">
      <div className="control-label">
        <span>{label}</span>
        <span className="control-value" style={{ fontFamily: `'${value}'` }}>
          {value}
        </span>
      </div>
      <div className="font-select-wrapper" ref={containerRef}>
        <input
          type="text"
          value={open ? query : value}
          placeholder="搜索字体..."
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
        />
        {open && (
          <div className="dropdown">
            {results.map(font => (
              <div
                key={font.family}
                className={clsx('dropdown-item', { active: font.family === value })}
                onClick={() => {
                  onChange(font.family);
                  setOpen(false);
                  setQuery('');
                }}
              >
                <span className="font-family" style={{ fontFamily: `'${font.family}'` }}>
                  {font.family}
                </span>
                <span className="font-category">{font.category}</span>
              </div>
            ))}
            {results.length === 0 && (
              <div className="dropdown-item" style={{ color: '#94a3b8' }}>
                未找到匹配字体
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <div className="control-group">
      <div className="control-label">
        <span>{label}</span>
        <span className="control-value">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        className="custom-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ ['--value' as any]: `${percentage}%` }}
      />
    </div>
  );
}

function WeightSelect({
  value,
  onChange,
  availableWeights,
}: {
  value: FontWeight;
  onChange: (v: FontWeight) => void;
  availableWeights: FontWeight[];
}) {
  return (
    <div className="control-group">
      <div className="control-label">
        <span>字体粗细</span>
        <span className="control-value">{value}</span>
      </div>
      <select
        className="weight-select"
        value={value}
        onChange={e => onChange(parseInt(e.target.value, 10) as FontWeight)}
      >
        {availableWeights.map(w => (
          <option key={w} value={w}>
            {WEIGHT_LABELS[w]}
          </option>
        ))}
      </select>
    </div>
  );
}

function FontConfigCard({
  title,
  config,
  onUpdate,
  icon,
}: {
  title: string;
  config: FontConfig;
  onUpdate: (c: Partial<FontConfig>) => void;
  icon: string;
}) {
  const weights = getFontWeights(config.family);
  const closestWeight = useMemo(() => {
    if (weights.includes(config.weight)) return config.weight;
    return weights.reduce((prev, curr) =>
      Math.abs(curr - config.weight) < Math.abs(prev - config.weight) ? curr : prev
    );
  }, [weights, config.weight]);

  useEffect(() => {
    if (closestWeight !== config.weight) {
      onUpdate({ weight: closestWeight });
    }
  }, [closestWeight]);

  return (
    <div className="card">
      <div className="card-title">
        <span className="icon">{icon}</span>
        {title}
      </div>
      <FontSelect
        label="字体系列"
        value={config.family}
        onChange={family => onUpdate({ family })}
      />
      <SliderControl
        label="字号"
        value={config.size}
        min={12}
        max={48}
        step={1}
        unit="px"
        onChange={size => onUpdate({ size })}
      />
      <SliderControl
        label="行高"
        value={config.lineHeight}
        min={1.2}
        max={2.0}
        step={0.1}
        unit=""
        onChange={lineHeight => onUpdate({ lineHeight: parseFloat(lineHeight.toFixed(1)) })}
      />
      <SliderControl
        label="字间距"
        value={config.letterSpacing}
        min={-2}
        max={8}
        step={0.5}
        unit="px"
        onChange={letterSpacing =>
          onUpdate({ letterSpacing: parseFloat(letterSpacing.toFixed(1)) })
        }
      />
      <WeightSelect
        value={config.weight}
        onChange={weight => onUpdate({ weight })}
        availableWeights={weights}
      />
    </div>
  );
}

function PresetCard({
  preset,
  onClick,
}: {
  preset: { id: string; name: string; description: string; heading: FontConfig; body: FontConfig };
  onClick: () => void;
}) {
  return (
    <div className="preset-card" onClick={onClick}>
      <div className="preset-card-preview">
        <div
          className="preset-card-preview-h"
          style={{
            fontFamily: `'${preset.heading.family}', serif`,
            fontWeight: preset.heading.weight,
            lineHeight: preset.heading.lineHeight,
            letterSpacing: `${preset.heading.letterSpacing}px`,
          }}
        >
          标题字体示例
        </div>
        <div
          className="preset-card-preview-b"
          style={{
            fontFamily: `'${preset.body.family}', sans-serif`,
            fontWeight: preset.body.weight,
            lineHeight: preset.body.lineHeight,
          }}
        >
          这是正文字体的预览文本，用于快速查看字体配对效果
        </div>
      </div>
      <div className="preset-card-name">{preset.name}</div>
      <div className="preset-card-desc">{preset.description}</div>
    </div>
  );
}

function generateCSS(heading: FontConfig, body: FontConfig, cards: FontPair[]): string {
  const format = (c: FontConfig) => `\
  font-family: '${c.family}', ${c.family.includes('Mono') ? 'monospace' : c.family === 'Playfair Display' || c.family === 'Merriweather' || c.family === 'Lora' || c.family === 'Georgia' ? 'serif' : 'sans-serif'};
  font-size: ${c.size}px;
  line-height: ${c.lineHeight};
  letter-spacing: ${c.letterSpacing}px;
  font-weight: ${c.weight};`;

  let css = `/* ============================================
   字体比例尺 CSS 代码片段
   由字体配对实验室生成
   ============================================ */

:root {
  --heading-font-family: '${heading.family}';
  --heading-font-size: ${heading.size}px;
  --heading-line-height: ${heading.lineHeight};
  --heading-letter-spacing: ${heading.letterSpacing}px;
  --heading-font-weight: ${heading.weight};

  --body-font-family: '${body.family}';
  --body-font-size: ${body.size}px;
  --body-line-height: ${body.lineHeight};
  --body-letter-spacing: ${body.letterSpacing}px;
  --body-font-weight: ${body.weight};
}

/* ===== 基础排版样式 ===== */

html {
  font-size: 16px;
}

body {
${format(body)}
  color: #334155;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ===== 标题层级 ===== */

h1, h2, h3, h4, h5, h6 {
${format({ ...heading, size: heading.size })}
  color: #0f172a;
}

h1 {
  font-size: ${heading.size}px;
  line-height: ${heading.lineHeight};
}

h2 {
  font-size: ${Math.round(heading.size * 0.82)}px;
  line-height: ${heading.lineHeight};
}

h3 {
  font-size: ${Math.round(heading.size * 0.68)}px;
  line-height: ${heading.lineHeight};
}

h4 {
  font-size: ${Math.round(heading.size * 0.56)}px;
  line-height: ${heading.lineHeight};
}

/* ===== 段落 ===== */

p {
  font-size: ${body.size}px;
  line-height: ${body.lineHeight};
  letter-spacing: ${body.letterSpacing}px;
  margin-bottom: 1em;
}`;

  if (cards.length > 0) {
    css += `

/* ===== 对比卡片样式 ===== */

`;
    cards.forEach(card => {
      css += `.${card.label.toLowerCase().replace(/\s/g, '-')}-heading {
${format(card.heading)}
}

.${card.label.toLowerCase().replace(/\s/g, '-')}-body {
${format(card.body)}
}

`;
    });
  }

  return css;
}

function CSSModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const heading = useStore(s => s.currentHeading);
  const body = useStore(s => s.currentBody);
  const cards = useStore(s => s.cards);
  const [toast, setToast] = useState(false);

  const css = useMemo(() => generateCSS(heading, body, cards), [heading, body, cards]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = css;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setToast(true);
      setTimeout(() => setToast(false), 2000);
    }
  };

  const highlightedCSS = useMemo(() => {
    const lines = css.split('\n');
    return lines.map((line, i) => {
      let content = line;
      if (line.includes('/*') || line.includes('* ')) {
        content = `<span class="comment">${line}</span>`;
      } else if (line.match(/^\..*?\{|^h\d|^body|^html|:root/)) {
        content = line.replace(/([^{]+)(\{?)/, '<span class="selector">$1</span>$2');
      } else if (line.includes(':')) {
        const [prop, ...rest] = line.split(':');
        const val = rest.join(':');
        content = `  <span class="property">${prop.trimStart()}</span>:${val}`;
      }
      return `${content}`;
    }).join('\n');
  }, [css]);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">导出 CSS 字体比例尺</div>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body">
            <pre
              className="code-block"
              dangerouslySetInnerHTML={{ __html: highlightedCSS }}
            />
          </div>
          <div className="modal-footer">
            <button className="secondary-btn" onClick={onClose}>
              关闭
            </button>
            <button className="primary-btn" onClick={copyToClipboard}>
              复制到剪贴板
            </button>
          </div>
        </div>
      </div>
      {toast && <div className="toast">已复制到剪贴板 ✓</div>}
    </>
  );
}

function ControlPanel() {
  const currentHeading = useStore(s => s.currentHeading);
  const currentBody = useStore(s => s.currentBody);
  const cards = useStore(s => s.cards);
  const presets = useStore(s => s.presets);
  const updateHeading = useStore(s => s.updateHeading);
  const updateBody = useStore(s => s.updateBody);
  const addCard = useStore(s => s.addCard);
  const applyPreset = useStore(s => s.applyPreset);

  const [tab, setTab] = useState<TabType>('adjust');
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <aside className="control-panel">
        <div className="panel-header">
          <h1 className="panel-title">字体配对实验室</h1>
          <p className="panel-subtitle">探索字体配对的无限可能</p>
        </div>
        <div className="panel-content">
          <div className="tabs">
            <button
              className={clsx('tab-btn', { active: tab === 'adjust' })}
              onClick={() => setTab('adjust')}
            >
              ⚙ 参数调节
            </button>
            <button
              className={clsx('tab-btn', { active: tab === 'presets' })}
              onClick={() => setTab('presets')}
            >
              🎨 预设方案
            </button>
          </div>

          {tab === 'adjust' && (
            <>
              <FontConfigCard
                title="标题字体 (Heading)"
                config={currentHeading}
                onUpdate={updateHeading}
                icon="H"
              />
              <FontConfigCard
                title="正文字体 (Body)"
                config={currentBody}
                onUpdate={updateBody}
                icon="B"
              />

              <div className="card">
                <div className="card-title">
                  <span className="icon">📑</span>
                  对比卡片 ({cards.length})
                </div>
                {cards.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📌</div>
                    <p className="empty-state-text">
                      点击右下角浮动按钮
                      <br />
                      保存当前字体组合为对比卡片
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cards.map(card => (
                      <div
                        key={card.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: card.labelColor,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {card.label}
                        </span>
                        <span style={{ color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {card.heading.family} × {card.body.family}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="export-btn" onClick={() => setShowModal(true)}>
                📋 导出样式 (CSS)
              </button>
            </>
          )}

          {tab === 'presets' && (
            <div className="preset-grid">
              {presets.map(preset => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  onClick={() => applyPreset(preset.id)}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      <button
        className="fab"
        onClick={addCard}
        title="添加到对比卡片"
        aria-label="添加到对比卡片"
      >
        +
      </button>

      {showModal && <CSSModal onClose={() => setShowModal(false)} />}
    </>
  );
}

export default ControlPanel;
