import { useEffect, useState } from 'react';
import { FiPlus, FiLayers } from 'react-icons/fi';
import Canvas from './Canvas';
import InspirationModal from './InspirationModal';
import TagPanel from './TagPanel';
import { useStore } from './store';
import type { Inspiration as InspirationType, TagColor } from './types';
import { TAG_COLORS } from './types';

function App() {
  const {
    inspirations,
    connections,
    selectedTags,
    isModalOpen,
    selectedInspirationId,
    isTagPanelOpen,
    connectingFromId,
    setInspirations,
    setConnections,
    addInspiration,
    openModal,
    closeModal,
    setTagPanelOpen,
    cancelConnecting
  } = useStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState<TagColor>('blue');
  const [newLinks, setNewLinks] = useState('');

  const selectedInspiration = inspirations.find(
    (i) => i.id === selectedInspirationId
  ) || null;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/inspirations');
      const data = await res.json();
      setInspirations(data.inspirations || []);
      setConnections(data.connections || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const handleAddInspiration = async () => {
    if (!newContent.trim()) return;
    const linksArr = newLinks
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    try {
      const res = await fetch('/api/inspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent.trim(),
          tag: newTag,
          links: linksArr
        })
      });
      const data: InspirationType = await res.json();
      addInspiration(data);
      setNewContent('');
      setNewLinks('');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add inspiration:', err);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (
      !(e.target as HTMLElement).closest('.tag-panel') &&
      !(e.target as HTMLElement).closest('.context-menu')
    ) {
      if (isTagPanelOpen) setTagPanelOpen(false);
      if (connectingFromId) cancelConnecting();
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        background:
          'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}
      onClick={handleCanvasClick}
    >
      <nav
        style={{
          height: 56,
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(22, 33, 62, 0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(233, 69, 96, 0.15)',
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #3498db 0%, #e94560 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: 1
            }}
          >
            灵感胶囊
          </h1>
          <button
            className="tag-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setTagPanelOpen(!isTagPanelOpen);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              border:
                selectedTags.length > 0
                  ? '1px solid rgba(233, 69, 96, 0.5)'
                  : '1px solid rgba(160, 160, 176, 0.2)',
              background:
                selectedTags.length > 0
                  ? 'rgba(233, 69, 96, 0.1)'
                  : 'rgba(160, 160, 176, 0.05)',
              color: selectedTags.length > 0 ? '#e94560' : '#a0a0b0',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s ease'
            }}
          >
            <FiLayers size={14} />
            <span>标签筛选</span>
            {selectedTags.length > 0 && (
              <span
                style={{
                  background: '#e94560',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '1px 6px',
                  fontSize: 11,
                  fontWeight: 600
                }}
              >
                {selectedTags.length}
              </span>
            )}
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsAddModalOpen(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            borderRadius: 10,
            border: 'none',
            background:
              'linear-gradient(135deg, #e94560 0%, #c23a51 100%)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(233, 69, 96, 0.3)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow =
              '0 6px 20px rgba(233, 69, 96, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow =
              '0 4px 15px rgba(233, 69, 96, 0.3)';
          }}
        >
          <FiPlus size={16} />
          添加灵感
        </button>
      </nav>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <TagPanel />
        <Canvas />
      </div>

      <div
        style={{
          height: 36,
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(22, 33, 62, 0.85)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(233, 69, 96, 0.1)',
          fontSize: 12,
          color: '#a0a0b0',
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span>
            气泡总数：
            <span style={{ color: '#e94560', fontWeight: 600 }}>
              {inspirations.length}
            </span>
          </span>
          <span>
            关联数：
            <span style={{ color: '#3498db', fontWeight: 600 }}>
              {connections.length}
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>滚轮缩放 · 拖拽平移 · 点击气泡查看</span>
          <span style={{ color: '#888' }}>|</span>
          <span>右键气泡 · 关联到...</span>
          {connectingFromId && (
            <span style={{ color: '#e94560', marginLeft: 8 }}>
              → 请点击目标气泡创建关联
            </span>
          )}
        </div>
      </div>

      {isModalOpen && selectedInspiration && (
        <InspirationModal
          inspiration={selectedInspiration}
          onClose={closeModal}
        />
      )}

      {isAddModalOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 10, 25, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div
            style={{
              width: 520,
              maxWidth: '90vw',
              background: '#16213e',
              borderRadius: 16,
              border: '1px solid rgba(233, 69, 96, 0.15)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(233, 69, 96, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#fff'
                }}
              >
                捕捉新灵感
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a0a0b0',
                  cursor: 'pointer',
                  fontSize: 20,
                  padding: 4,
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#a0a0b0',
                    marginBottom: 8,
                    fontWeight: 500
                  }}
                >
                  灵感内容
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="把你脑海里的想法写下来..."
                  autoFocus
                  style={{
                    width: '100%',
                    minHeight: 100,
                    padding: 12,
                    borderRadius: 10,
                    border: '1px solid rgba(160,160,176,0.15)',
                    background: 'rgba(26, 26, 46, 0.6)',
                    color: '#fff',
                    fontSize: 14,
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = 'rgba(233, 69, 96, 0.4)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor =
                      'rgba(160,160,176,0.15)')
                  }
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#a0a0b0',
                    marginBottom: 8,
                    fontWeight: 500
                  }}
                >
                  选择标签
                </label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(Object.keys(TAG_COLORS) as TagColor[]).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setNewTag(tag)}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        border:
                          newTag === tag
                            ? `3px solid #fff`
                            : '3px solid transparent',
                        background: TAG_COLORS[tag].bg,
                        cursor: 'pointer',
                        boxShadow:
                          newTag === tag ? TAG_COLORS[tag].glow + ' 0 0 0 4px' : 'none',
                        transition: 'all 0.15s ease',
                        transform: newTag === tag ? 'scale(1.1)' : 'scale(1)'
                      }}
                      title={TAG_COLORS[tag].name}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 13,
                    color: '#a0a0b0',
                    marginBottom: 8,
                    fontWeight: 500
                  }}
                >
                  关联链接（可选，每行一个）
                </label>
                <textarea
                  value={newLinks}
                  onChange={(e) => setNewLinks(e.target.value)}
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
                    fontFamily: 'inherit',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = 'rgba(233, 69, 96, 0.4)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor =
                      'rgba(160,160,176,0.15)')
                  }
                />
              </div>
            </div>

            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(233, 69, 96, 0.1)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12
              }}
            >
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: '1px solid rgba(160,160,176,0.2)',
                  background: 'transparent',
                  color: '#a0a0b0',
                  cursor: 'pointer',
                  fontSize: 13,
                  transition: 'all 0.15s ease'
                }}
              >
                取消
              </button>
              <button
                onClick={handleAddInspiration}
                disabled={!newContent.trim()}
                style={{
                  padding: '8px 22px',
                  borderRadius: 8,
                  border: 'none',
                  background: !newContent.trim()
                    ? 'rgba(233, 69, 96, 0.3)'
                    : 'linear-gradient(135deg, #e94560 0%, #c23a51 100%)',
                  color: '#fff',
                  cursor: !newContent.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.15s ease'
                }}
              >
                保存
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default App;
