import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter, foldKeymap, syntaxTree } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import type { FunctionMeta, RunResult } from './types';

interface TestPreviewProps {
  testCode: string;
  functions: FunctionMeta[];
  onTestCodeChange: (code: string) => void;
}

const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  '.cm-content': {
    caretColor: '#007ACC',
    padding: '8px 0',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
  },
  '.cm-gutters': {
    backgroundColor: '#F7F7F7',
    color: '#999999',
    border: 'none',
    borderRight: '1px solid #E0E0E0',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#EFEFEF',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(200, 220, 255, 0.15)',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#ADD6FF !important',
  },
  '.cm-diagnostic-error': {
    borderBottom: '2px solid #f44336',
  },
}, { dark: false });

function TestPreview({ testCode, functions, onTestCodeChange }: TestPreviewProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const displayedCodeRef = useRef<string>('');
  const typingTimerRef = useRef<number | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [syntaxErrors, setSyntaxErrors] = useState<number>(0);

  const applyCodeToEditor = useCallback((code: string) => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      changes: { from: 0, to: viewRef.current.state.doc.length, insert: code },
    });
    displayedCodeRef.current = code;
    onTestCodeChange(code);

    try {
      const tree = syntaxTree(viewRef.current.state);
      let errors = 0;
      tree.iterate({
        enter: (node) => {
          if (node.type.isError) errors++;
        },
      });
      setSyntaxErrors(errors);
    } catch {
      setSyntaxErrors(0);
    }
  }, [onTestCodeChange]);

  const startTypewriterEffect = useCallback((fullCode: string) => {
    if (typingTimerRef.current) {
      window.clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }

    displayedCodeRef.current = '';
    applyCodeToEditor('');

    if (!fullCode) {
      return;
    }

    let index = 0;
    const speed = Math.max(2, Math.floor(1200 / Math.max(fullCode.length, 1)));

    typingTimerRef.current = window.setInterval(() => {
      if (index >= fullCode.length) {
        if (typingTimerRef.current) {
          window.clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        return;
      }
      const nextChunkSize = Math.min(3, fullCode.length - index);
      const nextChunk = fullCode.slice(0, index + nextChunkSize);
      index += nextChunkSize;
      displayedCodeRef.current = nextChunk;
      applyCodeToEditor(nextChunk);
    }, speed);
  }, [applyCodeToEditor]);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = EditorState.create({
      doc: '',
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        foldGutter(),
        history(),
        indentOnInput(),
        bracketMatching(),
        javascript({ typescript: true, jsx: false }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap]),
        lightTheme,
        EditorView.updateListener.of((v) => {
          if (v.docChanged) {
            const newCode = v.state.doc.toString();
            if (newCode !== displayedCodeRef.current) {
              displayedCodeRef.current = newCode;
              onTestCodeChange(newCode);
            }
            try {
              const tree = syntaxTree(v.state);
              let errors = 0;
              tree.iterate({
                enter: (node) => {
                  if (node.type.isError) errors++;
                },
              });
              setSyntaxErrors(errors);
            } catch {
              setSyntaxErrors(0);
            }
          }
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
      }
    };
  }, [onTestCodeChange]);

  useEffect(() => {
    if (testCode !== displayedCodeRef.current) {
      startTypewriterEffect(testCode);
    }
  }, [testCode, startTypewriterEffect]);

  const handleRun = useCallback(async () => {
    if (!displayedCodeRef.current.trim()) {
      alert('请先生成测试代码');
      return;
    }

    setIsRunning(true);
    setRunResult(null);

    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

    const totalTests = functions.length > 0 ? functions.length * 2 : Math.max(1, Math.floor(Math.random() * 5) + 2);
    const passedTests = syntaxErrors === 0 ? totalTests : Math.max(0, totalTests - Math.ceil(Math.random() * 2));
    const failedTests = totalTests - passedTests;

    setRunResult({
      passed: failedTests === 0,
      duration: Math.floor(100 + Math.random() * 400),
      totalTests,
      passedTests,
      failedTests,
    });
    setIsRunning(false);
  }, [functions, syntaxErrors]);

  return (
    <div className="right-panel">
      <div className="panel-title">
        🧪 测试代码预览区
        {syntaxErrors > 0 && <span style={{ color: '#f44336', marginLeft: 12, fontSize: 12 }}>⚠️ 检测到 {syntaxErrors} 处语法错误</span>}
      </div>
      <div className="editor-wrapper" ref={editorRef} style={{ height: '100%', minHeight: 0 }} />

      <div className="button-group">
        <button className="btn-primary" onClick={handleRun} disabled={isRunning || !testCode}>
          {isRunning && <span className="spinner" />}
          {isRunning ? '运行中...' : '▶ 运行测试 (模拟)'}
        </button>
      </div>

      {(isRunning || runResult) && (
        <div className={`run-status ${isRunning ? 'loading' : runResult?.passed ? 'pass' : 'fail'}`}>
          <div className="status-icon">
            {isRunning ? '⏳' : runResult?.passed ? '✓' : '✕'}
          </div>
          <div>
            {isRunning ? (
              <span>正在模拟运行测试...</span>
            ) : (
              <span>
                <strong>{runResult?.passed ? '全部通过!' : `有 ${runResult?.failedTests} 个测试失败`}</strong>
                {' · '}共 {runResult?.totalTests} 个用例，通过 {runResult?.passedTests}，失败 {runResult?.failedTests}
                {' · '}耗时 {runResult?.duration}ms
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TestPreview;
