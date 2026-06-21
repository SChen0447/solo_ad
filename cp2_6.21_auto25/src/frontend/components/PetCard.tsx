import { useState, useEffect, useCallback } from 'react';
import type { Pet } from '../../../shared/types';

interface PetCardProps {
  pet: Pet;
  onSelect: (pet: Pet) => void;
}

export default function PetCard({ pet, onSelect }: PetCardProps) {
  const [imgIndex, setImgIndex] = useState(0);
  const allImages = [pet.mainImage, ...pet.subImages].slice(0, 4);
  const [isHovering, setIsHovering] = useState(false);

  const goTo = useCallback((i: number) => {
    setImgIndex(((i % allImages.length) + allImages.length) % allImages.length);
  }, [allImages.length]);

  useEffect(() => {
    if (allImages.length <= 1 || !isHovering) return;
    const timer = setInterval(() => {
      goTo(imgIndex + 1);
    }, 2500);
    return () => clearInterval(timer);
  }, [imgIndex, allImages.length, isHovering, goTo]);

  return (
    <div
      className="pet-card"
      onClick={() => onSelect(pet)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{
        width: '260px',
        borderRadius: '16px',
        background: '#FFFFFF',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        boxShadow: '0px 2px 8px rgba(0,0,0,0.08)',
        breakInside: 'avoid',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '220px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            transition: 'transform 0.4s ease',
            transform: `translateX(-${imgIndex * 100}%)`,
            width: `${allImages.length * 100}%`,
            height: '100%',
          }}
        >
          {allImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`${pet.name}-${i + 1}`}
              style={{
                width: `${100 / allImages.length}%`,
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,' +
                  encodeURIComponent(
                    `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="220" viewBox="0 0 260 220"><rect fill="#F0F2F5" width="260" height="220"/><text fill="#999" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">${pet.name}</text></svg>`
                  );
              }}
            />
          ))}
        </div>

        {allImages.length > 1 && isHovering && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(imgIndex - 1); }}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.85)',
                color: '#333',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.85)')}
            >
              ‹
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goTo(imgIndex + 1); }}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.85)',
                color: '#333',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.85)')}
            >
              ›
            </button>
          </>
        )}

        {allImages.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '4px',
            }}
          >
            {allImages.map((_, i) => (
              <span
                key={i}
                onClick={(e) => { e.stopPropagation(); setImgIndex(i); }}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: i === imgIndex ? '#F58F29' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#333333',
            margin: '0 0 6px 0',
          }}
        >
          {pet.name}
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: '#666',
            margin: '0 0 8px 0',
          }}
        >
          {pet.breed} · {pet.age}岁
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {pet.personalityTags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: '8px',
                background: tag === '活泼' ? '#FFF3E0' : tag === '亲人' ? '#E8F5E9' : tag === '胆小' ? '#F3E5F5' : '#E3F2FD',
                color: tag === '活泼' ? '#E65100' : tag === '亲人' ? '#2E7D32' : tag === '胆小' ? '#6A1B9A' : '#1565C0',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
