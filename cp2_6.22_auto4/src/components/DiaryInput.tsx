import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { analyzeMood } from '../utils/moodAnalyzer';
import type { Keyword } from '../utils/moodAnalyzer';

interface DiaryInputProps {
  date: string;
  onSave: (entry: { date: string; content: string; moodColor: string; keywords: Keyword[]; moodName: string }) => void;
  initialContent?: string;
}

const MAX_WORDS = 300;
const WARNING_WORDS = 200;

export default function DiaryInput({ date, onSave, initialContent = '' }: DiaryInputProps) {
  const [content, setContent] = useState(initialContent);
  const [isShaking, setIsShaking] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
    setInputKey(k => k + 1);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }, [date, initialContent]);

  const charCount = content.length;
  const isWarning = charCount > WARNING_WORDS && charCount <= MAX_WORDS;
  const isOverLimit = charCount > MAX_WORDS;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length > MAX_WORDS) {
      setContent(value.slice(0, MAX_WORDS));
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    } else {
      setContent(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (charCount >= MAX_WORDS &&
        !e.ctrlKey && !e.metaKey &&
        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
          'Home', 'End', 'Tab', 'Escape'].includes(e.key)) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 400);
    }
  };

  const handleSave = () => {
    if (!content.trim()) return;
    const result = analyzeMood(content);
    onSave({
      date,
      content: content.trim(),
      moodColor: result.color,
      keywords: result.keywords,
      moodName: result.moodName,
    });
    setContent('');
    textareaRef.current?.focus();
  };

  const countStyle: React.CSSProperties = {
    color: isOverLimit ? '#EF4444' : isWarning ? '#EAB308' : '#9CA3AF',
    transition: 'color 0.3s ease-out, transform 0.3s ease-out',
    transform: isWarning ? 'scale(1.02)' : 'scale(1)',
    fontWeight: isWarning ? 600 : 400,
  };

  const textareaStyle: React.CSSProperties = {
    borderColor: isOverLimit ? '#EF4444' : '#E5E7EB',
    transition: 'border-color 0.3s ease-out, box-shadow 0.3s ease-out',
    boxShadow: isOverLimit ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
  };

  return (
    <div className="diary-input-container">
      <div className="diary-input-header">
        <span className="diary-input-title">今日心情记录</span>
        <span className="diary-input-date">{date}</span>
      </div>
      <div
        key={inputKey}
        className={`diary-textarea-wrapper ${isShaking ? 'shake-animation' : ''}`}
      >
        <textarea
          ref={textareaRef}
          className="diary-textarea"
          style={textareaStyle}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="写下今天的心情与故事……"
          rows={8}
          maxLength={MAX_WORDS + 10}
        />
        <div className="diary-word-count" style={countStyle}>
          {charCount} / {MAX_WORDS}
        </div>
      </div>
      <button
        className="diary-save-btn"
        onClick={handleSave}
        disabled={!content.trim()}
        style={{ opacity: content.trim() ? 1 : 0.5, cursor: content.trim() ? 'pointer' : 'not-allowed' }}
      >
        <span>保存日记</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
      </button>
      <style>{`
        .diary-input-container {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 24px;
          box-shadow: 0 4px 24px rgba(99, 102, 241, 0.08);
          border: 1px solid #E5E7EB;
        }
        .diary-input-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .diary-input-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        .diary-input-date {
          font-size: 14px;
          color: #9CA3AF;
          background: #F3F4F6;
          padding: 4px 12px;
          border-radius: 12px;
        }
        .diary-textarea-wrapper {
          position: relative;
        }
        .diary-textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 16px;
          padding-bottom: 36px;
          border: 2px solid #E5E7EB;
          border-radius: 16px;
          font-size: 15px;
          line-height: 1.7;
          font-family: inherit;
          resize: none;
          outline: none;
          background: #F9FAFB;
          color: #374151;
          min-height: 200px;
        }
        .diary-textarea:focus {
          border-color: #6366F1;
          background: #FFFFFF;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1) !important;
        }
        .diary-word-count {
          position: absolute;
          bottom: 10px;
          right: 14px;
          font-size: 13px;
        }
        .diary-save-btn {
          width: 160px;
          height: 48px;
          margin-top: 16px;
          border: none;
          border-radius: 20px;
          background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
          color: #FFFFFF;
          font-size: 15px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease-out;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
        }
        .diary-save-btn:hover:not(:disabled) {
          transform: translateX(3px);
          box-shadow: 0 6px 24px rgba(99, 102, 241, 0.45), 0 0 20px rgba(139, 92, 246, 0.3);
        }
        .diary-save-btn:active:not(:disabled) {
          transform: translateX(1px) scale(0.98);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .shake-animation {
          animation: shake 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
