import { useState, useRef, useEffect } from 'react';
import './DiaryInput.css';

interface DiaryInputProps {
  onSave: (content: string) => void;
  maxLength?: number;
  warningLength?: number;
}

export default function DiaryInput({ onSave, maxLength = 300, warningLength = 200 }: DiaryInputProps) {
  const [content, setContent] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const charCount = content.length;
  const isWarning = charCount >= warningLength && charCount < maxLength;
  const isError = charCount >= maxLength;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (newValue.length > maxLength) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      return;
    }
    
    setContent(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (charCount >= maxLength && 
        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
      e.preventDefault();
    }
  };

  const handleSave = () => {
    if (content.trim().length > 0) {
      onSave(content.trim());
      setContent('');
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="diary-input-container">
      <h2 className="diary-input-title">今日心情</h2>
      <div className={`textarea-wrapper ${isShaking ? 'shake' : ''}`}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="写下今天的心情..."
          className={`diary-textarea ${isWarning ? 'warning' : ''} ${isError ? 'error' : ''}`}
          rows={8}
        />
        <div className={`char-count ${isWarning ? 'warning' : ''} ${isError ? 'error' : ''}`}>
          {charCount} / {maxLength}
        </div>
      </div>
      <button
        className="save-button"
        onClick={handleSave}
        disabled={content.trim().length === 0}
      >
        保存日记
      </button>
    </div>
  );
}
