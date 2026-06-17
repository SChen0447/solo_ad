import React, { useState, useRef, useEffect } from 'react';

interface CommentModalProps {
  isOpen: boolean;
  position: { x: number; y: number };
  selectedText: string;
  onSubmit: (content: string) => void;
  onClose: () => void;
}

const CommentModal: React.FC<CommentModalProps> = ({
  isOpen,
  position,
  selectedText,
  onSubmit,
  onClose
}) => {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
        padding: '16px',
        width: '320px',
        zIndex: 10000,
        border: '1px solid #e5e7eb'
      }}
    >
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        marginBottom: '8px',
        padding: '6px 10px',
        background: '#f9fafb',
        borderRadius: '6px',
        fontStyle: 'italic',
        borderLeft: '3px solid #6366f1'
      }}>
        {selectedText.length > 80 ? selectedText.substring(0, 80) + '...' : selectedText}
      </div>
      
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value.substring(0, 200))}
          placeholder="输入评注内容（最多200字）..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '10px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            lineHeight: 1.5,
            resize: 'vertical',
            outline: 'none',
            marginBottom: '12px'
          }}
          onFocus={(e) => e.target.style.borderColor = '#6366f1'}
          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '12px',
            color: content.length > 180 ? '#f59e0b' : '#9ca3af'
          }}>
            {content.length}/200
          </span>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#6b7280',
                background: '#f3f4f6'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!content.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'white',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                cursor: content.trim() ? 'pointer' : 'not-allowed',
                opacity: content.trim() ? 1 : 0.5
              }}
            >
              添加评注
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentModal;
