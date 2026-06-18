import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

const MAX_TITLE = 25;
const MAX_CONTENT = 200;

export const Modal: React.FC = () => {
  const { isModalOpen, setModalOpen, addBottle } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [titleError, setTitleError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      setTitle('');
      setContent('');
      setTitleError('');
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isModalOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isModalOpen, setModalOpen]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length > MAX_TITLE) {
      setTitle(val.slice(0, MAX_TITLE));
      setTitleError('标题不能超过25字');
    } else {
      setTitle(val);
      setTitleError('');
    }
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= MAX_CONTENT) {
      setContent(val);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;
    addBottle(title.trim(), content.trim());
  }, [title, content, addBottle]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setModalOpen(false);
    }
  }, [setModalOpen]);

  if (!isModalOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        style={{
          width: '90%',
          maxWidth: 520,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.1)',
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        <h2 style={{
          fontSize: 22,
          fontWeight: 600,
          color: '#fff',
          margin: '0 0 20px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span>🌊</span>
          投入新漂流瓶
        </h2>

        <div style={{ marginBottom: 18 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            color: '#94a3b8',
            marginBottom: 6,
            fontWeight: 500
          }}>
            点子标题
          </label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="一句话描述你的创意..."
            maxLength={MAX_TITLE + 5}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 15,
              borderRadius: 10,
              border: `1px solid ${titleError ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            minHeight: 18
          }}>
            <span style={{
              fontSize: 12,
              color: '#ef4444',
              opacity: titleError ? 1 : 0,
              transition: 'opacity 0.2s'
            }}>
              {titleError || ' '}
            </span>
            <span style={{
              fontSize: 12,
              color: title.length >= MAX_TITLE ? '#f59e0b' : '#64748b'
            }}>
              {title.length}/{MAX_TITLE}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block',
            fontSize: 13,
            color: '#94a3b8',
            marginBottom: 6,
            fontWeight: 500
          }}>
            详细描述
          </label>
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="展开说说你的想法..."
            rows={5}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 15,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              color: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'none',
              lineHeight: 1.6,
              transition: 'border-color 0.2s',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <span style={{
              fontSize: 12,
              color: content.length >= MAX_CONTENT ? '#f59e0b' : '#64748b'
            }}>
              {content.length}/{MAX_CONTENT}
            </span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={() => setModalOpen(false)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'transparent',
              color: '#cbd5e1',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 500
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            style={{
              padding: '10px 22px',
              fontSize: 14,
              borderRadius: 12,
              border: 'none',
              background: '#10b981',
              color: '#fff',
              cursor: title.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              opacity: title.trim() ? 1 : 0.5,
              transition: 'all 0.2s',
              boxShadow: title.trim() ? '0 4px 14px rgba(16,185,129,0.4)' : 'none'
            }}
            onMouseOver={e => {
              if (title.trim()) {
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(16,185,129,0.6), 0 0 8px rgba(16,185,129,0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={e => {
              e.currentTarget.style.boxShadow = title.trim() ? '0 4px 14px rgba(16,185,129,0.4)' : 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🌊 投入大海
          </button>
        </div>
      </div>
    </div>
  );
};
