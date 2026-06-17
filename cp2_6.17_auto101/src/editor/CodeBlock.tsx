import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState, StateEffect, Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { Language, CodeBlockData } from '../types';
import { SandboxService } from '../sandbox/SandboxService';
import './CodeBlock.css';

interface CodeBlockProps {
  block: CodeBlockData;
  onUpdate: (updates: Partial<CodeBlockData>) => void;
  onDelete?: () => void;
}

const languageOptions: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' }
];

const getLanguageExtension = (lang: Language) => {
  switch (lang) {
    case 'javascript':
      return javascript();
    case 'python':
      return python();
    case 'html':
      return html();
    default:
      return javascript();
  }
};

const darkTheme = EditorView.theme({
  '&': {
    height: '150px',
    backgroundColor: '#1e293b',
    fontSize: '14px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace'
  },
  '.cm-scroller': {
    overflow: 'auto'
  },
  '.cm-content': {
    padding: '10px 0',
    color: '#e2e8f0',
    caretColor: '#3b82f6'
  },
  '.cm-line': {
    padding: '0 10px'
  },
  '.cm-gutters': {
    backgroundColor: '#1e293b',
    color: '#64748b',
    border: 'none',
    paddingRight: '8px'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(59, 130, 246, 0.1)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(59, 130, 246, 0.1)'
  },
  '.cm-selectionBackground': {
    backgroundColor: 'rgba(59, 130, 246, 0.3) !important'
  }
}, { dark: true });

const reconfigureEffect = StateEffect.define<Extension>();

export const CodeBlock: React.FC<CodeBlockProps> = ({ block, onUpdate, onDelete }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [language, setLanguage] = useState<Language>(block.language);
  const [output, setOutput] = useState<string>(block.output || '');
  const [error, setError] = useState<string>(block.error || '');
  const [executionTime, setExecutionTime] = useState<number | undefined>(block.executionTime);

  const handleCodeChange = useCallback((code: string) => {
    onUpdate({ code });
  }, [onUpdate]);

  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newCode = update.state.doc.toString();
        handleCodeChange(newCode);
      }
    });

    const state = EditorState.create({
      doc: block.code,
      extensions: [
        keymap.of(defaultKeymap),
        lineNumbers(),
        highlightActiveLine(),
        getLanguageExtension(language),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        darkTheme,
        updateListener
      ]
    });

    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newCode = update.state.doc.toString();
        handleCodeChange(newCode);
      }
    });

    viewRef.current.dispatch({
      effects: reconfigureEffect.of([
        keymap.of(defaultKeymap),
        lineNumbers(),
        highlightActiveLine(),
        getLanguageExtension(language),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        darkTheme,
        updateListener
      ])
    });

    onUpdate({ language });
  }, [language, handleCodeChange, onUpdate]);

  const handleRun = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setOutput('');
    setError('');
    setExecutionTime(undefined);

    try {
      const code = viewRef.current?.state.doc.toString() || block.code;
      const result = await SandboxService.runCode(code, language);

      setOutput(result.output);
      setError(result.error || '');
      setExecutionTime(result.executionTime);

      onUpdate({
        output: result.output,
        error: result.error,
        executionTime: result.executionTime
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '运行失败';
      setError(errorMessage);
      onUpdate({ error: errorMessage });
    } finally {
      setIsRunning(false);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language);
  };

  return (
    <div className="code-block-card">
      <div className="code-block-header">
        <div className="code-block-header-left">
          <select
            className="language-select"
            value={language}
            onChange={handleLanguageChange}
          >
            {languageOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="code-block-header-right">
          {executionTime !== undefined && (
            <span className="execution-time">{executionTime}ms</span>
          )}
          <button
            className={`run-button ${isRunning ? 'loading' : ''}`}
            onClick={handleRun}
            disabled={isRunning}
            title="运行代码"
          >
            {isRunning ? (
              <span className="spinner"></span>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            {isRunning ? '运行中...' : '运行'}
          </button>
          {onDelete && (
            <button
              className="delete-button"
              onClick={onDelete}
              title="删除代码块"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div ref={editorRef} className="codemirror-container" />
      {(output || error) && (
        <div className={`output-area ${error ? 'has-error' : ''}`}>
          <pre>
            {error ? (
              <span className="error-text">{error}</span>
            ) : (
              <span>{output}</span>
            )}
          </pre>
        </div>
      )}
    </div>
  );
};
