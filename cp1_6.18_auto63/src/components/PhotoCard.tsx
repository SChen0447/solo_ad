import React, { useState, useMemo } from 'react';
import { Photo, CATEGORY_COLORS } from '../types';
import { useLazyLoad } from '../hooks/useLazyLoad';
import { useGalleryStore } from '../store';

interface PhotoCardProps {
  photo: Photo;
  index: number;
}

const cardStyles: React.CSSProperties = {
  borderRadius: '12px',
  overflow: 'hidden',
  backgroundColor: '#16213e',
  cursor: 'pointer',
  transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
  position: 'relative',
  breakInside: 'avoid',
  marginBottom: '12px',
};

const skeletonStyles: React.CSSProperties = {
  width: '100%',
  minHeight: '220px',
  background: 'linear-gradient(135deg, #1a1a2e 0%, #2a2a4e 50%, #1a1a2e 100%)',
  backgroundSize: '200% 200%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

const imageContainerStyles: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  overflow: 'hidden',
};

const infoStyles: React.CSSProperties = {
  padding: '12px 14px',
};

const titleStyles: React.CSSProperties = {
  color: '#e0e0e0',
  fontSize: '14px',
  fontWeight: 600,
  margin: '0 0 6px 0',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const tagStyles = (color: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: '12px',
  fontSize: '11px',
  fontWeight: 500,
  color: '#fff',
  backgroundColor: color + '33',
  border: `1px solid ${color}66`,
  transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
});

export const PhotoCard: React.FC<PhotoCardProps> = ({ photo, index }) => {
  const { ref, isVisible } = useLazyLoad(0.1);
  const [loaded, setLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const openSlideshow = useGalleryStore((s) => s.openSlideshow);

  const categoryColor = useMemo(() => CATEGORY_COLORS[photo.category], [photo.category]);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  const dynamicCardStyles: React.CSSProperties = {
    ...cardStyles,
    transform: isHovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
    boxShadow: isHovered
      ? `0 8px 30px rgba(0,0,0,0.4), 0 0 15px ${categoryColor}22`
      : '0 2px 8px rgba(0,0,0,0.2)',
  };

  const dynamicTagStyles: React.CSSProperties = {
    ...tagStyles(categoryColor),
    transform: isHovered ? 'scale(1.08)' : 'scale(1)',
    boxShadow: isHovered ? `0 2px 8px ${categoryColor}44` : 'none',
  };

  return (
    <div
      ref={ref}
      style={dynamicCardStyles}
      onClick={() => openSlideshow(index)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={imageContainerStyles}>
        {!loaded && <div style={skeletonStyles} />}
        {isVisible && (
          <img
            src={photo.url}
            alt={photo.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            style={{
              width: '100%',
              display: 'block',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.5s ease-in',
              position: loaded ? 'static' : 'absolute',
              top: 0,
              left: 0,
            }}
          />
        )}
      </div>
      <div style={infoStyles}>
        <p style={titleStyles}>{photo.title}</p>
        <span style={dynamicTagStyles}>{photo.category}</span>
      </div>
    </div>
  );
};
