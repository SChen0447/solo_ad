import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { extractLanguage, analyzeStyle } from './utils/codeAnalyzer';
import { getRecommendations } from './utils/recommendations';

interface CardStyle {
  borderRadius: number;
  fontSize: number;
  shadow: number;
  blur: number;
  overlayColor: string;
}

interface CardTheme {
  name: string;
  codeBg: string;
  quoteBg: string;
  textColor: string;
  keywordColor: string;
  stringColor: string;
  commentColor: string;
  funcColor: string;
  numberColor: string;
}

const cardThemes: CardTheme[] = [
  {
    name: 'minimal',
    codeBg: '#ffffff',
    quoteBg: 'rgba(255,255,255,0.9)',
    textColor: '#1a1a2e',
    keywordColor: '#c792ea',
    stringColor: '#a5d6ff',
    commentColor: '#6b7280',
    funcColor: '#82aaff',
    numberColor: '#f78c6c',
  },
  {
    name: 'pixel',
    codeBg: '#1a3a1a',
    quoteBg: 'rgba(26, 58, 26, 0.95)',
    textColor: '#33ff33',
    keywordColor: '#66ff66',
    stringColor: '#99ff99',
    commentColor: '#00cc00',
    funcColor: '#00ff00',
    numberColor: '#ccffcc',
  },
  {
    name: 'cyber',
    codeBg: '#0d1117',
    quoteBg: 'rgba(13, 17, 23, 0.95)',
    textColor: '#00d4ff',
    keywordColor: '#ff00ff',
    stringColor: '#00ffff',
    commentColor: '#0088aa',
    funcColor: '#00ff88',
    numberColor: '#ffff00',
  },
];

const overlayColors = [
  'rgba(255, 0, 0, 0.15)',
  'rgba(255, 165, 0, 0.15)',
  'rgba(255, 255, 0, 0.15)',
  'rgba(0, 255, 0, 0.15)',
  'rgba(0, 0, 255, 0.15)',
  'rgba(128, 0, 128, 0.15)',
];

const langColors: Record<string, { bg: string; text: string }> = {
  JavaScript: { bg: '#F7DF1E', text: '#000000' },
  Python: { bg: '#3776AB', text: '#ffffff' },
  HTML: { bg: '#E34F26', text: '#ffffff' },
  CSS: { bg: '#1572B6', text: '#ffffff' },
  Unknown: { bg: '#666666', text: '#ffffff' },
};

const defaultCode = `function fibonacci(n) {
  // 计算斐波那契数列
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(result);`;

function highlightCode(code: string, theme: CardTheme, lang: string): React.ReactNode {
  const lines = code.split('\n');
  const keywordsJS = /\b(function|return|const|let|var|if|else|for|while|class|import|export|from|new|this|async|await|try|catch|throw)\b/g;
  const keywordsPY = /\b(def|return|if|elif|else|for|while|class|import|from|as|try|except|raise|with|pass|lambda)\b/g;
  const keywords = lang === 'Python' ? keywordsPY : keywordsJS;

  return lines.map((line, i) => {
    const isComment =
      line.trim().startsWith('//') ||
      line.trim().startsWith('#') ||
      line.trim().startsWith('/*') ||
      line.trim().startsWith('*') ||
      line.trim().startsWith('<!--');

    let parts: React.ReactNode[] = [];

    if (isComment) {
      parts = [
        <span key={i} style={{ color: theme.commentColor, fontStyle: 'italic' }}>
          {line}
        </span>,
      ];
    } else {
      const tokens = line.split(/(\/\/|#|\/\*|<!--|".*?"|'.*?'|`[\s\S]*?`|\b\d+\.?\d*\b)/g).filter(Boolean);

      parts = tokens.map((token, j) => {
        const key = `${i}-${j}`;

        if (/^\/\/|^#|^\/\*|^<!--/.test(token)) {
          return (
            <span key={key} style={{ color: theme.commentColor, fontStyle: 'italic' }}>
              {token}
            </span>
          );
        }

        if (/^["'`]/.test(token)) {
          return (
            <span key={key} style={{ color: theme.stringColor }}>
              {token}
            </span>
          );
        }

        if (/^\d+\.?\d*$/.test(token)) {
          return (
            <span key={key} style={{ color: theme.numberColor }}>
              {token}
            </span>
          );
        }

        let remaining = token;
        const result: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        const kwRegex = new RegExp(keywords.source, 'g');

        while ((match = kwRegex.exec(token)) !== null) {
          if (match.index > lastIndex) {
            result.push(
              <span key={`${key}-text-${lastIndex}`}>
              {token.slice(lastIndex, match.index)}
            </span>
            );
          }
          result.push(
            <span key={`${key}-kw-${match.index}`} style={{ color: theme.keywordColor, fontWeight: 'bold' }}>
              {match[0]}
            </span>
          );
          lastIndex = kwRegex.lastIndex;
        }

        if (lastIndex < token.length) {
          const rest = token.slice(lastIndex);
          if (/\w+\s*\(/.test(rest)) {
            const funcMatch = rest.match(/^(\w+)(\s*\()/);
            if (funcMatch) {
              result.push(
                <span key={`${key}-func`} style={{ color: theme.funcColor }}>
                  {funcMatch[1]}
                </span>
              );
              result.push(
                <span key={`${key}-paren`}>{funcMatch[2]}</span>
              );
              result.push(
                <span key={`${key}-rest`}>{rest.slice(funcMatch[0].length)}</span>
              );
            } else {
              result.push(<span key={`${key}-rest`}>{rest}</span>);
            }
          } else {
            result.push(<span key={`${key}-rest`}>{rest}</span>);
          }
        }

        return <React.Fragment key={key}>{result}</React.Fragment>;
      });
    }

    return (
      <div key={i} style={{ display: 'block', whiteSpace: 'pre' }}>
        <span style={{ opacity: 0.5, marginRight: '12px', display: 'inline-block', width: '24px', textAlign: 'right', userSelect: 'none' }}>
          {i + 1}
        </span>
        {parts}
      </div>
    );
  });
}

export default function App() {
  const [code, setCode] = useState(defaultCode);
  const [debouncedCode, setDebouncedCode] = useState(defaultCode);
  const [language, setLanguage] = useState('JavaScript');
  const [style, setStyle] = useState({ indentType: 'Spaces', commentRatio: 0.2 });
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [cardStyle, setCardStyle] = useState<CardStyle>({
    borderRadius: 12,
    fontSize: 16,
    shadow: 8,
    blur: 0,
    overlayColor: 'transparent',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCard, setSelectedCard] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(code);
    }, 500);
    return () => clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    if (debouncedCode.trim()) {
      const detectedLang = extractLanguage(debouncedCode);
      const detectedStyle = analyzeStyle(debouncedCode);
      const recs = getRecommendations(detectedLang, detectedStyle);
      setLanguage(detectedLang);
      setStyle(detectedStyle);
      setRecommendations(recs);
    }
  }, [debouncedCode]);

  const langColor = useMemo(() => langColors[language] || langColors.Unknown, [language]);

  const handleExport = useCallback(async (index: number) => {
    const node = cardRefs.current[index];
    if (!node) return;

    setSelectedCard(index);
    setIsExporting(true);

    try {
      const dataUrl = await toPng(node, {
        width: 1200,
        height: 630,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#16213e',
      });

      const link = document.createElement('a');
      link.download = `code-card-${language}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  }, [language]);

  const getThemeName = (idx: number) => {
    const names = ['极简白底', '像素复古', '暗黑赛博'];
    return names[idx] || '风格';
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>
          <span className="logo-icon">✦</span>
          Code Poetry Card Generator
        </h1>
        <p className="subtitle">将代码化为诗意的分享卡片</p>
      </header>

      <section className="input-section">
        <textarea
          className="code-textarea"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="在此输入或粘贴你的代码..."
          spellCheck={false}
        />
        <div className="lang-info">
          <span
            className="lang-tag"
            style={{ backgroundColor: langColor.bg, color: langColor.text }}
          >
            {language}
          </span>
          <span className="style-info">
            缩进: {style.indentType} · 注释密度: {(style.commentRatio * 100).toFixed(0)}%
          </span>
        </div>
      </section>

      <section className="cards-section">
        {recommendations.length > 0 &&
          cardThemes.map((theme, idx) => (
            <div
              key={theme.name}
              className="card-wrapper"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="theme-label">{getThemeName(idx)} 风格</div>
              <div
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                className={`card code-card`}
                style={{
                  borderRadius: `${cardStyle.borderRadius}px`,
                  boxShadow: `0 ${cardStyle.shadow}px ${cardStyle.shadow * 2}px rgba(0, 0, 0, 0.3)`,
                  fontSize: `${cardStyle.fontSize}px`,
                  backdropFilter: `blur(${cardStyle.blur}px)`,
                  WebkitBackdropFilter: `blur(${cardStyle.blur}px)`,
                }}
              >
                <div
                  className="card-overlay"
                  style={{ backgroundColor: cardStyle.overlayColor }}
                />

                <div className="card-left" style={{ backgroundColor: theme.codeBg }}>
                  <div className="code-window-bar" style={{ borderBottom: `1px solid ${theme.textColor}22` }}>
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                    <span className="file-name" style={{ color: theme.textColor + '88' }}>
                      snippet.{language.toLowerCase() === 'unknown' ? 'txt' : language.toLowerCase()}
                    </span>
                  </div>
                  <div className="code-content" style={{ color: theme.textColor }}>
                    {highlightCode(debouncedCode, theme, language)}
                  </div>
                </div>

                <div className="card-right" style={{ backgroundColor: theme.quoteBg }}>
                  <div className="quote-decoration" style={{ color: theme.textColor + '33' }}>
                    ❝
                  </div>
                  <div
                    className="quote-text"
                    style={{ color: theme.textColor }}
                  >
                    {recommendations[idx]}
                  </div>
                  <div className="quote-footer" style={{ color: theme.textColor + '88' }}>
                    <span>

                    </span>
                    <span className="lang-badge" style={{ backgroundColor: langColor.bg, color: langColor.text }}>
                      {language}
                    </span>
                  </div>
                </div>

                <button
                  className="export-btn"
                  onClick={() => handleExport(idx)}
                  title="导出为PNG"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
      </section>

      <section className="control-panel">
        <div className="control-grid">
          <div className="control-item">
            <label>
              边框圆角 <span className="control-value">{cardStyle.borderRadius}px</span>
            </label>
            <input
              type="range"
              min="5"
              max="20"
              value={cardStyle.borderRadius}
              onChange={(e) =>
                setCardStyle({ ...cardStyle, borderRadius: Number(e.target.value) })
              }
            />
          </div>

          <div className="control-item">
            <label>
              字体大小 <span className="control-value">{cardStyle.fontSize}px</span>
            </label>
            <input
              type="range"
              min="12"
              max="24"
              value={cardStyle.fontSize}
              onChange={(e) =>
                setCardStyle({ ...cardStyle, fontSize: Number(e.target.value) })
              }
            />
          </div>

          <div className="control-item">
            <label>
              阴影强度 <span className="control-value">{cardStyle.shadow}px</span>
            </label>
            <input
              type="range"
              min="0"
              max="20"
              value={cardStyle.shadow}
              onChange={(e) =>
                setCardStyle({ ...cardStyle, shadow: Number(e.target.value) })
              }
            />
          </div>

          <div className="control-item">
            <label>
              背景模糊 <span className="control-value">{cardStyle.blur}px</span>
            </label>
            <input
              type="range"
              min="0"
              max="5"
              value={cardStyle.blur}
              onChange={(e) =>
                setCardStyle({ ...cardStyle, blur: Number(e.target.value) })
              }
            />
          </div>
        </div>

        <div className="color-picker">
          <label>彩色覆盖层</label>
          <div className="color-options">
            <button
              className={`color-option ${cardStyle.overlayColor === 'transparent' ? 'active' : ''}`}
              onClick={() => setCardStyle({ ...cardStyle, overlayColor: 'transparent' })}
              style={{ background: 'transparent', border: '2px dashed rgba(255,255,255,0.3)' }}
              title="无覆盖"
            >
              ×
            </button>
            {overlayColors.map((color, i) => (
              <button
                key={i}
                className={`color-option ${cardStyle.overlayColor === color ? 'active' : ''}`}
                onClick={() => setCardStyle({ ...cardStyle, overlayColor: color })}
                style={{ background: color }}
              />
            ))}
          </div>
        </div>
      </section>

      {isExporting && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <p>正在生成图片...</p>
        </div>
      )}
    </div>
  );
}
