import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { runCode, SandboxResult } from '../sandbox/SandboxService';
import './CodeBlock.css';

interface CodeBlockProps {
  id: string;
  language: string;
  initialCode: string;
  initialOutput?: string;
  initialError?: string;
  onCodeChange?: (id: string, code: string) => void;
  onLanguageChange?: (id: string, language: string) => void;
  onRunResult?: (id: string, result: SandboxResult) => void;
}

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
];

function getLanguageExtension(language: string) {
  switch (language.toLowerCase()) {
    case 'javascript':
    case 'js':
      return javascript();
    case 'python':
    case 'py':
      return python();
    case 'html':
      return html();
    default:
      return javascript();
  }
}

export default function CodeBlock({
  id,
  language: initialLanguage,
  initialCode,
  initialOutput = '',
  initialError,
  onCodeChange,
  onLanguageChange,
  onRunResult,
}: CodeBlockProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [language, setLanguage] = useState(initialLanguage);
  const [output, setOutput] = useState(initialOutput);
  const [error, setError] = useState<string | undefined>(initialError);
  const [isRunning, setIsRunning] = useState(false);
  const codeRef = useRef(initialCode);

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: initialCode,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        getLanguageExtension(language),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString();
            codeRef.current = newCode;
            onCodeChange?.(id, newCode);
          }
        }),
        EditorView.theme({
          '&': {
            height: '150px',
            fontSize: '14px',
            fontFamily: 'monospace',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '.cm-gutters': {
            backgroundColor: '#1e293b',
            color: '#64748b',
            border: 'none',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#334155',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;

    const view = viewRef.current;
    const currentCode = view.state.doc.toString();

    view.dispatch({
      effects: [
        // We need to reconfigure with new language
        // This is a simplified approach - in production you'd use StateEffect
      ],
    });

    const newState = EditorState.create({
      doc: currentCode,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        getLanguageExtension(language),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newCode = update.state.doc.toString();
            codeRef.current = newCode;
            onCodeChange?.(id, newCode);
          }
        }),
        EditorView.theme({
          '&': {
            height: '150px',
            fontSize: '14px',
            fontFamily: 'monospace',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '.cm-gutters': {
            backgroundColor: '#1e293b',
            color: '#64748b',
            border: 'none',
          },
          '.cm-activeLineGutter': {
            backgroundColor: '#334155',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
          },
        }),
      ],
    });

    const parent = view.dom.parentNode;
    view.destroy();

    if (parent && editorRef.current) {
      const newView = new EditorView({
        state: newState,
        parent: editorRef.current,
      });
      viewRef.current = newView;
    }
  }, [language, id, onCodeChange]);

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setError(undefined);

    try {
      const result = await runCode(codeRef.current, language);
      setOutput(result.output);
      setError(result.error);
      onRunResult?.(id, result);
    } catch (err) {
      setOutput('');
      setError(err instanceof Error ? err.message : 'Failed to run code');
    } finally {
      setIsRunning(false);
    }
  }, [language, id, onRunResult]);

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newLang = e.target.value;
      setLanguage(newLang);
      onLanguageChange?.(id, newLang);
    },
    [id, onLanguageChange]
  );

  return (
    <div className="code-block-card">
      <div className="code-block-header">
        <select
          className="language-select"
          value={language}
          onChange={handleLanguageChange}
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          className={`run-button ${isRunning ? 'running' : ''}`}
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <span className="spinner"></span>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="play-icon"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          {isRunning ? '运行中...' : '运行'}
        </button>
      </div>
      <div className="code-editor-wrapper">
        <div ref={editorRef} className="codemirror-container"></div>
      </div>
      {(output || error) && (
        <div className={`output-area ${error ? 'has-error' : ''}`}>
          <pre className="output-content">
            {error ? (
              <span className="error-text">{error}</span>
            ) : (
              output
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
