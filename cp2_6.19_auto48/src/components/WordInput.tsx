import React, { useState, useRef, useEffect } from 'react';
import type { Theme } from '../types';

interface WordInputProps {
  onSubmit: (word: string, inputRef: HTMLInputElement) => void;
  theme: Theme;
}

const WordInput: React.FC<WordInputProps> = ({ onSubmit, theme }) => {
  const [word, setWord] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (word.trim() && word.length <= 10 && inputRef.current) {
      onSubmit(word.trim(), inputRef.current);
      setWord('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="student-input-container">
      <div className="student-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="student-input"
          value={word}
          onChange={(e) => setWord(e.target.value.slice(0, 10))}
          onKeyDown={handleKeyDown}
          placeholder="输入关键词（最多10字），按回车发送"
          style={{ '--primary-color': theme.primaryColor } as React.CSSProperties}
        />
        <button
          className="send-btn"
          onClick={handleSubmit}
          disabled={!word.trim()}
          style={{
            backgroundColor: theme.primaryColor,
            opacity: word.trim() ? 1 : 0.5,
            cursor: word.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          🚀
        </button>
      </div>
    </div>
  );
};

export default WordInput;
