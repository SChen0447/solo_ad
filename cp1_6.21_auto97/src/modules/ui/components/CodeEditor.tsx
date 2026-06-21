import React, { useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { editor } from 'monaco-editor';
import '../styles/CodeEditor.css';

interface CodeEditorProps {
  code: string;
  onChange?: (code: string) => void;
  readOnly?: boolean;
  language?: string;
  theme?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  readOnly = false,
  language = 'css',
  theme = 'vs-dark',
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount = useCallback((editorInstance: editor.IStandaloneCodeEditor) => {
    editorRef.current = editorInstance;
  }, []);

  const handleChange = useCallback((value: string | undefined) => {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  }, [onChange]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ readOnly });
    }
  }, [readOnly]);

  const customTheme = {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'c586c0', fontStyle: 'bold' },
      { token: 'number', foreground: 'b5cea8' },
      { token: 'string', foreground: 'ce9178' },
      { token: 'property', foreground: '9cdcfe' },
      { token: 'attribute', foreground: '9cdcfe' },
      { token: 'selector', foreground: 'dcdcaa' },
      { token: 'tag', foreground: '569cd6' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editorLineNumber.activeForeground': '#C6C6C6',
      'editor.selectionBackground': '#264F78',
      'editor.lineHighlightBackground': '#2A2D2E',
      'editorCursor.foreground': '#AEAFAD',
      'editorGutter.background': '#1E1E1E',
    },
  };

  const handleEditorWillMount = useCallback((monaco: any) => {
    monaco.editor.defineTheme('custom-dark', customTheme);
    
    monaco.languages.css.cssDefaults.setOptions?.({
      validate: true,
    });
  }, []);

  return (
    <div className="code-editor-wrapper">
      <Editor
        height="100%"
        language={language}
        value={code}
        theme="custom-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        beforeMount={handleEditorWillMount}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          renderWhitespace: 'selection',
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'always',
          bracketPairColorization: {
            enabled: true,
          },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          padding: {
            top: 12,
            bottom: 12,
          },
        }}
      />
    </div>
  );
};

export default CodeEditor;
