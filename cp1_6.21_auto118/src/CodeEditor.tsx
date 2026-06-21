import React, { useState, useEffect, useRef, useCallback } from 'react';

interface CodeEditorProps {
  code: string;
  props: Record<string, any>;
  onChange: (newProps: Record<string, any>, newCode: string) => void;
  debounceMs?: number;
}

const parsePropsFromCode = (code: string): Record<string, any> | null => {
  try {
    const props: Record<string, any> = {};
    const lines = code.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      const stringMatch = trimmed.match(/^(\w+)="([^"]*)"$/);
      if (stringMatch) {
        props[stringMatch[1]] = stringMatch[2];
        continue;
      }
      
      const numberMatch = trimmed.match(/^(\w+)=\{(\d+)\}$/);
      if (numberMatch) {
        props[numberMatch[1]] = Number(numberMatch[2]);
        continue;
      }
      
      const boolMatch = trimmed.match(/^(\w+)=\{(true|false)\}$/);
      if (boolMatch) {
        props[boolMatch[1]] = boolMatch[2] === 'true';
        continue;
      }
      
      const arrayMatch = trimmed.match(/^(\w+)=\{(.*)\}$/);
      if (arrayMatch) {
        try {
          const value = eval(`(${arrayMatch[2]})`);
          if (Array.isArray(value)) {
            props[arrayMatch[1]] = value;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
    
    return props;
  } catch {
    return null;
  }
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onChange, debounceMs = 500 }) => {
  const [value, setValue] = useState(code);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(code);
  }, [code]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const lines = newValue.split('\n');
      const propLines = lines.slice(1, -1).map(l => l.trim()).filter(Boolean);
      const propCode = propLines.join('\n');
      const parsedProps = parsePropsFromCode(propCode);
      
      if (parsedProps && onChange) {
        onChange(parsedProps, newValue);
      }
    }, debounceMs);
  }, [onChange, debounceMs]);

  const lineCount = value.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="code-editor-container">
      <div className="section-header">
        <span className="section-title">代码编辑器 Editor</span>
        <span className="section-hint">修改属性后500ms自动更新预览</span>
      </div>
      <div className="code-editor-wrapper">
        <div className="line-numbers" ref={lineNumbersRef}>
          {lineNumbers.map(num => (
            <div key={num} className="line-number">{num}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onScroll={handleScroll}
          className="code-editor-textarea"
          spellCheck={false}
          wrap="off"
        />
      </div>
    </div>
  );
};

export default CodeEditor;
