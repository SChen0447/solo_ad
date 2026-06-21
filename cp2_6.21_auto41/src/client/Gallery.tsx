import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CollageResponse, Layer, buildFilterCSS, CANVAS_BG } from './types';

interface GalleryProps {
  isMyWorks?: boolean;
}

const PAGE_SIZE = 10;
const LOAD_THRESHOLD = 300;
const CARD_WIDTH = 240;

const ThumbnailRenderer: React.FC<{
  layers: Layer[];
  width: number;
  height: number;
  background: string;
}> = ({ layers, width, height, background }) => {
  const scale = Math.min(width / 800, height / 600);
  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        background: background || CANVAS_BG,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
          width: 800,
          height: 600,
        }}
      >
        {layers
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((layer) => {
            const w = layer.width * layer.scale;
            const h = layer.height * layer.scale;
            return (
              <div
                key={layer.id}
                style={{
                  position: 'absolute',
                  left: layer.x,
                  top: layer.y,
                  width: w,
                  height: h,
                  transform: `rotate(${layer.rotation}deg)`,
                  zIndex: layer.zIndex,
                }}
              >
                {layer.type === 'image' && layer.imageUrl && (
                  <img
                    src={layer.imageUrl}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      filter: layer.filters ? buildFilterCSS(layer.filters) : 'none',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {layer.type === 'text' && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor:
                        layer.textStyle && layer.textStyle.backgroundColor !== 'transparent'
                          ? `${layer.textStyle.backgroundColor}${Math.round(
                              (layer.textStyle.backgroundOpacity || 0) * 255
                            )
                              .toString(16)
                              .padStart(2, '0')}`
                          : 'transparent',
                      padding: '5px 10px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: layer.textStyle?.fontFamily,
                        fontSize: `${layer.textStyle?.fontSize}px`,
                        color: layer.textStyle?.color,
                        fontWeight: layer.textStyle?.fontWeight,
                        fontStyle: layer.textStyle?.fontStyle,
                        textDecoration: layer.textStyle?.textDecoration,
                        lineHeight: 1.2,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {layer.text}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};

const CollageCard: React.FC<{
  collage: CollageResponse;
  onOpen: () => void;
  onLike: () => void;
}> = ({ collage, onOpen, onLike }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(collage.likes);
  const cardHeight = 320;
  const thumbHeight = cardHeight * 0.6;

  useEffect(() => {
    setLikes(collage.likes);
  }, [collage.likes]);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!liked) {
      setLiked(true);
      setLikes((prev) => prev + 1);
      onLike();
    }
  };

  return (
    <div
      onClick={onOpen}
      style={{
        width: CARD_WIDTH,
        borderRadius: 12,
        background: 'linear-gradient(180deg, #2D2D44 0%, #1A1A2E 100%)',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
        breakInside: 'avoid',
        marginBottom: 16,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.filter = 'brightness(1.1)';
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.filter = 'brightness(1)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
      }}
    >
      <div style={{ width: '100%', height: thumbHeight, background: CANVAS_BG }}>
        <ThumbnailRenderer
          layers={collage.layers}
          width={CARD_WIDTH}
          height={thumbHeight}
          background={collage.background}
        />
      </div>
      <div style={{ padding: '12px 14px', position: 'relative' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#E0E0E0',
            marginBottom: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingRight: 32,
          }}
          title={collage.name}
        >
          {collage.name}
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>作者：{collage.author || '匿名'}</div>
        <div
          onClick={handleLike}
          style={{
            position: 'absolute',
            right: 14,
            top: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill={liked ? '#EF4444' : 'none'}
            stroke={liked ? '#EF4444' : '#888'}
            strokeWidth="2"
            style={{ transition: 'all 0.2s' }}
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          <span
            style={{
              fontSize: 12,
              color: liked ? '#EF4444' : '#888',
              fontWeight: 500,
            }}
          >
            {likes}
          </span>
        </div>
      </div>
    </div>
  );
};

const Modal: React.FC<{
  collage: CollageResponse | null;
  onClose: () => void;
}> = ({ collage, onClose }) => {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (collage) {
      document.addEventListener('keydown', esc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [collage, onClose]);

  if (!collage) return null;

  const previewScale = Math.min(
    (window.innerWidth - 80) / collage.canvasWidth,
    (window.innerHeight - 200) / collage.canvasHeight,
    1
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1A1A2E',
          borderRadius: 16,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
          animation: 'scaleIn 0.3s ease',
          transformOrigin: 'center center',
        }}
      >
        <div
          style={{
            padding: 20,
            overflow: 'hidden',
          }}
        >
          <ThumbnailRenderer
            layers={collage.layers}
            width={collage.canvasWidth * previewScale}
            height={collage.canvasHeight * previewScale}
            background={collage.background}
          />
        </div>
        <div style={{ padding: '0 24px 24px', maxWidth: collage.canvasWidth * previewScale }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12,
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#E0E0E0',
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                {collage.name}
              </h2>
              <div style={{ fontSize: 13, color: '#888' }}>
                作者：<span style={{ color: '#3B82F6' }}>{collage.author || '匿名'}</span>
                <span style={{ margin: '0 10px' }}>·</span>
                创建于 {new Date(collage.createdAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="#EF4444"
                stroke="#EF4444"
                strokeWidth="2"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span style={{ fontSize: 16, color: '#EF4444', fontWeight: 600 }}>{collage.likes}</span>
            </div>
          </div>
          {collage.description && (
            <div
              style={{
                fontSize: 14,
                color: '#AAA',
                lineHeight: 1.6,
                padding: 12,
                background: 'rgba(45, 45, 68, 0.5)',
                borderRadius: 8,
              }}
            >
              {collage.description}
            </div>
          )}
          <button
            onClick={onClose}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '12px',
              background: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            关闭
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const Gallery: React.FC<GalleryProps> = ({ isMyWorks = false }) => {
  const [collages, setCollages] = useState<CollageResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [modalCollage, setModalCollage] = useState<CollageResponse | null>(null);
  const [columns, setColumns] = useState(3);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef<Set<string>>(new Set());

  const calculateColumns = useCallback(() => {
    const width = containerRef.current?.clientWidth || 800;
    const cols = Math.max(1, Math.floor((width + 16) / (CARD_WIDTH + 16)));
    setColumns(cols);
  }, []);

  useEffect(() => {
    calculateColumns();
    window.addEventListener('resize', calculateColumns);
    return () => window.removeEventListener('resize', calculateColumns);
  }, [calculateColumns]);

  const loadCollages = useCallback(
    async (p: number, append = false) => {
      if (loading) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/collages?page=${p}&pageSize=${PAGE_SIZE}&sortBy=time`
        );
        const data = await res.json();
        const filtered = isMyWorks
          ? data.collages.filter((c: CollageResponse) => c.author !== '匿名')
          : data.collages;

        const newItems = filtered.filter(
          (c: CollageResponse) => !loadedRef.current.has(c.id)
        );
        newItems.forEach((c: CollageResponse) => loadedRef.current.add(c.id));

        setCollages((prev) => (append ? [...prev, ...newItems] : newItems));
        setHasMore(append ? data.collages.length >= PAGE_SIZE : p * PAGE_SIZE < data.total);
      } catch (e) {
        console.error('加载失败:', e);
      } finally {
        setLoading(false);
      }
    },
    [loading, isMyWorks]
  );

  useEffect(() => {
    loadedRef.current.clear();
    setPage(1);
    setCollages([]);
    setHasMore(true);
    loadCollages(1, false);
  }, [isMyWorks, loadCollages]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < LOAD_THRESHOLD && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadCollages(nextPage, true);
    }
  }, [hasMore, loading, page, loadCollages]);

  const handleLike = async (id: string) => {
    try {
      await fetch(`/api/collages/${id}/like`, { method: 'PUT' });
      setCollages((prev) =>
        prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1 } : c))
      );
    } catch (e) {
      console.error('点赞失败:', e);
    }
  };

  const renderWaterfall = () => {
    const columnHeights = new Array(columns).fill(0);
    const columnItems: Array<Array<{ collage: CollageResponse; top: number; left: number }>> =
      new Array(columns).fill(null).map(() => []);
    const cardHeight = 320 + 16;
    const totalHeight = [0];

    collages.forEach((collage) => {
      let shortest = 0;
      for (let i = 1; i < columns; i++) {
        if (columnHeights[i] < columnHeights[shortest]) shortest = i;
      }
      const top = columnHeights[shortest];
      const left = shortest * (CARD_WIDTH + 16);
      columnItems[shortest].push({ collage, top, left });
      columnHeights[shortest] += cardHeight;
      totalHeight[0] = Math.max(totalHeight[0], columnHeights[shortest]);
    });

    const rendered: JSX.Element[] = [];
    columnItems.forEach((col) => {
      col.forEach((item) => {
        rendered.push(
          <div
            key={item.collage.id}
            style={{
              position: 'absolute',
              top: item.top,
              left: item.left,
            }}
          >
            <CollageCard
              collage={item.collage}
              onOpen={() => setModalCollage(item.collage)}
              onLike={() => handleLike(item.collage.id)}
            />
          </div>
        );
      });
    });

    return { rendered, totalHeight: totalHeight[0] };
  };

  const { rendered, totalHeight } = renderWaterfall();
  const containerWidth = columns * CARD_WIDTH + (columns - 1) * 16;

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          padding: '24px 20px',
          boxSizing: 'border-box',
        }}
      >
        {collages.length === 0 && !loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#666',
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 16 }}>🖼️</div>
            <div style={{ fontSize: 16, marginBottom: 8 }}>
              {isMyWorks ? '暂无作品' : '画廊空空如也'}
            </div>
            <div style={{ fontSize: 13, color: '#555' }}>
              {isMyWorks ? '创作你的第一个拼贴画作品吧！' : '快来发布第一个作品吧！'}
            </div>
          </div>
        )}
        <div
          style={{
            position: 'relative',
            margin: '0 auto',
            width: containerWidth,
            height: totalHeight,
          }}
        >
          {rendered}
        </div>
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: 30,
              color: '#666',
              fontSize: 14,
            }}
          >
            <div
              style={{
                display: 'inline-block',
                width: 20,
                height: 20,
                border: '2px solid #3B82F6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginRight: 10,
                verticalAlign: 'middle',
              }}
            />
            加载中...
          </div>
        )}
        {!hasMore && collages.length > 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '30px',
              color: '#555',
              fontSize: 13,
            }}
          >
            — 已加载全部作品 —
          </div>
        )}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
      <Modal collage={modalCollage} onClose={() => setModalCollage(null)} />
    </div>
  );
};

export default Gallery;
