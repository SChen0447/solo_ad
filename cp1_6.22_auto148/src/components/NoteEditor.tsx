import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Tag } from '../types';

interface NoteEditorProps {
  onSubmit: (data: { title: string; content: string; tags: string[]; imageUrl: string | null }) => void;
  onClose: () => void;
  availableTags: Tag[];
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ onSubmit, onClose, availableTags }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const tagInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    return () => setIsVisible(false);
  }, []);

  useEffect(() => {
    if (imageUrl.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)($|\?)/i) || imageUrl.includes('unsplash') || imageUrl.includes('picsum')) {
      setImagePreview(imageUrl);
    } else {
      setImagePreview(null);
    }
  }, [imageUrl]);

  useEffect(() => {
    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 250);
  };

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === ',' || e.key === '，') {
      e.preventDefault();
      if (tagInput.trim()) addTag(tagInput);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.match(/^https?:\/\/.+/i) && !imageUrl) {
      e.preventDefault();
      setImageUrl(pastedText);
    }
  };

  const handleRecord = () => {
    if (isRecording) {
      setIsRecording(false);
      const mockText = '【模拟语音转文字】这是一段从语音转换而来的创意灵感描述，记录了此刻的所思所想。';
      setContent(prev => prev + (prev ? '\n\n' : '') + mockText);
    } else {
      setIsRecording(true);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() && !content.trim()) return;
    onSubmit({
      title: title.trim() || '无标题灵感',
      content: content.trim() || '(空内容)',
      tags,
      imageUrl: imagePreview || null
    });
  };

  const filteredSuggestions = availableTags
    .filter(t => tagInput && t.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.name))
    .slice(0, 6);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 250ms ease',
    animation: isVisible ? 'none' : undefined
  };

  const modalStyle: React.CSSProperties = {
    background: '#1e293b',
    borderRadius: '20px',
    border: '1px solid #334155',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(56, 189, 248, 0.1)',
    transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
    opacity: isVisible ? 1 : 0,
    transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms ease',
    display: 'flex',
    flexDirection: 'column'
  };

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()} ref={modalRef}>
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px'
            }}>
              💡
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9' }}>记录新灵感</h2>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              transition: 'background 150ms, color 150ms'
            }}
            onMouseEnter={e => (e.currentTarget.style.cssText += 'background:#334155;color:#f1f5f9;')}
            onMouseLeave={e => (e.currentTarget.style.cssText += 'background:transparent;color:#94a3b8;')}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1 }} onPaste={handlePaste}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                灵感标题
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="给这个灵感起个名字..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 150ms, box-shadow 150ms',
                  fontFamily: 'inherit'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#334155';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                maxLength={80}
                autoFocus
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                  灵感内容
                </label>
                <button
                  type="button"
                  onClick={handleRecord}
                  style={{
                    padding: '6px 12px',
                    background: isRecording ? '#ef4444' : '#334155',
                    border: 'none',
                    borderRadius: '20px',
                    color: '#fff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 150ms',
                    fontFamily: 'inherit'
                  }}
                >
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isRecording ? '#fff' : '#f87171',
                    animation: isRecording ? 'pulse 1s infinite' : undefined
                  }} />
                  {isRecording ? '录制中...点击停止' : '🎤 语音输入'}
                </button>
              </div>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="写下你的想法、创意、灵感... 可以粘贴图片URL自动识别！按住空格键也能开始录音。"
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#f1f5f9',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 150ms, box-shadow 150ms',
                  minHeight: '120px',
                  fontFamily: 'inherit'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#334155';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onKeyDown={e => {
                  if (e.code === 'Space' && e.ctrlKey) {
                    e.preventDefault();
                    handleRecord();
                  }
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                图片链接（可选）
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="粘贴图片URL，如 https://...  .jpg/.png"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#f1f5f9',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'border-color 150ms',
                  fontFamily: 'inherit'
                }}
              />
              {imagePreview && (
                <div style={{ marginTop: '10px', position: 'relative' }}>
                  <img
                    src={imagePreview}
                    alt="预览"
                    style={{
                      width: '100%',
                      maxHeight: '140px',
                      objectFit: 'cover',
                      borderRadius: '10px',
                      border: '1px solid #334155'
                    }}
                    onError={() => setImagePreview(null)}
                  />
                  <button
                    type="button"
                    onClick={() => { setImageUrl(''); setImagePreview(null); }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'rgba(15,23,42,0.9)',
                      border: '1px solid #475569',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                标签（回车添加，最多10个）
              </label>
              <div
                style={{
                  padding: '8px 10px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  minHeight: '44px',
                  alignItems: 'center',
                  cursor: 'text'
                }}
                onClick={() => tagInputRef.current?.focus()}
              >
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 8px 5px 12px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: '#fff',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 500
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); removeTag(tag); }}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        padding: 0
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                  onKeyDown={handleTagKeyDown}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                  placeholder={tags.length === 0 ? '输入标签，回车添加...' : ''}
                  style={{
                    flex: 1,
                    minWidth: '100px',
                    padding: '4px 6px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f1f5f9',
                    fontSize: '13px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              {showTagSuggestions && filteredSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '10px',
                  padding: '6px',
                  zIndex: 10,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                }}>
                  {filteredSuggestions.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag.name)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#e2e8f0',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textAlign: 'left',
                        fontFamily: 'inherit'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{
                        width: '8px', height: '8px', borderRadius: '50%', background: tag.color
                      }} />
                      <span>#{tag.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{
            padding: '16px 24px 24px',
            borderTop: '1px solid #334155',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            background: '#1e293b',
            position: 'sticky',
            bottom: 0
          }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 20px',
                background: '#334155',
                border: 'none',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 150ms',
                fontFamily: 'inherit'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#475569'}
              onMouseLeave={e => e.currentTarget.style.background = '#334155'}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim() && !content.trim()}
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #6366f1 0%, #38bdf8 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: (!title.trim() && !content.trim()) ? 'not-allowed' : 'pointer',
                opacity: (!title.trim() && !content.trim()) ? 0.5 : 1,
                transition: 'transform 150ms, box-shadow 150ms',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                fontFamily: 'inherit'
              }}
              onMouseEnter={e => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(99, 102, 241, 0.45)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
              }}
            >
              ✨ 保存灵感
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
};

export default NoteEditor;
