import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import type { Card, Category } from './types';
import { CATEGORY_CONFIG } from './types';
import { getCard, updateCard, deleteCard } from './services/cardService';
import { getCards } from './services/cardService';

marked.setOptions({ breaks: true, gfm: true });

export default function CardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [card, setCard] = useState<Card | null>(null);
  const [relatedCards, setRelatedCards] = useState<Card[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('frontend');
  const [editContent, setEditContent] = useState('');
  const [editDifficulty, setEditDifficulty] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const loadData = async () => {
      try {
        const [current, all] = await Promise.all([getCard(id), getCards()]);
        setCard(current);
        setEditTitle(current.title);
        setEditCategory(current.category);
        setEditContent(current.content);
        setEditDifficulty(current.difficulty);
        setRelatedCards(
          all.filter(c => c.category === current.category && c.id !== id).slice(0, 5)
        );
      } catch (err) {
        console.error('Failed to load card:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!card) return;
    try {
      const updated = await updateCard(card.id, {
        title: editTitle,
        category: editCategory,
        content: editContent,
        difficulty: editDifficulty
      });
      setCard(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update:', err);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    if (!confirm('确定要删除这张卡片吗？')) return;
    try {
      await deleteCard(card.id);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: '#9ca3af' }}>
        加载中...
      </div>
    );
  }

  if (!card) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <p style={{ color: '#6b7280', marginBottom: 16 }}>卡片不存在</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  const config = CATEGORY_CONFIG[card.category];
  const editConfig = CATEGORY_CONFIG[editCategory];

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <header style={{
        padding: '16px 32px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: '#fff',
        zIndex: 10
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            background: 'none',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ fontSize: 14 }}>←</span>
          返回
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setEditTitle(card.title);
                  setEditCategory(card.category);
                  setEditContent(card.content);
                  setEditDifficulty(card.difficulty);
                  setIsEditing(false);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                保存
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'none',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151'
                }}
              >
                ✎ 编辑
              </button>
              <button
                onClick={handleDelete}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'none',
                  border: '1px solid #fecaca',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#dc2626'
                }}
              >
                🗑 删除
              </button>
            </>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{
          flex: 1,
          padding: 32,
          borderRight: '1px solid #f3f4f6',
          minWidth: 0
        }}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6
                }}>
                  标题
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 18,
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: 6
                  }}>
                    分类
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as Category)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 14,
                      outline: 'none',
                      background: '#fff'
                    }}
                  >
                    <option value="frontend">前端</option>
                    <option value="backend">后端</option>
                    <option value="tool">工具</option>
                    <option value="pitfall">踩坑</option>
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: 6
                  }}>
                    难度星级
                  </label>
                  <div style={{ display: 'flex', gap: 4, padding: '8px 0' }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setEditDifficulty(n as 1 | 2 | 3 | 4 | 5)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 24,
                          color: n <= editDifficulty ? '#f59e0b' : '#d1d5db'
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: 6
                  }}>
                    Markdown 正文
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 400,
                      padding: 14,
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 14,
                      fontFamily: '"SF Mono", Monaco, Consolas, monospace',
                      lineHeight: 1.6,
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: 6
                }}>
                  实时预览
                </label>
                <div
                  className="markdown-body"
                  style={{
                    padding: 20,
                    borderRadius: 8,
                    background: '#fafafa',
                    border: '1px solid #e5e7eb',
                    minHeight: 200
                  }}
                  dangerouslySetInnerHTML={{ __html: marked.parse(editContent) as string }}
                />
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{
                  padding: '4px 12px',
                  borderRadius: 4,
                  background: config.color,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700
                }}>
                  {config.label}
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      style={{
                        fontSize: 16,
                        color: n <= card.difficulty ? '#f59e0b' : '#d1d5db'
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <h1 style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#111827',
                marginBottom: 8,
                lineHeight: 1.3
              }}>
                {card.title}
              </h1>

              <p style={{
                fontSize: 12,
                color: '#9ca3af',
                marginBottom: 32
              }}>
                创建于 {new Date(card.createdAt).toLocaleDateString('zh-CN')}
                {card.updatedAt !== card.createdAt && (
                  <> · 更新于 {new Date(card.updatedAt).toLocaleDateString('zh-CN')}</>
                )}
              </p>

              <div
                className="markdown-body"
                style={{ fontSize: 15 }}
                dangerouslySetInnerHTML={{ __html: marked.parse(card.content) as string }}
              />
            </>
          )}
        </div>

        <aside style={{
          width: 280,
          padding: 32,
          flex: '0 0 280px'
        }}>
          <h3 style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#374151',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: config.color
            }} />
            同分类推荐
          </h3>

          {relatedCards.length === 0 ? (
            <p style={{
              fontSize: 13,
              color: '#9ca3af',
              padding: '16px 0'
            }}>
              暂无相关卡片
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {relatedCards.map((rc) => {
                const rcConfig = CATEGORY_CONFIG[rc.category];
                return (
                  <div
                    key={rc.id}
                    onClick={() => navigate(`/card/${rc.id}`)}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s, background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{
                        padding: '1px 8px',
                        borderRadius: 3,
                        background: rcConfig.color,
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700
                      }}>
                        {rcConfig.label}
                      </span>
                      <div style={{ display: 'flex', gap: 1 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            style={{
                              fontSize: 10,
                              color: n <= rc.difficulty ? '#f59e0b' : '#e5e7eb'
                            }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#374151',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {rc.title}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
