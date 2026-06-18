import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../store';

export default function Modal() {
  const { isModalOpen, toggleModal, addCard } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [titleError, setTitleError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const TITLE_MAX = 25;
  const CONTENT_MAX = 200;

  const debounceRef = useRef<number | null>(null);

  const debouncedSetTitle = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      if (value.length > TITLE_MAX) {
        setTitle(value.substring(0, TITLE_MAX));
        setTitleError(true);
      } else {
        setTitle(value);
        setTitleError(false);
      }
    }, 16);
  }, []);

  const debouncedSetContent = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      if (value.length > CONTENT_MAX) {
        setContent(value.substring(0, CONTENT_MAX));
      } else {
        setContent(value);
      }
    }, 16);
  }, []);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSetTitle(e.target.value);
    },
    [debouncedSetTitle]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      debouncedSetContent(e.target.value);
    },
    [debouncedSetContent]
  );

  const handleSubmit = useCallback(() => {
    if (title.trim() && content.trim()) {
      addCard(title.trim(), content.trim());
      setTitle('');
      setContent('');
      setTitleError(false);
      toggleModal(false);
    }
  }, [title, content, addCard, toggleModal]);

  const handleClose = useCallback(() => {
    setTitle('');
    setContent('');
    setTitleError(false);
    toggleModal(false);
  }, [toggleModal]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => titleInputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isModalOpen, handleClose]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!isModalOpen) return null;

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div ref={modalRef} className="modal-container">
        <div className="modal-header">
          <h3>🌊 扔一个漂流瓶</h3>
          <button className="modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="title">标题</label>
            <input
              ref={titleInputRef}
              id="title"
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="给你的灵感起个名字..."
              className={`form-input ${titleError ? 'error' : ''}`}
            />
            {titleError && (
              <span className="error-message">标题不能超过25字</span>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="content">内容</label>
            <div className="textarea-wrapper">
              <textarea
                id="content"
                value={content}
                onChange={handleContentChange}
                placeholder="写下你的创意灵感..."
                className="form-textarea"
                rows={5}
              />
              <span className="char-count">
                {content.length}/{CONTENT_MAX}
              </span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={handleClose}>
            取消
          </button>
          <button
            className="btn-submit"
            onClick={handleSubmit}
            disabled={!title.trim() || !content.trim()}
          >
            投入大海
          </button>
        </div>
      </div>
    </div>
  );
}
