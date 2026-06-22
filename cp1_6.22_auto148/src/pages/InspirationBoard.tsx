import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Note, Tag } from '../types';
import InspirationCard from '../components/InspirationCard';
import NoteEditor from '../components/NoteEditor';

export const InspirationBoard: React.FC = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [tagToEdit, setTagToEdit] = useState<Tag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [fadeInKey, setFadeInKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (windowWidth < 768) setSidebarOpen(false);
  }, [windowWidth]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [notesRes, tagsRes] = await Promise.all([
        axios.get<Note[]>('/api/notes'),
        axios.get<Tag[]>('/api/tags')
      ]);
      setNotes(notesRes.data);
      setAllTags(tagsRes.data);
      setFilteredNotes(notesRes.data);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      filterNotes();
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, selectedTags, notes]);

  const filterNotes = () => {
    let result = [...notes];
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      result = result.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.content.toLowerCase().includes(query) ||
        (n.tags || []).some(t => t.toLowerCase().includes(query))
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter(n =>
        selectedTags.every(t => (n.tags || []).includes(t))
      );
    }
    setFilteredNotes(result);
    setFadeInKey(k => k + 1);
  };

  const toggleTagSelection = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const handleCreateNote = async (data: { title: string; content: string; tags: string[]; imageUrl: string | null }) => {
    try {
      await axios.post('/api/notes', data);
      setShowEditor(false);
      await loadData();
    } catch (err) {
      console.error('创建笔记失败:', err);
      alert('保存失败，请重试');
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await axios.post('/api/tags', { name: newTagName.trim() });
      setNewTagName('');
      setShowNewTagInput(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || '创建标签失败');
    }
  };

  const handleUpdateTag = async () => {
    if (!tagToEdit || !editTagName.trim()) return;
    try {
      await axios.put(`/api/tags/${tagToEdit.id}`, { name: editTagName.trim() });
      setTagToEdit(null);
      setEditTagName('');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || '更新标签失败');
    }
  };

  const handleDeleteTag = async () => {
    if (!tagToDelete) return;
    try {
      await axios.delete(`/api/tags/${tagToDelete.id}`);
      setSelectedTags(prev => prev.filter(t => t !== tagToDelete.name));
      setTagToDelete(null);
      await loadData();
    } catch (err) {
      console.error('删除标签失败:', err);
    }
  };

  const isMobile = windowWidth < 768;
  const gridCols = isMobile ? 1 : 2;

  const boardStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    background: '#0f172a',
    color: '#e2e8f0'
  };

  const sidebarStyle: React.CSSProperties = {
    width: sidebarOpen && !isMobile ? '260px' : '0px',
    flexShrink: 0,
    background: '#1e293b',
    borderRight: '1px solid #334155',
    overflow: 'hidden',
    transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    position: isMobile ? 'fixed' : 'sticky',
    top: 0,
    height: '100vh',
    zIndex: 100
  };

  return (
    <div style={boardStyle}>
      {isMobile && sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 99
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside style={sidebarStyle}>
        <div style={{ width: '260px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #334155',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px'
            }}>💡</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>灵感收集板</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{notes.length} 条灵感</div>
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '12px'
            }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                标签管理
              </span>
              <button
                onClick={() => { setShowNewTagInput(!showNewTagInput); setTagToEdit(null); }}
                style={{
                  width: '26px', height: '26px', borderRadius: '7px',
                  background: '#6366f1', border: 'none', color: '#fff',
                  cursor: 'pointer', fontSize: '16px', lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 150ms'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >+</button>
            </div>

            {showNewTagInput && (
              <div style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
                <input
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder="标签名..."
                  style={{
                    flex: 1, padding: '7px 10px', background: '#0f172a',
                    border: '1px solid #475569', borderRadius: '7px',
                    color: '#f1f5f9', fontSize: '13px', outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                  autoFocus
                />
                <button onClick={handleCreateTag} style={{
                  padding: '0 10px', background: '#22c55e', border: 'none',
                  borderRadius: '7px', color: '#fff', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600, fontFamily: 'inherit'
                }}>✓</button>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {allTags.map(tag => (
                <div key={tag.id}>
                  {tagToEdit?.id === tag.id ? (
                    <div style={{ display: 'flex', gap: '6px', padding: '4px' }}>
                      <input
                        value={editTagName}
                        onChange={e => setEditTagName(e.target.value)}
                        style={{
                          flex: 1, padding: '6px 10px', background: '#0f172a',
                          border: '1px solid #475569', borderRadius: '7px',
                          color: '#f1f5f9', fontSize: '12px', outline: 'none',
                          fontFamily: 'inherit'
                        }}
                        onKeyDown={e => e.key === 'Enter' && handleUpdateTag()}
                        autoFocus
                      />
                      <button onClick={handleUpdateTag} style={{
                        padding: '0 8px', background: '#22c55e', border: 'none',
                        borderRadius: '6px', color: '#fff', cursor: 'pointer',
                        fontSize: '11px', fontFamily: 'inherit'
                      }}>✓</button>
                      <button onClick={() => setTagToEdit(null)} style={{
                        padding: '0 8px', background: '#475569', border: 'none',
                        borderRadius: '6px', color: '#fff', cursor: 'pointer',
                        fontSize: '11px', fontFamily: 'inherit'
                      }}>✕</button>
                    </div>
                  ) : (
                    <div
                      onClick={() => toggleTagSelection(tag.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 10px', borderRadius: '8px',
                        cursor: 'pointer',
                        background: selectedTags.includes(tag.name)
                          ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        border: selectedTags.includes(tag.name)
                          ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                        transition: 'all 150ms'
                      }}
                      onMouseEnter={e => {
                        if (!selectedTags.includes(tag.name)) {
                          e.currentTarget.style.background = '#334155';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!selectedTags.includes(tag.name)) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <span style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: tag.color, flexShrink: 0,
                        boxShadow: `0 0 8px ${tag.color}50`
                      }} />
                      <span style={{
                        flex: 1, fontSize: '13px', color: '#cbd5e1',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>#{tag.name}</span>
                      <span style={{
                        fontSize: '11px', color: '#64748b',
                        background: '#334155', padding: '2px 7px',
                        borderRadius: '10px', fontWeight: 600
                      }}>{tag.count || 0}</span>
                      <button
                        onClick={e => { e.stopPropagation(); setTagToEdit(tag); setEditTagName(tag.name); setShowNewTagInput(false); }}
                        style={{
                          background: 'transparent', border: 'none', color: '#64748b',
                          cursor: 'pointer', fontSize: '13px', padding: '2px 4px',
                          borderRadius: '4px', fontFamily: 'inherit'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#38bdf8'; e.currentTarget.style.background = '#334155'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
                      >✎</button>
                      <button
                        onClick={e => { e.stopPropagation(); setTagToDelete(tag); }}
                        style={{
                          background: 'transparent', border: 'none', color: '#64748b',
                          cursor: 'pointer', fontSize: '13px', padding: '2px 4px',
                          borderRadius: '4px', fontFamily: 'inherit'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#334155'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = 'transparent'; }}
                      >🗑</button>
                    </div>
                  )}
                </div>
              ))}
              {allTags.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  暂无标签，点击 + 创建
                </div>
              )}
              {allTags.length >= 20 && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#422006', borderRadius: '8px', color: '#fbbf24', fontSize: '11px', textAlign: 'center' }}>
                  已达20个标签上限
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          padding: isMobile ? '16px' : '20px 32px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e293b',
          position: 'sticky', top: 0, zIndex: 50
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: '#1e293b', border: '1px solid #334155',
                color: '#e2e8f0', cursor: 'pointer', fontSize: '18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 150ms'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.borderColor = '#475569'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#334155'; }}
            >{isMobile ? '☰' : (sidebarOpen ? '◀' : '▶')}</button>

            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="🔍 搜索灵感标题、内容或标签..."
                style={{
                  width: '100%', padding: '12px 16px 12px 42px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px', color: '#f1f5f9',
                  fontSize: '14px', outline: 'none',
                  transition: 'all 150ms',
                  fontFamily: 'inherit'
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = '#6366f1';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)';
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = '#334155';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <span style={{
                position: 'absolute', left: '14px', top: '50%',
                transform: 'translateY(-50%)', fontSize: '16px',
                opacity: 0.6, pointerEvents: 'none'
              }}>🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#334155', border: 'none',
                    width: '22px', height: '22px', borderRadius: '50%',
                    color: '#94a3b8', cursor: 'pointer', fontSize: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'inherit'
                  }}
                >✕</button>
              )}
            </div>

            {!isMobile ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => navigate('/board')}
                  style={{
                    padding: '10px 18px', borderRadius: '10px',
                    background: '#6366f1', border: 'none',
                    color: '#fff', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 150ms',
                    fontFamily: 'inherit', display: 'flex',
                    alignItems: 'center', gap: '6px'
                  }}
                >📋 灵感板</button>
                <button
                  onClick={() => navigate('/graph')}
                  style={{
                    padding: '10px 18px', borderRadius: '10px',
                    background: '#1e293b', border: '1px solid #334155',
                    color: '#e2e8f0', fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer', transition: 'all 150ms',
                    fontFamily: 'inherit', display: 'flex',
                    alignItems: 'center', gap: '6px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.borderColor = '#475569'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#334155'; }}
                >🕸 关联图</button>
              </div>
            ) : (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: '#1e293b', border: '1px solid #334155',
                  color: '#e2e8f0', cursor: 'pointer', fontSize: '18px',
                  fontFamily: 'inherit'
                }}
              >⋮</button>
            )}
          </div>

          {isMobile && mobileMenuOpen && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button onClick={() => { navigate('/board'); setMobileMenuOpen(false); }} style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                background: '#6366f1', border: 'none',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit'
              }}>📋 灵感板</button>
              <button onClick={() => { navigate('/graph'); setMobileMenuOpen(false); }} style={{
                flex: 1, padding: '10px', borderRadius: '10px',
                background: '#1e293b', border: '1px solid #334155',
                color: '#e2e8f0', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit'
              }}>🕸 关联图</button>
            </div>
          )}

          {selectedTags.length > 0 && (
            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#64748b', marginRight: '4px' }}>筛选标签:</span>
              {selectedTags.map(t => (
                <span key={t} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '4px 8px 4px 12px', background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)', color: '#93c5fd',
                  borderRadius: '999px', fontSize: '12px', fontWeight: 500
                }}>
                  #{t}
                  <button onClick={() => toggleTagSelection(t)} style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.15)', border: 'none',
                    color: '#93c5fd', cursor: 'pointer', fontSize: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'inherit', padding: 0
                  }}>✕</button>
                </span>
              ))}
              <button onClick={() => setSelectedTags([])} style={{
                padding: '4px 10px', background: 'transparent',
                border: '1px solid #475569', color: '#94a3b8',
                borderRadius: '999px', fontSize: '11px', cursor: 'pointer',
                fontFamily: 'inherit'
              }}>清除全部</button>
            </div>
          )}
        </header>

        <main style={{
          flex: 1, padding: isMobile ? '16px' : '28px 32px 120px',
          overflow: 'auto'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
              <div style={{
                width: '40px', height: '40px', border: '3px solid #334155',
                borderTopColor: '#6366f1', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '16px',
              animation: 'fadeIn 400ms ease'
            }}>
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '56px', border: '1px dashed #475569'
              }}>🔍</div>
              <h3 style={{ fontSize: '20px', color: '#e2e8f0', fontWeight: 600 }}>
                {notes.length === 0 ? '还没有灵感笔记' : '没有匹配的灵感'}
              </h3>
              <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '360px', lineHeight: 1.6 }}>
                {notes.length === 0
                  ? '点击右下角的浮动按钮，记录你的第一个灵感吧！每一个想法都值得被珍藏。'
                  : '尝试调整搜索关键词或清除部分标签筛选条件，也许灵感就在那里。'}
              </p>
              {notes.length === 0 && (
                <button
                  onClick={() => setShowEditor(true)}
                  style={{
                    marginTop: '8px', padding: '12px 28px',
                    background: 'linear-gradient(135deg, #6366f1, #38bdf8)',
                    border: 'none', borderRadius: '10px', color: '#fff',
                    fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(99,102,241,0.3)'
                  }}
                >✨ 记录第一个灵感</button>
              )}
            </div>
          ) : (
            <div key={fadeInKey} style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${gridCols}, minmax(280px, 1fr))`,
              gap: isMobile ? '16px' : '24px',
              justifyItems: 'center',
              animation: 'fadeIn 400ms ease',
              maxWidth: isMobile ? '100%' : '1200px',
              margin: '0 auto'
            }}>
              {filteredNotes.map((note) => (
                <InspirationCard
                  key={note.id}
                  note={note}
                  onClick={setSelectedNote}
                  style={{ width: '100%', maxWidth: '360px' }}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <button
        onClick={() => setShowEditor(true)}
        style={{
          position: 'fixed', right: isMobile ? '20px' : '36px',
          bottom: isMobile ? '24px' : '36px',
          width: '56px', height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          border: 'none', color: '#fff',
          fontSize: '28px',
          cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(99, 102, 241, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset',
          zIndex: 90,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms',
          animation: 'floatIn 300ms cubic-bezier(0.4, 0, 0.2, 1) 200ms both'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 36px rgba(99, 102, 241, 0.65), 0 0 0 1px rgba(255,255,255,0.15) inset';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(99, 102, 241, 0.5), 0 0 0 1px rgba(255,255,255,0.1) inset';
        }}
      >
        +
      </button>

      {showEditor && (
        <NoteEditor
          onSubmit={handleCreateNote}
          onClose={() => setShowEditor(false)}
          availableTags={allTags}
        />
      )}

      {selectedNote && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.9)',
            backdropFilter: 'blur(8px)', zIndex: 1100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', animation: 'fadeIn 250ms ease'
          }}
          onClick={() => setSelectedNote(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1e293b', borderRadius: '20px',
              border: '1px solid #334155',
              width: '100%', maxWidth: '640px', maxHeight: '85vh',
              overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              animation: 'scaleIn 300ms cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {selectedNote.imageUrl && (
              <img src={selectedNote.imageUrl} alt={selectedNote.title}
                onError={e => (e.currentTarget.style.display = 'none')}
                style={{
                  width: '100%', maxHeight: '260px', objectFit: 'cover',
                  borderRadius: '20px 20px 0 0', display: 'block'
                }}
              />
            )}
            <div style={{ padding: '28px' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', gap: '16px', marginBottom: '16px'
              }}>
                <h2 style={{
                  fontSize: '22px', fontWeight: 700, color: '#f1f5f9',
                  lineHeight: 1.4
                }}>{selectedNote.title}</h2>
                <button
                  onClick={() => setSelectedNote(null)}
                  style={{
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: '#334155', border: 'none',
                    color: '#94a3b8', cursor: 'pointer',
                    fontSize: '20px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'inherit', transition: 'all 150ms'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#475569'; e.currentTarget.style.color = '#f1f5f9'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#94a3b8'; }}
                >×</button>
              </div>
              <div style={{
                fontSize: '12px', color: '#64748b', marginBottom: '18px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <span>🕐</span>
                {new Date(selectedNote.createdAt).toLocaleString('zh-CN', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '8px',
                  marginBottom: '20px'
                }}>
                  {selectedNote.tags.map((t, i) => (
                    <span key={i} onClick={() => { toggleTagSelection(t); setSelectedNote(null); }}
                      style={{
                        padding: '5px 14px', background: '#3b82f6',
                        color: '#fff', borderRadius: '999px',
                        fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                        transition: 'transform 150ms'
                      }}
                      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >#{t}</span>
                  ))}
                </div>
              )}
              <div style={{
                fontSize: '15px', color: '#cbd5e1', lineHeight: 1.8,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word'
              }}>{selectedNote.content}</div>
            </div>
          </div>
        </div>
      )}

      {tagToDelete && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)',
          backdropFilter: 'blur(4px)', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', animation: 'fadeIn 200ms ease'
        }} onClick={() => setTagToDelete(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#0f172a', borderRadius: '16px',
            border: '1px solid #475569', padding: '28px',
            width: '100%', maxWidth: '380px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            animation: 'scaleIn 250ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px', margin: '0 auto 16px'
            }}>⚠️</div>
            <h3 style={{
              fontSize: '18px', fontWeight: 600, color: '#f1f5f9',
              textAlign: 'center', marginBottom: '8px'
            }}>删除标签</h3>
            <p style={{
              fontSize: '14px', color: '#94a3b8', textAlign: 'center',
              lineHeight: 1.6, marginBottom: '24px'
            }}>
              确定要删除标签 <span style={{
                color: '#ef4444', fontWeight: 600
              }}>#{tagToDelete.name}</span> 吗？
              <br />所有笔记中的该标签将被移除。
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setTagToDelete(null)} style={{
                flex: 1, padding: '11px', background: '#334155',
                border: 'none', borderRadius: '10px',
                color: '#e2e8f0', fontSize: '14px',
                fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'background 150ms'
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                onMouseLeave={e => e.currentTarget.style.background = '#334155'}
              >取消</button>
              <button onClick={handleDeleteTag} style={{
                flex: 1, padding: '11px', background: '#ef4444',
                border: 'none', borderRadius: '10px',
                color: '#fff', fontSize: '14px',
                fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 150ms',
                boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(239,68,68,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(239,68,68,0.3)'; }}
              >确认删除</button>
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
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: scale(0.5) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default InspirationBoard;
