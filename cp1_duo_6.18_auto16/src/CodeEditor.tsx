import { useRef, useEffect, useState, useCallback } from 'react';
import hljs from 'highlight.js';
import { useCodeReviewStore, type Language } from './store';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
];

export function CodeEditor() {
  const snippet = useCodeReviewStore((state) => state.getCurrentSnippet());
  const updateCurrentSnippet = useCodeReviewStore((state) => state.updateCurrentSnippet);
  const setView = useCodeReviewStore((state) => state.setView);
  const createSnippet = useCodeReviewStore((state) => state.createSnippet);

  const [code, setCode] = useState(snippet?.code || '');
  const [language, setLanguage] = useState<Language>(snippet?.language || 'javascript');
  const [highlightedHtml, setHighlightedHtml] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const updateHighlight = useCallback((codeValue: string, langValue: Language) => {
    try {
      const result = hljs.highlight(codeValue || ' ', { language: langValue });
      setHighlightedHtml(result.value);
    } catch (e) {
      setHighlightedHtml(codeValue || ' ');
    }
  }, []);

  useEffect(() => {
    if (snippet) {
      setCode(snippet.code);
      setLanguage(snippet.language);
      updateHighlight(snippet.code, snippet.language);
    }
  }, [snippet, updateHighlight]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    updateHighlight(newCode, language);
    updateCurrentSnippet(newCode, language);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as Language;
    setLanguage(newLang);
    updateHighlight(code, newLang);
    updateCurrentSnippet(code, newLang);
  };

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handlePreview = () => {
    if (snippet?.id) {
      setView('preview');
    } else {
      const id = createSnippet(code, language);
      if (id) setView('preview');
    }
  };

  const lineCount = code.split('\n').length;
  const minHeight = Math.max(400, lineCount * 20.8 + 32);

  return (
    <div className="code-editor-container">
      <div className="editor-header">
        <select
          className="language-select"
          value={language}
          onChange={handleLanguageChange}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <button
          className="button button-crystal"
          onClick={handlePreview}
        >
          预览
        </button>
      </div>
      <div
        className="code-wrapper"
        style={{ minHeight: `${minHeight}px` }}
      >
        <div className="highlight-layer" ref={highlightRef}>
          <pre>
            <code
              className={`hljs language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml || ' ' }}
            />
          </pre>
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
