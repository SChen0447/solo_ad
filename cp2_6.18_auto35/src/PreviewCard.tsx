import React, { useRef, useCallback, useEffect, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import html2canvas from 'html2canvas';
import type { Theme } from './themes';

interface PreviewCardProps {
  code: string;
  theme: Theme;
  language: string;
  showLineNumbers: boolean;
  fontSize: number;
  borderRadius: number;
  cardTitle: string;
  onCardTitleChange: (title: string) => void;
}

const PreviewCard: React.FC<PreviewCardProps> = ({
  code,
  theme,
  language,
  showLineNumbers,
  fontSize,
  borderRadius,
  cardTitle,
  onCardTitleChange,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState('');

  useEffect(() => {
    const grammarMap: Record<string, string> = {
      javascript: 'javascript',
      css: 'css',
      html: 'markup',
    };
    const grammarLang = grammarMap[language] || 'javascript';
    const grammar = Prism.languages[grammarLang];
    if (grammar) {
      setHighlightedCode(Prism.highlight(code, grammar, grammarLang));
    } else {
      setHighlightedCode(code.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    }
  }, [code, language]);

  const handleExport = useCallback(async () => {
    if (!cardRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `code-snapshot-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting]);

  const lineCount = code.split('\n').length;
  const charCount = code.length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => (
    <span key={i + 1}>{i + 1}</span>
  ));

  const langLabel = language.toUpperCase();

  const inlineThemeStyles = `
    .preview-card-code .token.keyword { color: ${theme.keywordColor}; }
    .preview-card-code .token.comment { color: ${theme.commentColor}; font-style: italic; }
    .preview-card-code .token.string { color: ${theme.stringColor}; }
    .preview-card-code .token.function { color: ${theme.functionColor}; }
    .preview-card-code .token.number { color: ${theme.numberColor}; }
    .preview-card-code .token.operator { color: ${theme.operatorColor}; }
    .preview-card-code .token.tag { color: ${theme.tagColor}; }
    .preview-card-code .token.attr-name { color: ${theme.attrColor}; }
    .preview-card-code .token.attr-value { color: ${theme.stringColor}; }
    .preview-card-code .token.punctuation { color: ${theme.textColor}; }
    .preview-card-code .token.class-name { color: ${theme.functionColor}; }
    .preview-card-code .token.boolean { color: ${theme.numberColor}; }
    .preview-card-code .token.property { color: ${theme.textColor}; }
    .preview-card-code .token.constant { color: ${theme.numberColor}; }
    .preview-card-code .token.builtin { color: ${theme.functionColor}; }
  `;

  return (
    <div className="preview-section">
      <h3>预览卡片</h3>
      <div className="preview-card-outer">
        <div
          ref={cardRef}
          className="preview-card"
          style={{
            background: theme.cardBackground,
            borderRadius: `${borderRadius}px`,
          }}
        >
          <style>{inlineThemeStyles}</style>
          <div className="preview-card-title-bar">
            <div
              className="title-accent-line"
              style={{ backgroundColor: theme.accentColor }}
            />
            <input
              className="preview-card-title-input"
              style={{ color: theme.titleColor }}
              value={cardTitle}
              onChange={(e) => onCardTitleChange(e.target.value)}
              placeholder="Code Snapshot"
            />
          </div>

          <div
            className={`preview-card-code${showLineNumbers ? ' has-line-numbers' : ''}`}
            style={{
              background: theme.codeAreaBackground,
              fontSize: `${fontSize}px`,
              fontFamily: theme.fontFamily,
            }}
          >
            {showLineNumbers && (
              <div
                className="card-line-numbers"
                style={{
                  color: theme.lineNumbersColor,
                  background: theme.lineNumbersBackground,
                  fontSize: `${fontSize}px`,
                  fontFamily: theme.fontFamily,
                  borderRight: `1px solid ${theme.name === 'frost-minimal' ? '#e0e0e0' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {lineNumbers}
              </div>
            )}
            <code
              className={`language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode }}
            />
          </div>

          <div className="preview-card-footer">
            <span
              className="language-tag"
              style={{
                background: theme.labelBackground,
                color: theme.labelColor,
              }}
            >
              {langLabel}
            </span>
            <span className="stats-tag" style={{ color: theme.watermarkColor }}>
              {lineCount} lines · {charCount} chars
            </span>
            <span className="watermark" style={{ color: theme.watermarkColor }}>
              Generated by Snapshot
            </span>
          </div>
        </div>
      </div>

      <button
        className="export-button"
        onClick={handleExport}
        disabled={isExporting}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 1V10M8 10L5 7M8 10L11 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 11V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {isExporting ? '生成中...' : '保存为图片'}
      </button>
    </div>
  );
};

export default PreviewCard;
