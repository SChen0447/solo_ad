import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Artwork, RECOMMENDED_TAGS } from '../store/pixelStore';
import { searchArtworks } from '../utils/db';

const DiscoveryGrid: React.FC = () => {
  const navigate = useNavigate();
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArtworks();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadArtworks();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag]);

  const loadArtworks = async () => {
    setLoading(true);
    try {
      const query = selectedTag 
        ? (searchQuery ? `${searchQuery} ${selectedTag}` : selectedTag)
        : searchQuery;
      const results = await searchArtworks(query);
      setArtworks(results);
    } catch (error) {
      console.error('Failed to load artworks:', error);
      setArtworks([]);
    }
    setLoading(false);
  };

  const handleCardClick = (id: string) => {
    navigate(`/artwork/${id}`);
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #333',
          flexShrink: 0,
        }}
      >
        <h1 style={{ fontSize: '24px', marginBottom: '16px', color: '#fff' }}>
          发现
        </h1>
        
        <input
          type="text"
          placeholder="搜索作品标题或标签..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #444',
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '14px',
            outline: 'none',
            marginBottom: '12px',
            transition: 'border-color 0.3s ease',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#5865F2';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#444';
          }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {RECOMMENDED_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              style={{
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '12px',
                background: selectedTag === tag ? '#5865F2' : 'rgba(255, 255, 255, 0.08)',
                color: '#ddd',
                border: '1px solid #444',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                if (selectedTag !== tag) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTag !== tag) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                }
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
            加载中...
          </div>
        ) : artworks.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#888', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
            <p>暂无作品</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>去创作你的第一个像素动画吧！</p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                onClick={() => handleCardClick(artwork.id)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                }}
              >
                <div
                  style={{
                    aspectRatio: '1',
                    background: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {artwork.thumbnail ? (
                    <img
                      src={artwork.thumbnail}
                      alt={artwork.title}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        imageRendering: 'pixelated',
                      }}
                    />
                  ) : (
                    <span style={{ color: '#999', fontSize: '32px' }}>🖼️</span>
                  )}
                </div>
                <div style={{ padding: '12px' }}>
                  <h3
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#fff',
                      marginBottom: '6px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {artwork.title || '未命名作品'}
                  </h3>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: '#888',
                    }}
                  >
                    <span>{artwork.frames.length} 帧</span>
                    <span>{artwork.author}</span>
                  </div>
                  {artwork.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {artwork.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            background: 'rgba(88, 101, 242, 0.2)',
                            color: '#8B9BFF',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscoveryGrid;
