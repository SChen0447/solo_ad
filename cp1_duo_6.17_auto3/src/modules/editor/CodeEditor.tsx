import React, { useState, useRef, useCallback } from 'react';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  label?: string;
  placeholder?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  label = 'HTML/CSS/JS 代码',
  placeholder = '在此粘贴 HTML、CSS 或 JavaScript 代码...'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      onChange(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [onChange]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="code-editor">
      <div className="editor-header">
        <span className="editor-label">{label}</span>
        <div className="editor-actions">
          <button
            className="btn-upload"
            onClick={triggerFileInput}
            title="上传 HTML 文件"
          >
            📁 上传文件
          </button>
          <button
            className="btn-submit"
            onClick={onSubmit}
            disabled={isLoading || !value.trim()}
          >
            {isLoading ? '提交中...' : '渲染预览'}
          </button>
        </div>
      </div>
      <textarea
        className="editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.css,.js"
        onChange={handleFileUpload}
        className="hidden-file-input"
      />
    </div>
  );
};

export default CodeEditor;
