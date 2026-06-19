import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import hljs from 'highlight.js';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
];

const LANG_COLORS: Record<string, string> = {
  javascript: '#f7df1e',
  python: '#3776ab',
  html: '#e34c26',
  css: '#264de4',
  typescript: '#3178c6',
  java: '#b07219',
  cpp: '#f34b7d',
  go: '#00add8',
  rust: '#dea584',
  sql: '#e38c00',
};

interface EditorProps {
  code: string;
  language: string;
  onCodeChange: (code: string) => void;
  onLanguageChange: (lang: string) => void;
  readOnly?: boolean;
}

const editorContainerStyle: React.CSSProperties = {
  position: 'relative',
  borderRadius: '12px',
  overflow: 'hidden',
  background: '#1e1e2e',
  border: '1px solid #3a3a5c',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  background: '#252540',
  borderBottom: '1px solid #3a3a5c',
};

const selectStyle: React.CSSProperties = {
  background: '#2a2a3e',
  color: '#cba6f7',
  border: '1px solid #45475a',
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '13px',
  fontFamily: 'inherit',
  cursor: 'pointer',
  outline: 'none',
  transition: 'border-color 0.3s ease',
};

const codeAreaWrapperStyle: React.CSSProperties = {
  display: 'flex',
  maxHeight: '500px',
  overflow: 'auto',
  position: 'relative',
};

const lineNumbersStyle: React.CSSProperties = {
  padding: '16px 0',
  paddingRight: '12px',
  paddingLeft: '16px',
  textAlign: 'right',
  color: '#585b70',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '13px',
  lineHeight: '1.6',
  userSelect: 'none',
  borderRight: '1px solid #3a3a5c',
  minWidth: '48px',
  flexShrink: 0,
  background: '#1e1e2e',
};

const codeContentStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  overflow: 'hidden',
};

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: '16px',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '13px',
  lineHeight: '1.6',
  overflow: 'visible',
  background: 'transparent',
  color: '#cdd6f4',
  whiteSpace: 'pre',
  tabSize: 2,
};

const textareaStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  padding: '16px',
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: '13px',
  lineHeight: '1.6',
  background: 'transparent',
  color: 'transparent',
  caretColor: '#cba6f7',
  border: 'none',
  outline: 'none',
  resize: 'none',
  whiteSpace: 'pre',
  tabSize: 2,
  overflow: 'auto',
  zIndex: 1,
};

export default function Editor({ code, language, onCodeChange, onLanguageChange, readOnly }: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fadeKey, setFadeKey] = useState(0);
  const [fadeAnim, setFadeAnim] = useState(false);

  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return hljs.highlightAuto(code).value;
    }
  }, [code, language]);

  const lines = useMemo(() => code.split('\n').length, [code]);

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLang = e.target.value;
      onLanguageChange(newLang);
      setFadeKey((k) => k + 1);
      setFadeAnim(true);
      setTimeout(() => setFadeAnim(false), 300);
    },
    [onLanguageChange]
  );

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current && lineNumRef.current) {
      const scrollTop = textareaRef.current.scrollTop;
      const scrollLeft = textareaRef.current.scrollLeft;
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
      lineNumRef.current.scrollTop = scrollTop;
    }
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.addEventListener('scroll', handleScroll);
      return () => ta.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const lineNumbers = Array.from({ length: lines }, (_, i) => i + 1);

  return (
    <div style={editorContainerStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: LANG_COLORS[language] || '#cba6f7', display: 'inline-block' }} />
          <span style={{ color: '#a6adc8', fontSize: '13px' }}>{LANGUAGES.find((l) => l.value === language)?.label || language}</span>
        </div>
        {!readOnly && (
          <select value={language} onChange={handleLanguageChange} style={selectStyle}>
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div ref={wrapperRef} style={codeAreaWrapperStyle}>
        <div ref={lineNumRef} style={lineNumbersStyle}>
          {lineNumbers.map((n) => (
            <div key={n}>{n}</div>
          ))}
        </div>
        <div style={codeContentStyle}>
          <pre ref={preRef} style={preStyle}>
            <code
              key={fadeKey}
              className={`hljs language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlighted }}
              style={{
                opacity: fadeAnim ? 0 : 1,
                transition: 'opacity 0.3s ease',
                background: 'transparent',
                padding: 0,
              }}
            />
          </pre>
          {!readOnly && (
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              spellCheck={false}
              style={textareaStyle}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { LANGUAGES, LANG_COLORS };
