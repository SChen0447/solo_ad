import React, { useState } from 'react';
import { parseMarkdown, ChartData } from './MarkdownParser';

interface InputPanelProps {
  onGenerate: (data: ChartData) => void;
  markdown: string;
  onMarkdownChange: (value: string) => void;
}

const InputPanel: React.FC<InputPanelProps> = ({ onGenerate, markdown, onMarkdownChange }) => {
  const handleGenerate = () => {
    const chartData = parseMarkdown(markdown);
    onGenerate(chartData);
  };

  const inputPanelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#1a202c',
    height: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: '#e2e8f0',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    flex: 1,
    minHeight: '300px',
    padding: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1a202c',
    fontSize: '14px',
    fontFamily: 'Consolas, Monaco, monospace',
    resize: 'none',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 24px',
    backgroundColor: '#667eea',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 200ms ease-in-out',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
  };

  return (
    <div style={inputPanelStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={labelStyle}>Markdown 数据输入</div>
        <textarea
          style={textareaStyle}
          value={markdown}
          onChange={(e) => onMarkdownChange(e.target.value)}
          placeholder="输入 Markdown 格式的数据...\n\n# 标题\n\n| 名称 | 数值 |\n|------|------|\n| 项目A | 100 |\n| 项目B | 200 |"
        />
      </div>
      <button
        style={buttonStyle}
        onClick={handleGenerate}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.2)';
        }}
      >
        生成图表
      </button>
    </div>
  );
};

export default InputPanel;
