import React, { useState, useEffect, useRef, useCallback } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';

interface EditorPanelProps {
  htmlValue: string;
  cssValue: string;
  onHtmlChange: (value: string) => void;
  onCssChange: (value: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  exampleOptions: Array<{ name: string; description: string }>;
  onLoadExample: (index: number) => void;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  htmlValue,
  cssValue,
  onHtmlChange,
  onCssChange,
  onAnalyze,
  isAnalyzing,
  exampleOptions,
  onLoadExample
}) => {
  const [leftWidth, setLeftWidth] = useState(50);
  const [selectedExample, setSelectedExample] = useState('');
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const htmlEditorRef = useRef<HTMLDivElement>(null);
  const cssEditorRef = useRef<HTMLDivElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const cssTextareaRef = useRef<HTMLTextAreaElement>(null);

  const highlightCode = useCallback(() => {
    if (htmlEditorRef.current) {
      htmlEditorRef.current.innerHTML = Prism.highlight(
        htmlValue || ' ',
        Prism.languages.markup,
        'markup'
      );
    }
    if (cssEditorRef.current) {
      cssEditorRef.current.innerHTML = Prism.highlight(
        cssValue || ' ',
        Prism.languages.css,
        'css'
      );
    }
  }, [htmlValue, cssValue]);

  useEffect(() => {
    highlightCode();
  }, [highlightCode]);

  const handleMouseDown = () => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100;
    if (newWidth >= 20 && newWidth <= 80) {
      setLeftWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleScrollSync = (source: 'html' | 'css') => {
    const src = source === 'html' ? htmlTextareaRef.current : cssTextareaRef.current;
    const dst = source === 'html' ? htmlEditorRef.current : cssEditorRef.current;
    if (src && dst) {
      dst.scrollTop = src.scrollTop;
      dst.scrollLeft = src.scrollLeft;
    }
  };

  const handlePaste = (e: React.ClipboardEvent, type: 'html' | 'css') => {
    const text = e.clipboardData.getData('text');
    if (type === 'html') {
      onHtmlChange(text);
    } else {
      onCssChange(text);
    }
    e.preventDefault();
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>, type: 'html' | 'css') => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = type === 'html' ? htmlValue : cssValue;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      if (type === 'html') {
        onHtmlChange(newValue);
      } else {
        onCssChange(newValue);
      }
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleExampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx) && idx >= 0) {
      onLoadExample(idx);
      setSelectedExample(e.target.value);
    }
  };

  return (
    <div className="editor-panel">
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <span className="toolbar-title">📝 代码编辑器</span>
          <select
            className="example-select"
            value={selectedExample}
            onChange={handleExampleChange}
          >
            <option value="">📦 加载示例...</option>
            {exampleOptions.map((opt, idx) => (
              <option key={idx} value={idx}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
        <button
          className="analyze-button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <span className="spinner"></span>
              检测中...
            </>
          ) : (
            <>🔍 检测冲突</>
          )}
        </button>
      </div>

      <div className="editor-container" ref={containerRef}>
        <div
          className="editor-column"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="editor-header html-header">
            <span className="editor-icon">🌐</span>
            <span>HTML</span>
          </div>
          <div className="code-editor-wrapper">
            <div
              className="code-highlight"
              ref={htmlEditorRef}
              aria-hidden="true"
            />
            <textarea
              ref={htmlTextareaRef}
              className="code-textarea"
              value={htmlValue}
              onChange={(e) => onHtmlChange(e.target.value)}
              onScroll={() => handleScrollSync('html')}
              onPaste={(e) => handlePaste(e, 'html')}
              onKeyDown={(e) => handleTabKey(e, 'html')}
              spellCheck={false}
              placeholder="在此输入 HTML 代码..."
            />
          </div>
        </div>

        <div
          className="editor-divider"
          onMouseDown={handleMouseDown}
          title="拖拽调整宽度"
        >
          <div className="divider-handle" />
        </div>

        <div
          className="editor-column"
          style={{ width: `${100 - leftWidth}%` }}
        >
          <div className="editor-header css-header">
            <span className="editor-icon">🎨</span>
            <span>CSS</span>
          </div>
          <div className="code-editor-wrapper">
            <div
              className="code-highlight"
              ref={cssEditorRef}
              aria-hidden="true"
            />
            <textarea
              ref={cssTextareaRef}
              className="code-textarea"
              value={cssValue}
              onChange={(e) => onCssChange(e.target.value)}
              onScroll={() => handleScrollSync('css')}
              onPaste={(e) => handlePaste(e, 'css')}
              onKeyDown={(e) => handleTabKey(e, 'css')}
              spellCheck={false}
              placeholder="在此输入 CSS 代码..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPanel;
