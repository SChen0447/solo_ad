import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { CardList } from './components/CardList';
import { Board } from './components/Board';
import { useCollection } from './hooks/useCollection';
import { useBoard } from './hooks/useBoard';
import type { TagColor } from './types';

type ViewType = 'collection' | 'board';

const TAG_COLOR_MAP: Record<TagColor, { bg: string; text: string }> = {
  red: { bg: '#fee2e2', text: '#dc2626' },
  orange: { bg: '#ffedd5', text: '#ea580c' },
  green: { bg: '#dcfce7', text: '#16a34a' },
  blue: { bg: '#dbeafe', text: '#2563eb' },
  purple: { bg: '#f3e8ff', text: '#9333ea' },
  gray: { bg: '#f3f4f6', text: '#4b5563' },
};

function AppContent() {
  const [activeView, setActiveView] = useState<ViewType>('collection');
  const [newExcerptContent, setNewExcerptContent] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [newWorkbenchName, setNewWorkbenchName] = useState('');
  const [showWorkbenchInput, setShowWorkbenchInput] = useState(false);

  const {
    filteredExcerpts,
    allTags,
    addExcerpt,
    setSearchQuery,
    setSelectedTag,
    selectedTagId,
    searchQuery,
    debouncedQuery,
  } = useCollection();

  const {
    workbenches,
    activeWorkbenchId,
    setActiveWorkbench,
    addWorkbench,
  } = useBoard();

  const handleAddExcerpt = () => {
    if (newExcerptContent.trim()) {
      addExcerpt(newExcerptContent.trim());
      setNewExcerptContent('');
      setShowAddInput(false);
    }
  };

  const handleAddWorkbench = () => {
    if (newWorkbenchName.trim()) {
      addWorkbench(newWorkbenchName.trim());
      setNewWorkbenchName('');
      setShowWorkbenchInput(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      addExcerpt(text);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      style={{
        minHeight: '100vh',
        backgroundColor: '#faf9f6',
      }}
    >
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#faf9f6',
        borderBottom: '1px solid #f0f0f0',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px 24px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#1e3a5f',
            }}>
              ✨ 灵感工作台
            </h1>

            <button
              onClick={() => setShowAddInput(!showAddInput)}
              style={{
                padding: '8px 20px',
                backgroundColor: '#1e3a5f',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              + 新建摘录
            </button>
          </div>

          {showAddInput && (
            <div style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #f0f0f0',
            }}>
              <textarea
                value={newExcerptContent}
                onChange={e => setNewExcerptContent(e.target.value)}
                placeholder="粘贴内容或输入文字...（支持自动检测文本、图片链接、视频链接）"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  marginBottom: '12px',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleAddExcerpt();
                  }
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowAddInput(false)}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleAddExcerpt}
                  disabled={!newExcerptContent.trim()}
                  style={{
                    padding: '6px 16px',
                    backgroundColor: '#1e3a5f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: newExcerptContent.trim() ? 'pointer' : 'not-allowed',
                    opacity: newExcerptContent.trim() ? 1 : 0.5,
                  }}
                >
                  保存
                </button>
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div style={{
              position: 'relative',
              flex: 1,
              minWidth: '240px',
              maxWidth: '400px',
            }}>
              <span style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                fontSize: '14px',
              }}>
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索标题、内容、标签..."
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#fff',
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '4px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '4px',
              border: '1px solid #e5e7eb',
            }}>
              <button
                onClick={() => setActiveView('collection')}
                style={{
                  padding: '6px 16px',
                  backgroundColor: activeView === 'collection' ? '#1e3a5f' : 'transparent',
                  color: activeView === 'collection' ? '#fff' : '#6b7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                摘录列表
              </button>
              <button
                onClick={() => setActiveView('board')}
                style={{
                  padding: '6px 16px',
                  backgroundColor: activeView === 'board' ? '#1e3a5f' : 'transparent',
                  color: activeView === 'board' ? '#fff' : '#6b7280',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                看板视图
              </button>
            </div>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
      }}>
        {activeView === 'board' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}>
            {workbenches.map(wb => (
              <button
                key={wb.id}
                onClick={() => setActiveWorkbench(wb.id)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: activeWorkbenchId === wb.id ? '#1e3a5f' : '#fff',
                  color: activeWorkbenchId === wb.id ? '#fff' : '#4b5563',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {wb.name}
              </button>
            ))}

            {showWorkbenchInput ? (
              <input
                type="text"
                value={newWorkbenchName}
                onChange={e => setNewWorkbenchName(e.target.value)}
                placeholder="工作台名称"
                style={{
                  padding: '8px 12px',
                  border: '1px solid #1e3a5f',
                  borderRadius: '8px',
                  fontSize: '13px',
                  width: '140px',
                }}
                onKeyDown={e => e.key === 'Enter' && handleAddWorkbench()}
                onBlur={handleAddWorkbench}
                autoFocus
              />
            ) : (
              <button
                onClick={() => setShowWorkbenchInput(true)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: '1px dashed #d1d5db',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                + 新建工作台
              </button>
            )}
          </div>
        )}

        {allTags.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>标签筛选：</span>
            {allTags.map(tag => {
              const colorScheme = TAG_COLOR_MAP[tag.color];
              const isSelected = selectedTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTag(isSelected ? null : tag.id)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '14px',
                    fontSize: '12px',
                    backgroundColor: isSelected ? colorScheme.text : colorScheme.bg,
                    color: isSelected ? '#fff' : colorScheme.text,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: isSelected ? 500 : 400,
                  }}
                >
                  {tag.name}
                </button>
              );
            })}
            {selectedTagId && (
              <button
                onClick={() => setSelectedTag(null)}
                style={{
                  padding: '4px 10px',
                  fontSize: '12px',
                  color: '#9ca3af',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                清除筛选
              </button>
            )}
          </div>
        )}

        {searchQuery && (
          <div style={{
            fontSize: '13px',
            color: '#6b7280',
            marginBottom: '16px',
          }}>
            搜索 "{debouncedQuery}" 的结果：{filteredExcerpts.length} 条
          </div>
        )}

        {activeView === 'collection' ? (
          <CardList excerpts={filteredExcerpts} emptyMessage="暂无摘录，点击右上角新建摘录或直接粘贴内容" />
        ) : (
          <Board />
        )}
      </main>

      <footer style={{
        textAlign: 'center',
        padding: '20px',
        color: '#d1d5db',
        fontSize: '12px',
      }}>
        灵感工作台 · 把碎片变成方案
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
