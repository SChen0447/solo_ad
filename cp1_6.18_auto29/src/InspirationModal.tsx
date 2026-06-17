import { useState, useEffect } from 'react';
import { FiEdit3, FiTrash2, FiX, FiLink, FiCalendar, FiTag } from 'react-icons/fi';
import { useStore } from './store';
import { TAG_COLORS } from './types';
import type { Inspiration, TagColor } from './types';

interface Props {
  inspiration: Inspiration;
  onClose: () => void;
}

function InspirationModal({ inspiration, onClose }: Props) {
  const { updateInspiration, deleteInspiration } = useStore();

  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(inspiration.content);
  const [tag, setTag] = useState<TagColor>(inspiration.tag);
  const [linksStr, setLinksStr] = useState(inspiration.links.join('\n'));
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setContent(inspiration.content);
    setTag(inspiration.tag);
    setLinksStr(inspiration.links.join('\n'));
  }, [inspiration]);

  const handleSave = async () => {
    const linksArr = linksStr
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    try {
      const res = await fetch(`/api/inspirations/${inspiration.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          tag,
          links: linksArr
        })
      });
      const updated: Inspiration = await res.json();
      updateInspiration(inspiration.id, {
        content: updated.content,
        tag: updated.tag,
        links: updated.links
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/inspirations/${inspiration.id}`, {
        method: 'DELETE'
      });
      deleteInspiration(inspiration.id);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 10, 25, 0.55)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 540,
          maxWidth: '90vw',
          maxHeight: '85vh',
          background: 'rgba(22, 33, 62, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 18,
          border: `1px solid ${TAG_COLORS[inspiration.tag].bg}33`,
          boxShadow: `0 20px 80px rgba(0,0,0,0.5), ${TAG_COLORS[inspiration.tag].glow} 0 0 60px -20px`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div
          style={{
            padding: '22px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${TAG_COLORS[inspiration.tag].bg}15 0%, transparent 100%)`,
            borderBottom: '1px solid rgba(233, 69, 96, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: TAG_COLORS[tag].bg,
                boxShadow: TAG_COLORS[tag].glow + ' 0 0 12px'
              }}
            />
            <h2
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: '#fff'
              }}
            >
              灵感详情
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(52, 152, 219, 0.3)',
                    background: 'rgba(52, 152, 219, 0.1)',
                    color: '#3498db',
                    cursor: 'pointer',
                    fontSize: 12,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FiEdit3 size={13} />
                  编辑
                </button>
                <button
                  onClick={() => setIsDeleting(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: '1px solid rgba(233, 69, 96, 0.3)',
                    background: 'rgba(233, 69, 96, 0.1)',
                    color: '#e94560',
                    cursor: 'pointer',
                    fontSize: 12,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <FiTrash2 size={13} />
                  删除
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setContent(inspiration.content);
                    setTag(inspiration.tag);
                    setLinksStr(inspiration.links.join('\n'));
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: '1px solid rgba(160,160,176,0.2)',
                    background: 'transparent',
                    color: '#a0a0b0',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background:
                      'linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 500
                  }}
                >
                  保存
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#a0a0b0',
                cursor: 'pointer',
                fontSize: 22,
                padding: 4,
                lineHeight: 1,
                marginLeft: 4
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div
          style={{
            padding: 24,
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 18
          }}
        >
          {isEditing ? (
            <>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#a0a0b0',
                    marginBottom: 8,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  内容
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    minHeight: 120,
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid rgba(233, 69, 96, 0.2)',
                    background: 'rgba(26, 26, 46, 0.6)',
                    color: '#fff',
                    fontSize: 14,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.6
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#a0a0b0',
                    marginBottom: 8,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <FiTag size={12} /> 标签
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(Object.keys(TAG_COLORS) as TagColor[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTag(t)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border:
                          tag === t
                            ? `3px solid #fff`
                            : '3px solid transparent',
                        background: TAG_COLORS[t].bg,
                        cursor: 'pointer',
                        boxShadow:
                          tag === t ? TAG_COLORS[t].glow + ' 0 0 0 4px' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={TAG_COLORS[t].name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    color: '#a0a0b0',
                    marginBottom: 8,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <FiLink size={12} /> 关联链接（每行一个）
                </label>
                <textarea
                  value={linksStr}
                  onChange={(e) => setLinksStr(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    minHeight: 60,
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid rgba(160,160,176,0.15)',
                    background: 'rgba(26, 26, 46, 0.6)',
                    color: '#fff',
                    fontSize: 13,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#888',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <FiCalendar size={11} />
                    {formatDate(inspiration.createdAt)}
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: TAG_COLORS[inspiration.tag].glow,
                      color: '#fff',
                      fontSize: 11
                    }}
                  >
                    <FiTag size={10} />
                    {TAG_COLORS[inspiration.tag].name}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: '#e8e8f0',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {inspiration.content}
                </div>
              </div>

              {inspiration.links.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      color: '#888',
                      marginBottom: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <FiLink size={11} />
                    关联链接
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {inspiration.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: 'rgba(52, 152, 219, 0.08)',
                          border: '1px solid rgba(52, 152, 219, 0.15)',
                          color: '#3498db',
                          fontSize: 12,
                          textDecoration: 'none',
                          wordBreak: 'break-all',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            'rgba(52, 152, 219, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            'rgba(52, 152, 219, 0.08)';
                        }}
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isDeleting && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsDeleting(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 360,
              background: '#16213e',
              borderRadius: 14,
              border: '1px solid rgba(233, 69, 96, 0.2)',
              padding: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
            }}
          >
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#fff',
                marginBottom: 8
              }}
            >
              确认删除？
            </h3>
            <p style={{ fontSize: 13, color: '#a0a0b0', marginBottom: 20 }}>
              删除后无法恢复，相关关联也会被一并移除。
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setIsDeleting(false)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: '1px solid rgba(160,160,176,0.2)',
                  background: 'transparent',
                  color: '#a0a0b0',
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background:
                    'linear-gradient(135deg, #e94560 0%, #c23a51 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default InspirationModal;
