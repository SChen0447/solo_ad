import { useEffect, useRef, useMemo } from 'react';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import { Language } from '../utils/CodeParser';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);

interface EditorPanelProps {
  code: string;
  language: Language;
  onChange: (code: string) => void;
  currentLine: number;
  scrollToLine: number | null;
}

export default function EditorPanel({
  code,
  language,
  onChange,
  currentLine,
  scrollToLine
}: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => code.split('\n'), [code]);
  const lineCount = lines.length;

  const highlightedCode = useMemo(() => {
    try {
      const result = hljs.highlight(code || ' ', { language, ignoreIllegals: true });
      return result.value;
    } catch {
      return code;
    }
  }, [code, language]);

  useEffect(() => {
    if (scrollToLine !== null && textareaRef.current) {
      const lineHeight = 20;
      const targetScrollTop = (scrollToLine - 1) * lineHeight - 50;
      containerRef.current?.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    }
  }, [scrollToLine]);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      if (preRef.current) {
        preRef.current.scrollTop = scrollTop;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
      if (textareaRef.current) {
        textareaRef.current.scrollTop = scrollTop;
      }
    }
  };

  const getCurrentLineNumber = () => {
    if (!textareaRef.current) return 1;
    const pos = textareaRef.current.selectionStart;
    return code.substring(0, pos).split('\n').length;
  };

  const handleKeyUp = () => {
    const line = getCurrentLineNumber();
    if (line !== currentLine) {
      // This is handled in parent
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="editor-panel">
      <div className="editor-container" ref={containerRef} onScroll={handleScroll}>
        <div className="line-numbers" ref={lineNumbersRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={`line-number ${i + 1 === currentLine ? 'active' : ''}`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="code-area">
          <pre
            className="code-highlight"
            ref={preRef}
            aria-hidden="true"
          >
            <code
              className={`hljs language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
            />
          </pre>
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={code}
            onChange={handleInput}
            onKeyUp={handleKeyUp}
            onClick={handleKeyUp}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            translate="no"
            placeholder="在此粘贴或输入代码..."
          />
          {currentLine > 0 && currentLine <= lineCount && (
            <div
              className="current-line-highlight"
              style={{
                transform: `translateY(${(currentLine - 1) * 20}px)`
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
