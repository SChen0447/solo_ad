import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import hljs from 'highlight.js';
import { DiffLine, DiffOperation, CharSegment } from '../utils/diffEngine';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  language: string;
  label: string;
  onScroll: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  externalScroll: number | null;
  id?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function CodeEditor({ code, onChange, language, label, onScroll, externalScroll, id }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [currentLine, setCurrentLine] = useState(1);

  const lines = useMemo(() => code.split('\n'), [code]);
  const lineCount = lines.length;

  const highlightedHtml = useMemo(() => {
    if (!code) return '';
    let result: string;
    try {
      result = hljs.highlight(code, { language }).value;
    } catch {
      try {
        result = hljs.highlightAuto(code).value;
      } catch {
        result = escapeHtml(code);
      }
    }
    return result + '\n';
  }, [code, language]);

  const handleScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const scrollTop = ta.scrollTop;
    if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
    if (backdropRef.current) backdropRef.current.scrollTop = scrollTop;
    onScroll(scrollTop, ta.scrollHeight, ta.clientHeight);
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
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  }, [code, onChange]);

  return (
    <div className="editor-panel" id={id}>
      <div className="editor-label">{label}</div>
      <div className="editor-container">
        <div className="line-gutter" ref={gutterRef}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className={`line-num${i + 1 === currentLine ? ' line-num-active' : ''}`}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div className="code-area">
          <div className="code-backdrop" ref={backdropRef}>
            <pre className="highlighted-pre" aria-hidden="true">
              <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
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
            onSelect={updateCursorLine}
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
  externalScroll: { ratio: number } | null;
}

function renderCharSegments(segments: CharSegment[]): React.ReactNode {
  return segments.map((seg, idx) => {
    let cls = 'char-unchanged';
    if (seg.operation === 'added') cls = 'char-added';
    else if (seg.operation === 'removed') cls = 'char-removed';
    return (
      <span key={idx} className={cls}>
        {seg.text.length > 0 ? seg.text : '\u200b'}
      </span>
    );
  });
}

function DiffPanel({ diffResult, viewMode, onScroll, externalScroll }: DiffPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalScroll === null) return;
    const el = scrollRef.current;
    if (!el) return;
    const diff = el.scrollHeight - el.clientHeight;
    el.scrollTop = diff > 0 ? externalScroll.ratio * diff : 0;
  }, [externalScroll]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    onScroll(el.scrollTop, el.scrollHeight, el.clientHeight);
  }, [onScroll]);

  const opRowClass = (op: DiffOperation): string => {
    switch (op) {
      case 'added': return 'diff-row-added';
      case 'removed': return 'diff-row-removed';
      case 'modified': return 'diff-row-modified';
      default: return 'diff-row-unchanged';
    }
  };

  const opSymbol = (op: DiffOperation): string => {
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
        {diffResult.length === 0 ? (
          <div className="diff-empty">输入代码后自动显示差异</div>
        ) : (
          diffResult.map((line, i) => (
            <div key={i} className={`diff-line-row ${opRowClass(line.operation)}`}>
              <span className="diff-line-num old-num">{line.oldLineNumber ?? ''}</span>
              <span className="diff-line-num new-num">{line.newLineNumber ?? ''}</span>
              <span className="diff-symbol">{opSymbol(line.operation)}</span>
              <span className="diff-text-wrap">{renderCharSegments(line.charDiff)}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="diff-panel diff-side-by-side" ref={scrollRef} onScroll={handleScroll}>
      {diffResult.length === 0 ? (
        <div className="diff-empty">输入代码后自动显示差异</div>
      ) : (
        diffResult.map((line, i) => (
          <div key={i} className={`diff-line-row ${opRowClass(line.operation)}`}>
            <span className="diff-line-num old-num">{line.oldLineNumber ?? ''}</span>
            <span className="diff-line-num new-num">{line.newLineNumber ?? ''}</span>
            <span className="diff-symbol">{opSymbol(line.operation)}</span>
            <span className="diff-text-wrap">{renderCharSegments(line.charDiff)}</span>
          </div>
        ))
      )}
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
  const originalLines = useMemo(() => originalCode.split('\n').length, [originalCode]);
  const modifiedLines = useMemo(() => modifiedCode.split('\n').length, [modifiedCode]);

  const handleLeftScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (scrollingSource.current !== '') return;
    scrollingSource.current = 'left';
    const maxScroll = scrollHeight - clientHeight;
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
    setLeftScroll(scrollTop);
    setRightScroll(scrollTop);
    setDiffScroll({ ratio });
    requestAnimationFrame(() => { scrollingSource.current = ''; });
  }, []);

  const handleRightScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (scrollingSource.current !== '') return;
    scrollingSource.current = 'right';
    const maxScroll = scrollHeight - clientHeight;
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
    setLeftScroll(scrollTop);
    setRightScroll(scrollTop);
    setDiffScroll({ ratio });
    requestAnimationFrame(() => { scrollingSource.current = ''; });
  }, []);

  const handleDiffScroll = useCallback((scrollTop: number, scrollHeight: number, clientHeight: number) => {
    if (scrollingSource.current !== '') return;
    scrollingSource.current = 'diff';
    const maxScroll = scrollHeight - clientHeight;
    const ratio = maxScroll > 0 ? scrollTop / maxScroll : 0;
    setDiffScroll({ ratio });
    setLeftScroll(ratio * (originalLines * 24));
    setRightScroll(ratio * (modifiedLines * 24));
    requestAnimationFrame(() => { scrollingSource.current = ''; });
  }, [originalLines, modifiedLines]);

  useEffect(() => {
    setLeftScroll(null);
    setRightScroll(null);
    setDiffScroll(null);
  }, [originalCode, modifiedCode, viewMode]);

  return (
    <div className={`diff-editor-wrapper ${viewMode}`}>
      <CodeEditor
        code={originalCode}
        onChange={onOriginalChange}
        language={language}
        label="原始代码"
        onScroll={handleLeftScroll}
        externalScroll={leftScroll}
        id="editor-original"
      />
      <div className={`diff-container ${viewMode}`}>
        <DiffPanel
          diffResult={diffResult}
          viewMode={viewMode}
          onScroll={handleDiffScroll}
          externalScroll={diffScroll}
        />
      </div>
      <CodeEditor
        code={modifiedCode}
        onChange={onModifiedChange}
        language={language}
        label="新代码"
        onScroll={handleRightScroll}
        externalScroll={rightScroll}
        id="editor-modified"
      />
    </div>
  );
}
