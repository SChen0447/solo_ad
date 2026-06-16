import { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter, foldKeymap } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import type { FunctionMeta, GenerateResult } from './types';

interface CodeInputProps {
  initialCode: string;
  onGenerate: (code: string, functions: FunctionMeta[], testCode: string) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
}

const monokaiTheme = EditorView.theme({
  '&': {
    backgroundColor: '#272822',
    color: '#F8F8F2',
  },
  '.cm-content': {
    caretColor: '#F8F8F0',
    padding: '8px 0',
  },
  '.cm-gutters': {
    backgroundColor: '#272822',
    color: '#90908a',
    border: 'none',
    borderRight: '1px solid #3e3d32',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#3e3d32',
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(73, 72, 62, 0.5)',
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#49483e !important',
  },
}, { dark: true });

const sampleCode = `// 示例：在此处粘贴你的 JavaScript 或 TypeScript 代码
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(x: number, y: number): number {
  return x * y;
}

export class Calculator {
  private value: number = 0;

  add(num: number): Calculator {
    this.value += num;
    return this;
  }

  getResult(): number {
    return this.value;
  }
}

export default add;
`;

function CodeInput({ initialCode, onGenerate, isGenerating, setIsGenerating }: CodeInputProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const codeRef = useRef<string>(initialCode || sampleCode);

  useEffect(() => {
    if (!editorRef.current) return;

    const startDoc = initialCode || sampleCode;
    codeRef.current = startDoc;

    const state = EditorState.create({
      doc: startDoc,
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
        monokaiTheme,
        EditorView.updateListener.of((v) => {
          if (v.docChanged) {
            codeRef.current = v.state.doc.toString();
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
    };
  }, []);

  useEffect(() => {
    if (viewRef.current && initialCode !== '' && initialCode !== codeRef.current) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: initialCode },
      });
      codeRef.current = initialCode;
    }
  }, [initialCode]);

  const handleGenerate = useCallback(async () => {
    const code = codeRef.current;
    if (!code.trim()) {
      alert('请先输入代码');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        throw new Error('生成失败');
      }

      const data: GenerateResult = await res.json();
      onGenerate(code, data.functions, data.testCode);
    } catch (err) {
      console.error(err);
      alert('生成测试用例失败，请检查网络或稍后重试');
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerate, setIsGenerating]);

  const handleCoverageReport = useCallback(async () => {
    const code = codeRef.current;
    if (!code.trim()) {
      alert('请先输入代码');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, withCoverage: true }),
      });

      if (!res.ok) {
        throw new Error('生成失败');
      }

      const data: GenerateResult & { coverage?: { lines: number; statements: number; functions: number; branches: number } } = await res.json();
      onGenerate(code, data.functions, data.testCode);

      if (data.coverage) {
        setTimeout(() => {
          alert(`模拟覆盖率报告:\n行覆盖率: ${data.coverage!.lines}%\n语句覆盖率: ${data.coverage!.statements}%\n函数覆盖率: ${data.coverage!.functions}%\n分支覆盖率: ${data.coverage!.branches}%`);
        }, 100);
      }
    } catch (err) {
      console.error(err);
      alert('生成覆盖率报告失败');
    } finally {
      setIsGenerating(false);
    }
  }, [onGenerate, setIsGenerating]);

  return (
    <div className="left-panel">
      <div className="panel-title">📝 代码输入区 (JavaScript / TypeScript)</div>
      <div className="editor-wrapper" ref={editorRef} style={{ height: '100%', minHeight: 0 }} />
      <div className="button-group">
        <button className="btn-primary" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating && <span className="spinner" />}
          {isGenerating ? '生成中...' : '生成测试'}
        </button>
        <button className="btn-primary" onClick={handleCoverageReport} disabled={isGenerating}>
          {isGenerating && <span className="spinner" />}
          {isGenerating ? '生成中...' : '生成覆盖率报告'}
        </button>
      </div>
    </div>
  );
}

export default CodeInput;
