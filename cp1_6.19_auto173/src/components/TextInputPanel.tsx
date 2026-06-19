import { useState, type FormEvent, type KeyboardEvent } from 'react';
import './TextInputPanel.css';

interface TextInputPanelProps {
  onSubmit: (text: string) => void;
  isLoading?: boolean;
}

const TextInputPanel = ({ onSubmit, isLoading = false }: TextInputPanelProps) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim() && !isLoading) {
      onSubmit(text.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (text.trim() && !isLoading) {
        onSubmit(text.trim());
      }
    }
  };

  const examples = [
    '一个客厅，中央是L型灰色沙发，沙发前有一张玻璃茶几',
    '书房里靠墙放一个书架，旁边有一张桌子',
    '卧室里有一张床和两个台灯',
  ];

  const handleExampleClick = (example: string) => {
    setText(example);
    if (!isLoading) {
      onSubmit(example);
    }
  };

  return (
    <div className="text-input-panel">
      <form onSubmit={handleSubmit}>
        <textarea
          className="text-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请描述你想要的3D场景布局...

例如：一个客厅，中央是L型灰色沙发，沙发前有一张玻璃茶几，茶几上放着一盏台灯"
          rows={8}
          disabled={isLoading}
        />
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={!text.trim() || isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span>
              解析中...
            </>
          ) : (
            '生成布局'
          )}
        </button>
      </form>

      <div className="examples-section">
        <p className="examples-label">快速示例：</p>
        <div className="examples-list">
          {examples.map((example, index) => (
            <button
              key={index}
              className="example-button"
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
            >
              示例 {index + 1}
            </button>
          ))}
        </div>
      </div>

      <p className="hint-text">
        提示：按 Ctrl/Cmd + Enter 快速提交
      </p>
    </div>
  );
};

export default TextInputPanel;
