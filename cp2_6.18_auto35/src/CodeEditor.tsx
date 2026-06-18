import React, { useRef, useCallback, useEffect, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import type { Theme } from './themes';

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  theme: Theme;
  language: string;
  showLineNumbers: boolean;
  fontSize: number;
  onShowLineNumbersChange: (v: boolean) => void;
  onFontSizeChange: (v: number) => void;
  borderRadius: number;
  onBorderRadiusChange: (v: number) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onCodeChange,
  theme,
  language,
  showLineNumbers,
  fontSize,
  onShowLineNumbersChange,
  onFontSizeChange,
  borderRadius,
  onBorderRadiusChange,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const [highlightedCode, setHighlightedCode] = useState('');
  const isSyncingScroll = useRef(false);

  const highlight = useCallback((src: string, lang: string) => {
    const grammarMap: Record<string, string> = {
      javascript: 'javascript',
      css: 'css',
      html: 'markup',
    };
    const grammarLang = grammarMap[lang] || 'javascript';
    const grammar = Prism.languages[grammarLang];
    if (grammar) {
      return Prism.highlight(src, grammar, grammarLang);
    }
    return src.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }, []);

  useEffect(() => {
    const start = performance.now();
    const result = highlight(code, language);
    setHighlightedCode(result);
    const elapsed = performance.now() - start;
    if (elapsed > 300) {
      console.warn(`Highlight took ${elapsed.toFixed(1)}ms`);
    }
  }, [code, language, highlight]);

  useEffect(() => {
    if (textareaRef.current && highlightRef.current) {
      textareaRef.current.style.fontSize = `${fontSize}px`;
      highlightRef.current.style.fontSize = `${fontSize}px`;
    }
    if (lineNumRef.current) {
      lineNumRef.current.style.fontSize = `${fontSize}px`;
    }
  }, [fontSize]);

  const handleScroll = useCallback((source: 'textarea' | 'highlight') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      const highlight = highlightRef.current;
      const lineNum = lineNumRef.current;

      if (source === 'textarea' && textarea && highlight) {
        highlight.scrollTop = textarea.scrollTop;
        highlight.scrollLeft = textarea.scrollLeft;
        if (lineNum) {
          lineNum.scrollTop = textarea.scrollTop;
        }
      } else if (source === 'highlight' && textarea && highlight) {
        textarea.scrollTop = highlight.scrollTop;
        textarea.scrollLeft = highlight.scrollLeft;
        if (lineNum) {
          lineNum.scrollTop = highlight.scrollTop;
        }
      }

      isSyncingScroll.current = false;
    });
  }, []);

  const handleTextareaScroll = useCallback(() => {
    handleScroll('textarea');
  }, [handleScroll]);

  const handleHighlightScroll = useCallback(() => {
    handleScroll('highlight');
  }, [handleScroll]);

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => (
    <span key={i + 1}>{i + 1}</span>
  ));

  const lineNumColor = theme.name === 'frost-minimal' ? '#adb5bd' : '#484f58';
  const lineNumBg = theme.name === 'frost-minimal' ? '#f0f0f0' : '#1a1a1a';
  const lineNumBorder = theme.name === 'frost-minimal' ? '1px solid #e0e0e0' : '1px solid #2d333b';

  return (
    <div className="editor-wrapper">
      <div
        className={`editor-container${showLineNumbers ? '' : ' no-line-numbers'}`}
        style={{ borderRadius: `${borderRadius}px` }}
      >
        {showLineNumbers && (
          <div
            ref={lineNumRef}
            className="line-numbers"
            style={{
              color: lineNumColor,
              background: lineNumBg,
              borderRight: lineNumBorder,
            }}
          >
            {lineNumbers}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="code-textarea"
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          onScroll={handleTextareaScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          style={{ fontSize: `${fontSize}px` }}
        />
        <pre
          ref={highlightRef}
          className="highlight-pre"
          onScroll={handleHighlightScroll}
          style={{ fontSize: `${fontSize}px` }}
          aria-hidden="true"
        >
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        </pre>
      </div>

      <div className="toolbar">
        <div className="toolbar-group">
          <span className="toolbar-label">行号</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => onShowLineNumbersChange(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">字号</span>
          <input
            type="range"
            min={12}
            max={20}
            step={2}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
          />
          <span className="toolbar-value">{fontSize}px</span>
        </div>

        <div className="toolbar-group">
          <span className="toolbar-label">圆角</span>
          <input
            type="range"
            min={8}
            max={32}
            step={4}
            value={borderRadius}
            onChange={(e) => onBorderRadiusChange(Number(e.target.value))}
          />
          <span className="toolbar-value">{borderRadius}px</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
