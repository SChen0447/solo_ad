import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { CATEGORY_COLORS } from '../types';
import { useGalleryStore } from '../store';

const overlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.85)',
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'fadeInOverlay 0.3s ease-out',
};

const containerStyles: React.CSSProperties = {
  position: 'relative',
  maxWidth: '90vw',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const imageContainerStyles: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const imageStyles: React.CSSProperties = {
  maxWidth: '85vw',
  maxHeight: '72vh',
  objectFit: 'contain',
  borderRadius: '8px',
};

const infoStyles: React.CSSProperties = {
  textAlign: 'center',
  marginTop: '20px',
  maxWidth: '600px',
};

const titleStyles: React.CSSProperties = {
  color: '#e0e0e0',
  fontSize: '22px',
  fontWeight: 600,
  margin: '0 0 8px 0',
};

const descriptionStyles: React.CSSProperties = {
  color: '#999',
  fontSize: '14px',
  margin: '0 0 10px 0',
  lineHeight: 1.6,
};

const tagStyles = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '4px 14px',
  borderRadius: '14px',
  fontSize: '12px',
  fontWeight: 500,
  color: '#fff',
  backgroundColor: `${color}44`,
  border: `1px solid ${color}66`,
});

const arrowBaseStyles: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.2)',
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: '#e0e0e0',
  fontSize: '20px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.2s ease-out, background-color 0.2s ease-out, box-shadow 0.2s ease-out',
  zIndex: 10,
  outline: 'none',
};

const leftArrowStyles: React.CSSProperties = {
  ...arrowBaseStyles,
  left: '-70px',
};

const rightArrowStyles: React.CSSProperties = {
  ...arrowBaseStyles,
  right: '-70px',
};

const closeBtnStyles: React.CSSProperties = {
  position: 'absolute',
  top: '20px',
  right: '24px',
  width: '42px',
  height: '42px',
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.15)',
  backgroundColor: 'rgba(255,255,255,0.06)',
  color: '#e0e0e0',
  fontSize: '18px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.2s ease-out, background-color 0.2s ease-out',
  zIndex: 10,
  outline: 'none',
};

const counterStyles: React.CSSProperties = {
  position: 'absolute',
  top: '24px',
  left: '24px',
  color: '#999',
  fontSize: '14px',
  zIndex: 10,
};

export const Slideshow: React.FC = () => {
  const slideshowIndex = useGalleryStore((s) => s.slideshowIndex);
  const filteredPhotos = useGalleryStore((s) => s.filteredPhotos);
  const closeSlideshow = useGalleryStore((s) => s.closeSlideshow);
  const nextSlide = useGalleryStore((s) => s.nextSlide);
  const prevSlide = useGalleryStore((s) => s.prevSlide);

  const [transitioning, setTransitioning] = useState(false);
  const [currentDisplayIndex, setCurrentDisplayIndex] = useState(slideshowIndex);

  useEffect(() => {
    if (slideshowIndex === null) return;
    setTransitioning(true);
    const timer = setTimeout(() => {
      setCurrentDisplayIndex(slideshowIndex);
      setTransitioning(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [slideshowIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (slideshowIndex === null) return;
      if (e.key === 'Escape') closeSlideshow();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    },
    [slideshowIndex, closeSlideshow, nextSlide, prevSlide]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (slideshowIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [slideshowIndex]);

  const currentPhoto = useMemo(() => {
    if (currentDisplayIndex === null || currentDisplayIndex >= filteredPhotos.length) return null;
    return filteredPhotos[currentDisplayIndex];
  }, [currentDisplayIndex, filteredPhotos]);

  if (slideshowIndex === null || !currentPhoto) return null;

  const categoryColor = CATEGORY_COLORS[currentPhoto.category];
  const canPrev = currentDisplayIndex !== null && currentDisplayIndex > 0;
  const canNext = currentDisplayIndex !== null && currentDisplayIndex < filteredPhotos.length - 1;

  return (
    <div style={overlayStyles} onClick={(e) => {
      if (e.target === e.currentTarget) closeSlideshow();
    }}>
      <span style={counterStyles}>
        {(currentDisplayIndex ?? 0) + 1} / {filteredPhotos.length}
      </span>

      <button
        style={closeBtnStyles}
        onClick={closeSlideshow}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.15)';
          (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)';
          (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        }}
      >
        ✕
      </button>

      <div style={containerStyles}>
        <div style={imageContainerStyles}>
          {canPrev && (
            <button
              style={leftArrowStyles}
              onClick={(e) => { e.stopPropagation(); prevSlide(); }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.15)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1.15)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              ◀
            </button>
          )}

          <img
            src={currentPhoto.url}
            alt={currentPhoto.title}
            style={{
              ...imageStyles,
              opacity: transitioning ? 0 : 1,
              transition: 'opacity 0.4s ease-in-out',
            }}
          />

          {canNext && (
            <button
              style={rightArrowStyles}
              onClick={(e) => { e.stopPropagation(); nextSlide(); }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.15)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1.15)';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-50%) scale(1)';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              ▶
            </button>
          )}
        </div>

        <div
          style={{
            ...infoStyles,
            opacity: transitioning ? 0 : 1,
            transition: 'opacity 0.4s ease-in-out',
          }}
        >
          <p style={titleStyles}>{currentPhoto.title}</p>
          <p style={descriptionStyles}>{currentPhoto.description}</p>
          <span style={tagStyles(categoryColor)}>{currentPhoto.category}</span>
        </div>
      </div>
    </div>
  );
};
