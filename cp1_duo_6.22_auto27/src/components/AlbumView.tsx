import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Image, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react';
import { useAppStore } from '../store';
import type { Photo } from '../types';

function useLazyLoad(): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, isVisible];
}

function PhotoCard({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const [ref, isVisible] = useLazyLoad();

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
        transition: 'transform 0.3s, box-shadow 0.3s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}
      onClick={onClick}
    >
      {isVisible ? (
        <img
          src={photo.url}
          alt=""
          style={{
            width: '100%',
            display: 'block',
          }}
          loading="lazy"
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: 200,
            backgroundColor: '#e0e0e0',
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

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : i));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i < photos.length - 1 ? i + 1 : i));
  }, [photos.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  const photo = photos[currentIndex];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <img
        key={photo.id}
        src={photo.url}
        alt=""
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: 4,
          animation: 'zoomIn 0.4s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      />

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
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
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
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
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
          color: 'rgba(255,255,255,0.7)',
          fontSize: 14,
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
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes zoomIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          padding: 24,
          backgroundColor: '#faf3e0',
          minHeight: '100vh',
          color: '#2c3e50',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
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
              backgroundColor: generating || !state.currentTripId ? '#bdc3c7' : '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              cursor: generating || !state.currentTripId ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!generating && state.currentTripId) {
                e.currentTarget.style.backgroundColor = '#2980b9';
              }
            }}
            onMouseLeave={(e) => {
              if (!generating && state.currentTripId) {
                e.currentTarget.style.backgroundColor = '#3498db';
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
                  style={{
                    columnCount: 3,
                    columnGap: 16,
                  }}
                >
                  {datePhotos.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      onClick={() => setViewerIndex(photos.indexOf(photo))}
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
