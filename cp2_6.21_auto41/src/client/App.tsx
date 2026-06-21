import React, { useState, useMemo, useCallback } from 'react';
import Canvas from './Canvas';
import FilterControl from './FilterControl';
import Gallery from './Gallery';
import {
  Layer,
  FilterParams,
  TextStyle,
  CollageData,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_BG,
  DEFAULT_FILTERS,
  DEFAULT_TEXT_STYLE,
} from './types';

type Tab = 'editor' | 'mine' | 'community';

const Toast: React.FC<{ message: string | null; type: 'success' | 'error' }> = ({
  message,
  type,
}) => {
  if (!message) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        borderRadius: 8,
        background: type === 'success' ? '#10B981' : '#EF4444',
        color: 'white',
        fontSize: 14,
        fontWeight: 500,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        zIndex: 999999,
        animation: 'toastIn 0.3s ease, toastOut 0.3s ease 0.2s forwards',
      }}
    >
      {message}
    </div>
  );
};

const PublishModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onPublish: (name: string, description: string) => Promise<void>;
}> = ({ open, onClose, onPublish }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setError('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [open]);

  React.useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入作品名称');
      return;
    }
    if (name.length > 30) {
      setError('作品名称最多30个字符');
      return;
    }
    if (description.length > 200) {
      setError('描述最多200个字符');
      return;
    }
    try {
      setSubmitting(true);
      await onPublish(name.trim(), description.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 1000000,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 400,
          background: '#1A1A2E',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          padding: 32,
          animation: 'slideInFromRight 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <h2
          style={{
            fontSize: 22,
            color: '#E0E0E0',
            margin: 0,
            marginBottom: 8,
            fontWeight: 700,
          }}
        >
          🎨 发布作品
        </h2>
        <p style={{ fontSize: 13, color: '#888', margin: 0, marginBottom: 28 }}>
          完成创作后，让更多人欣赏你的作品
        </p>

        <label
          style={{
            fontSize: 13,
            color: '#E0E0E0',
            marginBottom: 8,
            display: 'block',
            fontWeight: 500,
          }}
        >
          作品名称 <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入作品名称（最多30字）"
          maxLength={30}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#2D2D44',
            color: '#E0E0E0',
            border: '1px solid ' + (error && !name ? '#EF4444' : '#444'),
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 20,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = error && !name ? '#EF4444' : '#444')
          }
        />
        <div
          style={{
            marginTop: -16,
            marginBottom: 20,
            textAlign: 'right',
            fontSize: 11,
            color: '#666',
          }}
        >
          {name.length}/30
        </div>

        <label
          style={{
            fontSize: 13,
            color: '#E0E0E0',
            marginBottom: 8,
            display: 'block',
            fontWeight: 500,
          }}
        >
          作品描述
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述一下你的创作灵感（选填，最多200字）"
          maxLength={200}
          rows={5}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: '#2D2D44',
            color: '#E0E0E0',
            border: '1px solid #444',
            borderRadius: 8,
            fontSize: 14,
            marginBottom: 20,
            outline: 'none',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'inherit',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#3B82F6')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#444')}
        />
        <div
          style={{
            marginTop: -16,
            marginBottom: 20,
            textAlign: 'right',
            fontSize: 11,
            color: '#666',
          }}
        >
          {description.length}/200
        </div>

        {error && (
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#EF4444',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 20,
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              padding: '12px',
              background: '#2D2D44',
              color: '#E0E0E0',
              border: '1px solid #444',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) =>
              !submitting && (e.currentTarget.style.filter = 'brightness(1.1)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            取消
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 1,
              padding: '12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) =>
              !submitting && (e.currentTarget.style.filter = 'brightness(1.1)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            {submitting ? '发布中...' : '🚀 发布'}
          </button>
        </div>
      </form>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes toastIn {
          from { transform: translate(-50%, -30px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes toastOut {
          to { transform: translate(-50%, -30px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [filters, setFilters] = useState<FilterParams>({ ...DEFAULT_FILTERS });
  const [textStyle, setTextStyle] = useState<TextStyle>({ ...DEFAULT_TEXT_STYLE });
  const [addImageMode, setAddImageMode] = useState(false);
  const [addTextMode, setAddTextMode] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(true);

  const collageData = useMemo<CollageData>(
    () => ({
      layers,
      canvasWidth: CANVAS_WIDTH,
      canvasHeight: CANVAS_HEIGHT,
      background: CANVAS_BG,
    }),
    [layers]
  );

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;
  const selectedLayerType: 'image' | 'text' | null = selectedLayer?.type || null;

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 500);
  }, []);

  const handlePublish = async (name: string, description: string) => {
    if (layers.length === 0) {
      throw new Error('请至少添加一个图层');
    }
    const res = await fetch('/api/collages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        author: '匿名',
        layers,
        canvasWidth: CANVAS_WIDTH,
        canvasHeight: CANVAS_HEIGHT,
        background: CANVAS_BG,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || '发布失败');
    }
    showToast('✨ 发布成功！');
    setLayers([]);
    setSelectedLayerId(null);
  };

  const handleModeReset = () => {
    setAddImageMode(false);
    setAddTextMode(false);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#1A1A2E',
        color: '#E0E0E0',
        overflow: 'hidden',
      }}
    >
      <Toast message={toast?.message || null} type={toast?.type || 'success'} />
      <PublishModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublish={handlePublish}
      />

      <header
        style={{
          height: 60,
          minHeight: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            🖼️
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#E0E0E0' }}>
              拼贴画工坊
            </div>
            <div style={{ fontSize: 11, color: '#666' }}>Collage Creator</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              background: '#2D2D44',
              borderRadius: 10,
              padding: 4,
              gap: 4,
            }}
          >
            {[
              {
                key: 'addImage',
                icon: '🖼️',
                label: '添加图片',
                active: addImageMode,
                onClick: () => {
                  setAddImageMode(!addImageMode);
                  setAddTextMode(false);
                },
              },
              {
                key: 'addText',
                icon: '📝',
                label: '添加文字',
                active: addTextMode,
                onClick: () => {
                  setAddTextMode(!addTextMode);
                  setAddImageMode(false);
                },
              },
              {
                key: 'clear',
                icon: '🗑️',
                label: '清空画布',
                active: false,
                onClick: () => {
                  if (layers.length > 0 && confirm('确定要清空画布吗？')) {
                    setLayers([]);
                    setSelectedLayerId(null);
                  }
                },
              },
            ].map((tool) => (
              <button
                key={tool.key}
                onClick={tool.onClick}
                title={tool.label}
                style={{
                  width: 40,
                  height: 40,
                  border: 'none',
                  borderRadius: 8,
                  background: tool.active ? '#3B82F6' : 'transparent',
                  color: tool.active ? 'white' : '#E0E0E0',
                  cursor: 'pointer',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!tool.active) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!tool.active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.filter = 'brightness(1)';
                  }
                }}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (layers.length === 0) {
                showToast('请先添加内容再发布', 'error');
                return;
              }
              setPublishOpen(true);
            }}
            style={{
              padding: '10px 20px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            💾 保存发布
          </button>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          paddingTop: activeTab === 'editor' ? 20 : 0,
          paddingLeft: activeTab === 'editor' ? 20 : 0,
          paddingBottom: activeTab === 'editor' ? 20 : 0,
        }}
      >
        {activeTab === 'editor' && (
          <>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                overflow: 'auto',
                padding: '20px',
                paddingRight: window.innerWidth < 768 ? 0 : '20px',
                boxSizing: 'border-box',
              }}
            >
              <Canvas
                initialData={collageData}
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
                onLayersChange={setLayers}
                filters={filters}
                onFiltersChange={setFilters}
                textStyle={textStyle}
                onTextStyleChange={setTextStyle}
                addImageMode={addImageMode}
                addTextMode={addTextMode}
                onModeReset={handleModeReset}
              />
            </div>
            <FilterControl
              filters={filters}
              onFiltersChange={setFilters}
              textStyle={textStyle}
              onTextStyleChange={setTextStyle}
              selectedLayerType={selectedLayerType}
              isMobileCollapsed={filterPanelCollapsed}
              onToggleMobile={() => setFilterPanelCollapsed(!filterPanelCollapsed)}
            />
          </>
        )}

        {activeTab === 'community' && <Gallery isMyWorks={false} />}
        {activeTab === 'mine' && <Gallery isMyWorks={true} />}
      </div>

      <nav
        style={{
          height: 64,
          minHeight: 64,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(45, 45, 68, 0.95)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          zIndex: 100,
        }}
      >
        {[
          { key: 'editor' as Tab, label: '创作', icon: '🎨' },
          { key: 'mine' as Tab, label: '我的作品', icon: '📁' },
          { key: 'community' as Tab, label: '社区画廊', icon: '🌍' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: activeTab === tab.key ? '#3B82F6' : '#888',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: activeTab === tab.key ? 600 : 500,
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.color = '#E0E0E0';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.color = '#888';
                e.currentTarget.style.filter = 'brightness(1)';
              }
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
            {tab.label}
            {activeTab === tab.key && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 40,
                  height: 3,
                  background: '#3B82F6',
                  borderRadius: '0 0 3px 3px',
                }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
