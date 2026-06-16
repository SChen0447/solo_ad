import { useEffect, useRef, useState, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';
import 'prismjs/themes/prism-tomorrow.css';
import { Snippet } from '../utils/markdownExporter';

interface CodeEditorProps {
  code: string;
  onCodeChange: (code: string) => void;
  onSelectionCapture: (snippet: Omit<Snippet, 'id' | 'timestamp'>) => void;
  highlightLine: number | null;
  snippets: Snippet[];
  language: string;
}

interface SelectionInfo {
  start: number;
  end: number;
  startLine: number;
  endLine: number;
}

export default function CodeEditor({
  code,
  onCodeChange,
  onSelectionCapture,
  highlightLine,
  snippets,
  language
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlightedCode, setHighlightedCode] = useState('');
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const lines = code.split('\n');
  const lineCount = lines.length;

  const getPrismLang = useCallback((lang: string): string => {
    const map: Record<string, string> = {
      javascript: 'javascript',
      typescript: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      python: 'python',
      css: 'css',
      html: 'markup',
      xml: 'markup',
      json: 'json',
      bash: 'bash',
      sh: 'bash',
      sql: 'sql'
    };
    return map[lang.toLowerCase()] || 'javascript';
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const prismLang = getPrismLang(language);
      const grammar = Prism.languages[prismLang] || Prism.languages.javascript;
      const highlighted = Prism.highlight(code || '', grammar, prismLang);
      setHighlightedCode(highlighted);
    }, 10);

    return () => clearTimeout(timer);
  }, [code, language, getPrismLang]);

  useEffect(() => {
    if (highlightLine !== null && textareaRef.current) {
      const lineHeight = 20;
      const scrollTop = (highlightLine - 5) * lineHeight;
      containerRef.current?.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
    }
  }, [highlightLine]);

  const getLineFromPos = (pos: number): number => {
    const before = code.slice(0, pos);
    return before.split('\n').length;
  };

  const handleSelect = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      setSelection(null);
      return;
    }

    const startLine = getLineFromPos(start);
    const endLine = getLineFromPos(end - 1);

    setSelection({ start, end, startLine, endLine });
  };

  const handleDragStart = (e: React.DragEvent) => {
    const textarea = textareaRef.current;
    if (!textarea || !selection) {
      e.preventDefault();
      return;
    }

    setIsDragging(true);
    const selectedCode = code.slice(selection.start, selection.end);

    const data = JSON.stringify({
      code: selectedCode,
      startLine: selection.startLine,
      endLine: selection.endLine,
      language
    });

    e.dataTransfer.setData('application/json', data);
    e.dataTransfer.setData('text/plain', selectedCode);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (selection) {
      const selectedCode = code.slice(selection.start, selection.end);
      onSelectionCapture({
        code: selectedCode,
        startLine: selection.startLine,
        endLine: selection.endLine,
        language
      });
    }
    setSelection(null);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    onCodeChange(pastedText);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        onCodeChange(text);
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const getSnippetHighlightLines = () => {
    const lineMap = new Map<number, string[]>();
    snippets.forEach((snippet) => {
      for (let i = snippet.startLine; i <= snippet.endLine; i++) {
        if (!lineMap.has(i)) {
          lineMap.set(i, []);
        }
        lineMap.get(i)!.push(snippet.id);
      }
    });
    return lineMap;
  };

  const snippetLineMap = getSnippetHighlightLines();
  const selectionLineSet = new Set<number>();
  if (selection) {
    for (let i = selection.startLine; i <= selection.endLine; i++) {
      selectionLineSet.add(i);
    }
  }

  return (
    <div className="code-editor-wrapper">
      <div
        ref={containerRef}
        className="code-editor-container"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="code-editor-inner">
          <div className="line-numbers">
            {Array.from({ length: lineCount || 1 }, (_, i) => {
              const lineNum = i + 1;
              const hasSnippet = snippetLineMap.has(lineNum);
              const isSelected = selectionLineSet.has(lineNum);
              const isHighlighted = lineNum === highlightLine;
              return (
                <div
                  key={lineNum}
                  className={`line-number ${hasSnippet ? 'has-snippet' : ''} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}`}
                >
                  {lineNum}
                </div>
              );
            })}
          </div>

          <div className="code-content">
            <pre
              ref={preRef}
              className={`code-pre language-${getPrismLang(language)} ${isDragging ? 'dragging' : ''}`}
              aria-hidden="true"
            >
              <code
                ref={codeRef}
                className={`language-${getPrismLang(language)}`}
                dangerouslySetInnerHTML={{ __html: highlightedCode || '\n' }}
              />
            </pre>
            <textarea
              ref={textareaRef}
              className="code-textarea"
              value={code}
              onChange={(e) => onCodeChange(e.target.value)}
              onSelect={handleSelect}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onPaste={handlePaste}
              spellCheck={false}
              placeholder="在此粘贴代码、拖拽代码文件，或直接输入代码..."
            />
          </div>
        </div>
      </div>
      <style>{`
        .code-editor-wrapper {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
        }
        .code-editor-container {
          flex: 1;
          overflow: auto;
          background: #1e1e2e;
          border-radius: 8px;
          border: 1px solid #313244;
          min-height: 0;
        }
        .code-editor-container::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .code-editor-container::-webkit-scrollbar-track {
          background: #181825;
        }
        .code-editor-container::-webkit-scrollbar-thumb {
          background: #45475a;
          border-radius: 5px;
        }
        .code-editor-container::-webkit-scrollbar-thumb:hover {
          background: #585b70;
        }
        .code-editor-inner {
          display: flex;
          position: relative;
          min-width: 100%;
        }
        .line-numbers {
          flex-shrink: 0;
          padding: 12px 8px;
          background: #181825;
          border-right: 1px solid #313244;
          user-select: none;
          font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
          font-size: 13px;
          line-height: 20px;
          color: #6c7086;
          text-align: right;
          min-width: 50px;
        }
        .line-number {
          height: 20px;
          padding: 0 6px;
          border-radius: 3px;
          transition: background-color 0.2s ease;
        }
        .line-number.has-snippet {
          background: rgba(249, 199, 79, 0.25);
          color: #f9c74f;
        }
        .line-number.selected {
          background: rgba(249, 199, 79, 0.4);
          color: #fff;
        }
        .line-number.highlighted {
          background: #89b4fa !important;
          color: #1e1e2e !important;
          animation: pulse-highlight 1s ease;
        }
        @keyframes pulse-highlight {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .code-content {
          flex: 1;
          position: relative;
          min-width: 0;
        }
        .code-pre {
          margin: 0;
          padding: 12px 16px;
          background: transparent;
          font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
          font-size: 13px;
          line-height: 20px;
          white-space: pre;
          overflow: visible;
          word-wrap: normal;
          pointer-events: none;
          min-height: 100%;
          tab-size: 2;
          -moz-tab-size: 2;
        }
        .code-pre.dragging {
          opacity: 0.7;
        }
        .code-textarea {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 12px 16px;
          border: 0;
          background: transparent;
          color: transparent;
          caret-color: #cdd6f4;
          font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
          font-size: 13px;
          line-height: 20px;
          resize: none;
          outline: none;
          white-space: pre;
          overflow: hidden;
          overflow-wrap: normal;
          tab-size: 2;
          -moz-tab-size: 2;
          min-height: 400px;
        }
        .code-textarea::selection {
          background: rgba(249, 199, 79, 0.35);
          color: transparent;
        }
        .code-textarea::-moz-selection {
          background: rgba(249, 199, 79, 0.35);
          color: transparent;
        }
      `}</style>
    </div>
  );
}
