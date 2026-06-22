import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Emotion } from '../api';

const EMOTIONS: { key: Emotion; label: string; color: string }[] = [
  { key: 'happy', label: '快乐', color: '#facc15' },
  { key: 'sad', label: '悲伤', color: '#6366f1' },
  { key: 'anxious', label: '焦虑', color: '#f97316' },
  { key: 'calm', label: '平静', color: '#34d399' },
  { key: 'excited', label: '兴奋', color: '#f472b6' },
];

interface FloatingButtonProps {
  onSubmit: (text: string, emotion?: Emotion) => void;
}

export default function FloatingButton({ onSubmit }: FloatingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | undefined>(undefined);
  const [isSimulatingVoice, setIsSimulatingVoice] = useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setText('');
    setSelectedEmotion(undefined);
    setIsSimulatingVoice(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, handleClose]);

  const handleSimulateVoice = () => {
    setIsSimulatingVoice(true);
    setTimeout(() => {
      const voiceTexts = [
        '今天心情不错，感觉一切都在朝好的方向发展',
        '有些焦虑，不知道明天的面试会怎样',
        '刚跑完步，身心放松，状态很好',
        '突然想起了一个绝妙的点子，关于产品设计',
        '看了一部感人的电影，内心久久不能平静',
      ];
      const randomText = voiceTexts[Math.floor(Math.random() * voiceTexts.length)];
      setText((prev) => (prev ? prev + ' ' + randomText : randomText));
      setIsSimulatingVoice(false);
    }, 1500);
  };

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim(), selectedEmotion);
    handleClose();
  };

  const panel = (
    <div className="floating-panel-overlay" onClick={handleClose}>
      <div
        className={`floating-panel ${isOpen ? 'panel-enter' : 'panel-exit'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header">
          <span>记录此刻</span>
          <button className="panel-close" onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <textarea
          className="panel-textarea"
          placeholder="写下你的想法...（最多500字）"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        <div className="panel-footer">
          <div className="panel-emotions">
            {EMOTIONS.map((em) => (
              <button
                key={em.key}
                className={`emotion-dot-btn ${selectedEmotion === em.key ? 'selected' : ''}`}
                style={{ background: em.color }}
                onClick={() =>
                  setSelectedEmotion(selectedEmotion === em.key ? undefined : em.key)
                }
                title={em.label}
              />
            ))}
          </div>
          <div className="panel-actions">
            <button
              className="voice-btn"
              onClick={handleSimulateVoice}
              disabled={isSimulatingVoice}
              title="模拟录音转文字"
            >
              <i className={`fas ${isSimulatingVoice ? 'fa-spinner fa-spin' : 'fa-microphone'}`}></i>
            </button>
            <button className="submit-btn" onClick={handleSubmit} disabled={!text.trim()}>
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button className="floating-btn" onClick={() => setIsOpen(true)} title="记录想法">
        <i className="fas fa-plus"></i>
      </button>
      {isOpen && createPortal(panel, document.body)}
      <style>{`
        .floating-btn {
          position: fixed;
          bottom: 32px;
          right: 32px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #e2e8f0;
          font-size: 24px;
          cursor: pointer;
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, background 0.2s;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .floating-btn:hover {
          transform: scale(1.1);
          background: rgba(255, 255, 255, 0.4);
        }
        .floating-btn:active {
          transform: scale(0.95);
        }
        .floating-panel-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: overlay-in 0.2s ease;
        }
        @keyframes overlay-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .floating-panel {
          width: 420px;
          max-width: 90vw;
          background: #1e293b;
          border-radius: 16px;
          border: 1px solid #334155;
          overflow: hidden;
          animation: panel-slide-in 0.3s ease;
        }
        @keyframes panel-slide-in {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #334155;
          color: #e2e8f0;
          font-weight: 600;
          font-size: 16px;
        }
        .panel-close {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          transition: color 0.2s;
        }
        .panel-close:hover {
          color: #e2e8f0;
        }
        .panel-textarea {
          width: 100%;
          min-height: 120px;
          padding: 16px 20px;
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-size: 14px;
          line-height: 1.6;
          resize: vertical;
          outline: none;
          font-family: inherit;
        }
        .panel-textarea::placeholder {
          color: #64748b;
        }
        .panel-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-top: 1px solid #334155;
        }
        .panel-emotions {
          display: flex;
          gap: 8px;
        }
        .emotion-dot-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.2s, border-color 0.2s;
        }
        .emotion-dot-btn:hover {
          transform: scale(1.2);
        }
        .emotion-dot-btn.selected {
          border-color: #e2e8f0;
          transform: scale(1.2);
        }
        .panel-actions {
          display: flex;
          gap: 8px;
        }
        .voice-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #334155;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: background 0.2s, color 0.2s;
        }
        .voice-btn:hover:not(:disabled) {
          background: #475569;
          color: #e2e8f0;
        }
        .voice-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }
        .submit-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: #a78bfa;
          color: #0f172a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: background 0.2s, transform 0.2s;
        }
        .submit-btn:hover:not(:disabled) {
          background: #8b5cf6;
          transform: scale(1.05);
        }
        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
