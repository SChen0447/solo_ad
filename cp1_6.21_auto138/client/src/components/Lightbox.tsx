import { useEffect, useState } from 'react';
import './Lightbox.css';

interface LightboxProps {
  images: string[];
  currentIndex?: number;
  open: boolean;
  onClose: () => void;
}

export default function Lightbox({ images, currentIndex = 0, open, onClose }: LightboxProps) {
  const [index, setIndex] = useState(currentIndex);
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (open) {
      setIndex(currentIndex);
      setScale(1);
    }
  }, [open, currentIndex]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, index, images.length]);

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.min(5, Math.max(1, s + delta)));
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  if (!open || images.length === 0) return null;

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      {images.length > 1 && (
        <button className="lightbox-arrow prev" onClick={(e) => { e.stopPropagation(); prev(); }}>‹</button>
      )}
      <div
        className="lightbox-content"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
      >
        <img
          src={images[index]}
          alt={`图片 ${index + 1}`}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
          }}
        />
      </div>
      {images.length > 1 && (
        <button className="lightbox-arrow next" onClick={(e) => { e.stopPropagation(); next(); }}>›</button>
      )}
      <button className="lightbox-close" onClick={onClose} aria-label="关闭">×</button>
      {images.length > 1 && (
        <div className="lightbox-counter">{index + 1} / {images.length}</div>
      )}
    </div>
  );
}
