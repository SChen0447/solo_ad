import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { Problem } from '../types';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  isRunning: boolean;
  currentProblem?: Problem;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, onRun, onSubmit, isRunning, currentProblem }) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  return (
    <div style={styles.container}>
      <div style={styles.toolbar} className="toolbar">
        <div style={styles.toolbarLeft}>
          <span style={styles.filename}>📄 main.py</span>
          <span style={styles.lineCount}>{code.split('\n').length} / 300 行</span>
        </div>
        <div style={styles.toolbarRight}>
          <button onClick={onRun} disabled={isRunning} className="btn-primary" style={styles.runBtn}>
            ▶ 运行
          </button>
          <button onClick={onSubmit} disabled={isRunning} className="btn-secondary" style={styles.submitBtn}>
            ✓ 提交评测
          </button>
        </div>
      </div>

      <div style={styles.editorWrapper}>
        {isRunning && <div className="loading-ring" />}
        <Editor
          height="100%"
          defaultLanguage="python"
          language="python"
          value={code}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontFamily: "'Fira Code', monospace",
            fontSize: 14,
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            automaticLayout: true,
            tabSize: 4,
            indentSize: 4,
            detectIndentation: false,
            autoIndent: 'advanced',
            formatOnPaste: true,
            formatOnType: true,
            matchBrackets: 'always',
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            acceptSuggestionOnEnter: 'smart',
            parameterHints: { enabled: true },
            backgroundColor: '#1a1a2e',
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    position: 'relative',
    minHeight: 0,
  },
  toolbar: {
    height: '48px',
    padding: '0 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--bg-card)',
    borderBottom: '1px solid var(--accent)',
    flexShrink: 0,
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  toolbarRight: {
    display: 'flex',
    gap: '12px',
  },
  filename: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  lineCount: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  runBtn: {
    padding: '8px 20px',
  },
  submitBtn: {
    padding: '8px 20px',
  },
  editorWrapper: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
  },
};

export default CodeEditor;
