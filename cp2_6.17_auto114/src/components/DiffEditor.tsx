import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import hljs from 'highlight.js';
import { DiffLine, DiffOperation } from '../utils/diffEngine';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  label: string;
  onScroll: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  externalScroll: number | null;
}

function CodeEditor({ code, onChange, language, label, onScroll, externalScroll }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [currentLine, setCurrentLine] = useState(1);

  const lines = code.split('\n');
  const lineCount = lines.length;

  const highlightedCode = useMemo(() => {
    if (!code) return '';
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return hljs.highlightAuto(code).value;
    }
  }, [code, language]);

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
    if (backdropRef.current) backdropRef.current.scrollTop = ta.scrollTop;
    onScroll(ta.scrollTop, ta.scrollHeight, ta.clientHeight);
  }, [onScroll]);

  useEffect(() => {
    if (externalScroll === null) return;
    const ta = textareaRef.current;
    if (!ta) return;
    ta.scrollTop = externalScroll;
    if (gutterRef.current) gutterRef.current.scrollTop = externalScroll;
    if (backdropRef.current) backdropRef.current.scrollTop = externalScroll;
  }, [externalScroll]);

  const updateCursorLine = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const line = code.substring(0, pos).split('\n').length;
    setCurrentLine(line);
  }, [code]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        if (ta) {
          ta.selectionStart = ta.selectionEnd = start + 2;
        }
      });
    }
  }, [code, onChange]);

  return (
    <div className="editor-panel">
      <div className="editor-label">{label}</div>
      <div className="editor-body">
        <div className="line-gutter" ref={gutterRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className={`line-num${i + 1 === currentLine ? ' active' : ''}`}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className="code-area">
          <div className="code-backdrop" ref={backdropRef}>
            <pre className="highlighted-pre">
              <code dangerouslySetInnerHTML={{ __html: highlightedCode ? highlightedCode + '\n' : '\n' }} />
            </pre>
          </div>
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={code}
            onChange={e => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyUp={updateCursorLine}
            onClick={updateCursorLine}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>
    </div>
  );
}

interface DiffPanelProps {
  diffResult: DiffLine[];
  viewMode: 'side-by-side' | 'unified';
  onScroll: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  externalScroll: number | null;
}

function DiffPanel({ diffResult, viewMode, onScroll, externalScroll }: DiffPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalScroll === null) return;
    const el = scrollRef.current;
    if (!el) return;
    const ratio = el.scrollHeight > el.clientHeight
      ? externalScroll.ratio
      : 0;
    el.scrollTop = ratio * (el.scrollHeight - el.clientHeight);
  }, [externalScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    onScroll(el.scrollTop, el.scrollHeight, el.clientHeight);
  }, [onScroll]);

  const opClass = (op: DiffOperation) => {
    switch (op) {
      case 'added': return 'diff-added';
      case 'removed': return 'diff-removed';
      case 'modified': return 'diff-modified';
      default: return 'diff-unchanged';
    }
  };

  const opSymbol = (op: DiffOperation) => {
    switch (op) {
      case 'added': return '+';
      case 'removed': return '-';
      case 'modified': return '~';
      default: return ' ';
    }
  };

  if (viewMode === 'unified') {
    return (
      <div className="diff-panel diff-unified" ref={scrollRef} onScroll={handleScroll}>
        {diffResult.length === 0 && (
          <div className="diff-empty">输入代码后自动显示差异</div>
        )}
        {diffResult.map((line, i) => (
          <div key={i} className={`diff-line ${opClass(line.operation)}`}>
            <span className="diff-line-num old-num">{line.oldLineNumber ?? ''}</span>
            <span className="diff-line-num new-num">{line.newLineNumber ?? ''}</span>
            <span className="diff-symbol">{opSymbol(line.operation)}</span>
            <span className="diff-text">{line.text}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="diff-panel diff-side-by-side" ref={scrollRef} onScroll={handleScroll}>
      {diffResult.length === 0 && (
        <div className="diff-empty">输入代码后自动显示差异</div>
      )}
      {diffResult.map((line, i) => (
        <div key={i} className={`diff-line ${opClass(line.operation)}`}>
          <div className="diff-line-nums">
            <span className="diff-line-num old-num">{line.oldLineNumber ?? ''}</span>
            <span className="diff-line-num new-num">{line.newLineNumber ?? ''}</span>
          </div>
          <span className="diff-symbol">{opSymbol(line.operation)}</span>
          <span className="diff-text">{line.text}</span>
        </div>
      ))}
    </div>
  );
}

interface DiffEditorProps {
  originalCode: string;
  modifiedCode: string;
  onOriginalChange: (value: string) => void;
  onModifiedChange: (value: string) => void;
  diffResult: DiffLine[];
  viewMode: 'side-by-side' | 'unified';
  language: string;
}

export default function DiffEditor({
  originalCode,
  modifiedCode,
  onOriginalChange,
  onModifiedChange,
  diffResult,
  viewMode,
  language,
}: DiffEditorProps) {
  const [leftScroll, setLeftScroll] = useState<number | null>(null);
  const [rightScroll, setRightScroll] = useState<number | null>(null);
  const [diffScroll, setDiffScroll] = useState<{ ratio: number } | null>(null);
  const scrollingSource = useRef<string>('');

  const handleLeftScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (scrollingSource.current) return;
    scrollingSource.current = 'left';
    const ratio = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
    setRightScroll(scrollTop);
    setDiffScroll({ ratio });
    requestAnimationFrame(() => { scrollingSource.current = ''; });
  }, []);

  const handleRightScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (scrollingSource.current) return;
    scrollingSource.current = 'right';
    const ratio = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
    setLeftScroll(scrollTop);
    setDiffScroll({ ratio });
    requestAnimationFrame(() => { scrollingSource.current = ''; });
  }, []);

  const handleDiffScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (scrollingSource.current) return;
    scrollingSource.current = 'diff';
    const ratio = scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
    setLeftScroll(null);
    setRightScroll(null);
    setDiffScroll({ ratio });
    requestAnimationFrame(() => { scrollingSource.current = ''; });
  }, []);

  useEffect(() => {
    setLeftScroll(null);
    setRightScroll(null);
    setDiffScroll(null);
  }, [originalCode, modifiedCode]);

  return (
    <div className={`diff-editor ${viewMode === 'unified' ? 'unified-view' : 'side-by-side-view'}`}>
      <CodeEditor
        code={originalCode}
        onChange={onOriginalChange}
        language={language}
        label="原始代码"
        onScroll={handleLeftScroll}
        externalScroll={leftScroll}
      />
      <DiffPanel
        diffResult={diffResult}
        viewMode={viewMode}
        onScroll={handleDiffScroll}
        externalScroll={diffScroll}
      />
      <CodeEditor
        code={modifiedCode}
        onChange={onModifiedChange}
        language={language}
        label="新代码"
        onScroll={handleRightScroll}
        externalScroll={rightScroll}
      />
    </div>
  );
}
