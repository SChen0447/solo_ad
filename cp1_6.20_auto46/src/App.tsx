import React, { useEffect, useRef, useState } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import Canvas from './components/Canvas';
import ColorPicker from './components/ColorPicker';
import FramesPanel from './components/FramesPanel';
import DiscoveryGrid from './components/DiscoveryGrid';
import { usePixel, RECOMMENDED_TAGS, Artwork, PixelFrame } from './store/pixelStore';
import { saveArtwork, getArtwork, createArtwork } from './utils/db';
import { exportToJSON, downloadJSON, downloadGifSimulation } from './utils/export';

const PaintPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = usePixel();
  const { frames, currentFrameIndex, isPlaying, playbackSpeed } = state;
  const [isMobile, setIsMobile] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      const currentFrame = frames[currentFrameIndex];
      const delay = currentFrame ? currentFrame.delay / playbackSpeed : 100;
      
      playIntervalRef.current = window.setTimeout(() => {
        dispatch({ type: 'NEXT_FRAME' });
      }, delay);
    }

    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
  }, [isPlaying, currentFrameIndex, frames, playbackSpeed, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            dispatch({ type: 'REDO' });
          } else {
            dispatch({ type: 'UNDO' });
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          dispatch({ type: 'REDO' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  const togglePlay = () => {
    dispatch({ type: 'SET_PLAYING', playing: !isPlaying });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_PLAYBACK_SPEED', speed: Number(e.target.value) });
  };

  const handleClear = () => {
    if (confirm('确定要清空当前帧吗？')) {
      dispatch({ type: 'CLEAR_CANVAS' });
    }
  };

  const handleUndo = () => {
    dispatch({ type: 'UNDO' });
  };

  const handleRedo = () => {
    dispatch({ type: 'REDO' });
  };

  const handleExportJSON = () => {
    const json = exportToJSON(frames, title || '未命名作品');
    downloadJSON(json, `${title || 'pixel-art'}.json`);
  };

  const handleExportGIF = () => {
    downloadGifSimulation(frames, title || '未命名作品');
  };

  const handleSave = () => {
    setShowSaveModal(true);
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSaveSubmit = async () => {
    if (!title.trim()) {
      alert('请输入作品标题');
      return;
    }
    setSaving(true);
    try {
      const artwork = createArtwork(title.trim(), selectedTags, frames);
      await saveArtwork(artwork);
      setShowSaveModal(false);
      setTitle('');
      setSelectedTags([]);
      alert('保存成功！');
    } catch (error) {
      console.error('Save failed:', error);
      alert('保存失败，请重试');
    }
    setSaving(false);
  };

  const progress = ((currentFrameIndex + 1) / frames.length) * 100;

  if (isMobile) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MobileHeader navigate={navigate} onSave={handleSave} />
        
        <div
          style={{
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <ColorPicker />
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Canvas showFrameInfo={true} />
        </div>

        <div
          style={{
            padding: '12px',
            flexShrink: 0,
            background: 'rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <button
              onClick={togglePlay}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#5865F2',
                color: '#fff',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#7983F5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#5865F2';
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>
                速度: {playbackSpeed.toFixed(1)}x
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={playbackSpeed}
                onChange={handleSpeedChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div
            style={{
              height: '4px',
              background: '#333',
              borderRadius: '2px',
              marginBottom: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: '#5865F2',
                width: `${progress}%`,
                transition: 'width 0.1s ease',
              }}
            />
          </div>

          <FramesPanel horizontal={true} />
        </div>

        {showSaveModal && (
          <SaveModal
            title={title}
            setTitle={setTitle}
            selectedTags={selectedTags}
            toggleTag={toggleTag}
            onSubmit={handleSaveSubmit}
            onClose={() => setShowSaveModal(false)}
            saving={saving}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DesktopHeader onSave={handleSave} />
      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div
          style={{
            width: '220px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flexShrink: 0,
            overflowY: 'auto',
          }}
        >
          <ColorPicker />
          
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #333',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ddd' }}>操作</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleUndo}
                style={buttonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#666'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#444'; }}
              >
                ↶ 撤销 (Ctrl+Z)
              </button>
              <button
                onClick={handleRedo}
                style={buttonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#666'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#444'; }}
              >
                ↷ 重做 (Ctrl+Y)
              </button>
              <button
                onClick={handleClear}
                style={buttonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#666'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#444'; }}
              >
                🗑 清空当前帧
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #333',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ddd' }}>导出</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleExportJSON}
                style={buttonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#666'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#444'; }}
              >
                📄 导出 JSON
              </button>
              <button
                onClick={handleExportGIF}
                style={buttonStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#666'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#444'; }}
              >
                🎬 导出 GIF
              </button>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexShrink: 0,
            }}
          >
            <button
              onClick={togglePlay}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#5865F2',
                color: '#fff',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#7983F5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#5865F2';
              }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '6px',
                  background: '#333',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: '#5865F2',
                    width: `${progress}%`,
                    transition: 'width 0.1s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
                <span>帧 {currentFrameIndex + 1}/{frames.length}</span>
                <span>速度: {playbackSpeed.toFixed(1)}x</span>
              </div>
            </div>

            <div style={{ width: '100px' }}>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={playbackSpeed}
                onChange={handleSpeedChange}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Canvas showFrameInfo={false} />
          </div>
        </div>

        <div style={{ padding: '16px', flexShrink: 0 }}>
          <FramesPanel />
        </div>
      </div>

      {showSaveModal && (
        <SaveModal
          title={title}
          setTitle={setTitle}
          selectedTags={selectedTags}
          toggleTag={toggleTag}
          onSubmit={handleSaveSubmit}
          onClose={() => setShowSaveModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '6px',
  background: '#444',
  color: '#ddd',
  fontSize: '12px',
  textAlign: 'left',
  transition: 'background 0.3s ease',
};

const MobileHeader: React.FC<{ navigate: (path: string) => void; onSave: () => void }> = ({ navigate, onSave }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderBottom: '1px solid #333',
        flexShrink: 0,
      }}
    >
      <span style={{ fontWeight: '600', fontSize: '16px' }}>像素动画工坊</span>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => navigate('/discovery')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: 'transparent',
            color: '#ddd',
            fontSize: '13px',
            transition: 'background 0.3s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          发现
        </button>
        <button
          onClick={onSave}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            background: '#5865F2',
            color: '#fff',
            fontSize: '13px',
            transition: 'background 0.3s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#7983F5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#5865F2'; }}
        >
          保存
        </button>
      </div>
    </div>
  );
};

const DesktopHeader: React.FC<{ onSave: () => void }> = ({ onSave }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '56px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid #333',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span style={{ fontWeight: '700', fontSize: '18px', color: '#fff' }}>🎨 像素动画工坊</span>
        <nav style={{ display: 'flex', gap: '8px' }}>
          <Link
            to="/"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'all 0.3s ease',
              background: 'rgba(88, 101, 242, 0.2)',
              color: '#8B9BFF',
            }}
          >
            绘图
          </Link>
          <Link
            to="/discovery"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              color: '#ddd',
              textDecoration: 'none',
              fontSize: '14px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            发现
          </Link>
        </nav>
      </div>
      <button
        onClick={onSave}
        style={{
          padding: '8px 20px',
          borderRadius: '8px',
          background: '#5865F2',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'background 0.3s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#7983F5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#5865F2'; }}
      >
        保存作品
      </button>
    </div>
  );
};

const SaveModal: React.FC<{
  title: string;
  setTitle: (v: string) => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
}> = ({ title, setTitle, selectedTags, toggleTag, onSubmit, onClose, saving }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#2a2a3e',
          border: '1px solid #444',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '18px', marginBottom: '20px', color: '#fff' }}>保存作品</h2>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '8px' }}>
            作品标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入作品标题"
            maxLength={30}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #444',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.3s ease',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#5865F2'; }}
            onBlur={(e) => { e.target.style.borderColor = '#444'; }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: '#aaa', display: 'block', marginBottom: '8px' }}>
            标签（最多3个）
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {RECOMMENDED_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                disabled={!selectedTags.includes(tag) && selectedTags.length >= 3}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  background: selectedTags.includes(tag) 
                    ? '#5865F2' 
                    : 'rgba(255, 255, 255, 0.08)',
                  color: selectedTags.includes(tag) ? '#fff' : '#ddd',
                  border: '1px solid #444',
                  cursor: !selectedTags.includes(tag) && selectedTags.length >= 3 
                    ? 'not-allowed' 
                    : 'pointer',
                  opacity: !selectedTags.includes(tag) && selectedTags.length >= 3 ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              background: '#444',
              color: '#fff',
              fontSize: '14px',
              transition: 'background 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#666'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#444'; }}
          >
            取消
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              background: '#5865F2',
              color: '#fff',
              fontSize: '14px',
              transition: 'background 0.3s ease',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.background = '#7983F5';
            }}
            onMouseLeave={(e) => {
              if (!saving) e.currentTarget.style.background = '#5865F2';
            }}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DiscoveryPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: '56px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid #333',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontWeight: '700', fontSize: '18px', color: '#fff' }}>🎨 像素动画工坊</span>
          <nav style={{ display: 'flex', gap: '8px' }}>
            <Link
              to="/"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                color: '#ddd',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              绘图
            </Link>
            <Link
              to="/discovery"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                background: 'rgba(88, 101, 242, 0.2)',
                color: '#8B9BFF',
              }}
            >
              发现
            </Link>
          </nav>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            background: '#5865F2',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background 0.3s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#7983F5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#5865F2'; }}
        >
          + 创作新作品
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DiscoveryGrid />
      </div>
    </div>
  );
};

const ArtworkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dispatch } = usePixel();
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (id) {
      loadArtwork(id);
    }
  }, [id]);

  const loadArtwork = async (artworkId: string) => {
    setLoading(true);
    try {
      const result = await getArtwork(artworkId);
      if (result) {
        setArtwork(result);
      }
    } catch (error) {
      console.error('Failed to load artwork:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isPlaying && artwork && artwork.frames.length > 0) {
      const frame = artwork.frames[currentFrame];
      const delay = frame ? frame.delay / playbackSpeed : 100;
      
      playIntervalRef.current = window.setTimeout(() => {
        setCurrentFrame((prev) => (prev + 1) % artwork!.frames.length);
      }, delay);
    }

    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
  }, [isPlaying, currentFrame, artwork, playbackSpeed]);

  const handleEdit = () => {
    if (artwork) {
      dispatch({ type: 'LOAD_ARTWORK', frames: artwork.frames });
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888' }}>加载中...</div>
      </div>
    );
  }

  if (!artwork) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888', marginBottom: '16px' }}>作品不存在</div>
        <button
          onClick={() => navigate('/discovery')}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            background: '#5865F2',
            color: '#fff',
          }}
        >
          返回发现页
        </button>
      </div>
    );
  }

  const progress = ((currentFrame + 1) / artwork.frames.length) * 100;
  const currentFrameData = artwork.frames[currentFrame];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          height: '56px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid #333',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontWeight: '700', fontSize: '18px', color: '#fff' }}>🎨 像素动画工坊</span>
          <nav style={{ display: 'flex', gap: '8px' }}>
            <Link
              to="/"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                color: '#ddd',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              绘图
            </Link>
            <Link
              to="/discovery"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                background: 'rgba(88, 101, 242, 0.2)',
                color: '#8B9BFF',
              }}
            >
              发现
            </Link>
          </nav>
        </div>
        <button
          onClick={handleEdit}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            background: '#5865F2',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background 0.3s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#7983F5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#5865F2'; }}
        >
          编辑此作品
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
          <h1 style={{ fontSize: '24px', color: '#fff', marginBottom: '8px' }}>
            {artwork.title || '未命名作品'}
          </h1>
          <div style={{ display: 'flex', gap: '16px', color: '#888', fontSize: '14px', marginBottom: '20px' }}>
            <span>作者: {artwork.author}</span>
            <span>{artwork.frames.length} 帧</span>
          </div>

          {artwork.tags.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {artwork.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '16px',
                    background: 'rgba(88, 101, 242, 0.2)',
                    color: '#8B9BFF',
                    fontSize: '13px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              marginBottom: '20px',
            }}
          >
            <DetailCanvas frame={currentFrameData} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#5865F2',
                color: '#fff',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.3s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#7983F5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#5865F2'; }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '6px',
                  background: '#333',
                  borderRadius: '3px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: '#5865F2',
                    width: `${progress}%`,
                    transition: 'width 0.1s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
                <span>帧 {currentFrame + 1}/{artwork.frames.length}</span>
                <span>速度: {playbackSpeed.toFixed(1)}x</span>
              </div>
            </div>

            <div style={{ width: '100px' }}>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            width: '280px',
            padding: '20px',
            borderLeft: '1px solid #333',
            overflowY: 'auto',
          }}
        >
          <h3 style={{ fontSize: '14px', color: '#ddd', marginBottom: '12px' }}>帧序列</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {artwork.frames.map((frame, index) => (
              <div
                key={frame.id}
                onClick={() => setCurrentFrame(index)}
                style={{
                  aspectRatio: '1',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: currentFrame === index ? '2px solid #5865F2' : '2px solid #333',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <ThumbnailCanvas frame={frame} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailCanvas: React.FC<{ frame: PixelFrame | undefined }> = ({ frame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 320;
    const pixelSize = size / 16;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const color = frame.pixels[y * 16 + x];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * pixelSize, 0);
      ctx.lineTo(i * pixelSize, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * pixelSize);
      ctx.lineTo(size, i * pixelSize);
      ctx.stroke();
    }
  }, [frame]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      style={{
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        imageRendering: 'pixelated',
      }}
    />
  );
};

const ThumbnailCanvas: React.FC<{ frame: PixelFrame }> = ({ frame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const pixelSize = size / 16;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, size, size);

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const color = frame.pixels[y * 16 + x];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }, [frame]);

  return (
    <canvas
      ref={canvasRef}
      width={64}
      height={64}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        imageRendering: 'pixelated',
      }}
    />
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PaintPage />} />
        <Route path="/discovery" element={<DiscoveryPage />} />
        <Route path="/artwork/:id" element={<ArtworkDetailPage />} />
      </Routes>
    </Router>
  );
};

export default App;
