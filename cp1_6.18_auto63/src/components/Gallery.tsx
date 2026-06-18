import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Photo } from '../types';
import { useGalleryStore } from '../store';
import { PhotoCard } from './PhotoCard';

const GALLERY_TOP_PADDING = 80;

const galleryStyles: React.CSSProperties = {
  padding: `${GALLERY_TOP_PADDING + 24}px 24px 40px 24px`,
  maxWidth: '1400px',
  margin: '0 auto',
};

const gridStyles: React.CSSProperties = {
  columnGap: '12px',
  columnCount: 4,
};

const emptyStyles: React.CSSProperties = {
  textAlign: 'center',
  padding: '80px 20px',
  color: '#666',
  fontSize: '16px',
};

interface CardWrapperProps {
  photo: Photo;
  index: number;
  isNew: boolean;
}

const CardWrapper: React.FC<CardWrapperProps> = ({ photo, index, isNew }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const delay = isNew ? index * 60 : 0;
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [isNew, index]);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
        transitionDelay: isNew ? `${index * 60}ms` : '0ms',
      }}
    >
      <PhotoCard photo={photo} index={index} />
    </div>
  );
};

export const Gallery: React.FC = () => {
  const filteredPhotos = useGalleryStore((s) => s.filteredPhotos);
  const prevPhotoIdsRef = useRef<Set<string>>(new Set(filteredPhotos.map((p) => p.id)));
  const [animatingIn, setAnimatingIn] = useState<Set<string>>(new Set());

  const [cols, setCols] = useState(() => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width > 1200) return 4;
    if (width > 768) return 3;
    if (width > 480) return 2;
    return 1;
  });

  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    if (width > 1200) setCols(4);
    else if (width > 768) setCols(3);
    else if (width > 480) setCols(2);
    else setCols(1);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    const currentIds = new Set(filteredPhotos.map((p) => p.id));
    const prevIds = prevPhotoIdsRef.current;
    const newIds = new Set<string>();

    currentIds.forEach((id) => {
      if (!prevIds.has(id)) {
        newIds.add(id);
      }
    });

    prevPhotoIdsRef.current = currentIds;

    if (newIds.size > 0) {
      setAnimatingIn(newIds);
      const timer = setTimeout(() => setAnimatingIn(new Set()), 700);
      return () => clearTimeout(timer);
    }
  }, [filteredPhotos]);

  if (filteredPhotos.length === 0) {
    return (
      <div style={{ ...galleryStyles, paddingTop: GALLERY_TOP_PADDING + 60 }}>
        <div style={emptyStyles}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
          <p>没有找到匹配的照片</p>
          <p style={{ fontSize: '13px', marginTop: '8px', color: '#555' }}>
            试试其他分类或关键词
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={galleryStyles}>
      <div
        style={{
          ...gridStyles,
          columnCount: cols,
        }}
      >
        {filteredPhotos.map((photo, index) => (
          <CardWrapper
            key={photo.id}
            photo={photo}
            index={index}
            isNew={animatingIn.has(photo.id)}
          />
        ))}
      </div>
    </div>
  );
};
