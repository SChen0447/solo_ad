import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Image, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { useAppStore } from '../store';
import type { Photo } from '../types';

function useLazyLoad(): [React.RefCallback<HTMLDivElement>, boolean] {
  const [isVisible, setIsVisible] = useState(false);
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, 100);
          observer.unobserve(el);
        }
      },
      { rootMargin: '200px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isVisible]);

  const callbackRef = useCallback((node: HTMLDivElement | null) => {
    elRef.current = node;
    if (node && !isVisible) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), 100);
            observer.unobserve(node);
          }
        },
        { rootMargin: '200px', threshold: 0.01 }
      );
      observer.observe(node);
    }
  }, [isVisible]);

  return [callbackRef, isVisible];
}

function PhotoCard({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const [ref, isVisible] = useLazyLoad();
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      ref={ref}
      style={{
        breakInside: 'avoid',
        marginBottom: 16,
        backgroundColor: '#fff',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      }}
      className="card"
      onClick={onClick}
    >
      {isVisible ? (
        <div style={{ position: 'relative', width: '100%' }}>
          {!loaded && (
            <div
              style={{
                width: '100%',
                aspectRatio: '1.5',
                backgroundColor: '#f0f0f0',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          )}
          <img
            src={photo.url}
            alt=""
            style={{
              width: '100%',
              display: 'block',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            draggable={false}
          />
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '1.5',
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        >
          <Image size={32} color="#bbb" />
        </div>
      )}
      <div
        style={{
          padding: '8px 12px',
          fontSize: 13,
          color: '#2c3e50',
        }}
      >
        {photo.date}
      </div>
    </div>
  );
}

function FullscreenViewer({
  photos,
  initialIndex,
  onClose,
}: {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZooming, setIsZooming] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchCurrentX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsZooming(true);
      setImageLoaded(false);
      setTimeout(() => {
        setCurrentIndex((i) => i - 1);
        setIsZooming(false);
      }, 150);
    }
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setIsZooming(true);
      setImageLoaded(false);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setIsZooming(false);
      }, 150);
    }
  }, [currentIndex, photos.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchCurrentX.current !== null) {
      const diff = touchCurrentX.current - touchStartX.current;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          goPrev();
        } else {
          goNext();
        }
      }
    }
    touchStartX.current = null;
    touchCurrentX.current = null;
  };

  const photo = photos[currentIndex];
  const slideOffset =
    touchCurrentX.current !== null && touchStartX.current !== null
      ? touchCurrentX.current - touchStartX.current
      : 0;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        transition: 'background-color 0.3s ease',
      }}
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '90vw',
          maxHeight: '90vh',
          transform: `translateX(${slideOffset * 0.3}px)`,
          transition: isZooming ? 'none' : 'transform 0.1s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!imageLoaded && (
          <div
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: '3px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        )}
        <img
          key={photo.id}
          src={photo.url}
          alt=""
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain',
            borderRadius: 4,
            opacity: isZooming ? 0 : imageLoaded ? 1 : 0,
            transform: isZooming ? 'scale(0.85)' : 'scale(1)',
            transition:
              'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease-out',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: '50%',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#fff',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
        }}
      >
        <X size={24} />
      </button>

      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          style={{
            position: 'absolute',
            left: 20,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            transition: 'background 0.2s, transform 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'translateY(-50%) translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.transform = 'translateY(-50%)';
          }}
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {currentIndex < photos.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          style={{
            position: 'absolute',
            right: 20,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            borderRadius: '50%',
            width: 48,
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            transition: 'background 0.2s, transform 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.transform = 'translateY(-50%) translateX(2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
            e.currentTarget.style.transform = 'translateY(-50%)';
          }}
        >
          <ChevronRight size={28} />
        </button>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: 14,
          backgroundColor: 'rgba(0,0,0,0.3)',
          padding: '6px 16px',
          borderRadius: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {photo.date} · {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
}

export default function AlbumView() {
  const { state, fetchAlbum } = useAppStore();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);

  const photos = state.albumPhotos;

  const groupedPhotos = useMemo(() => {
    const groups: Record<string, Photo[]> = {};
    for (const photo of photos) {
      if (!groups[photo.date]) {
        groups[photo.date] = [];
      }
      groups[photo.date].push(photo);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [photos]);

  const handleGenerate = useCallback(async () => {
    if (!state.currentTripId) return;
    setGenerating(true);
    try {
      await fetchAlbum(state.currentTripId);
    } finally {
      setGenerating(false);
    }
  }, [state.currentTripId, fetchAlbum]);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 767px) {
          .waterfall {
            column-count: 2 !important;
          }
        }
        @media (max-width: 479px) {
          .waterfall {
            column-count: 1 !important;
          }
        }
      `}</style>

      <div
        style={{
          padding: 24,
          backgroundColor: '#faf3e0',
          minHeight: '100vh',
          color: '#2c3e50',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 600,
              color: '#2c3e50',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Image size={24} color="#3498db" />
            旅行相册
          </h2>

          <button
            onClick={handleGenerate}
            disabled={generating || !state.currentTripId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              backgroundColor:
                generating || !state.currentTripId ? '#bdc3c7' : '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              cursor:
                generating || !state.currentTripId ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!generating && state.currentTripId) {
                e.currentTarget.style.backgroundColor = '#2980b9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!generating && state.currentTripId) {
                e.currentTarget.style.backgroundColor = '#3498db';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            <Sparkles size={18} />
            {generating ? '生成中...' : '生成相册'}
          </button>
        </div>

        {photos.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              color: '#7f8c8d',
            }}
          >
            <Image size={64} color="#bdc3c7" />
            <p style={{ marginTop: 16, fontSize: 16, textAlign: 'center' }}>
              还没有照片，写日记时插入图片后可以生成相册
            </p>
          </div>
        ) : (
          <div>
            {groupedPhotos.map(([date, datePhotos]) => (
              <div key={date} style={{ marginBottom: 32 }}>
                <h3
                  style={{
                    margin: '0 0 12px 0',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#2c3e50',
                    borderBottom: '2px solid #3498db',
                    paddingBottom: 6,
                    display: 'inline-block',
                  }}
                >
                  {date}
                </h3>
                <div
                  className="waterfall"
                  style={{
                    columnCount: 4,
                    columnGap: 16,
                  }}
                >
                  {datePhotos.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      onClick={() => {
                        const idx = photos.findIndex((p) => p.id === photo.id);
                        setViewerIndex(idx >= 0 ? idx : 0);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewerIndex !== null && (
        <FullscreenViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
