import { useState } from 'react';
import type { Pet } from '../../../shared/types';

interface PetCardProps {
  pet: Pet;
  onSelect: (pet: Pet) => void;
}

export default function PetCard({ pet, onSelect }: PetCardProps) {
  const [imgIndex, setImgIndex] = useState(0);
  const allImages = [pet.mainImage, ...pet.subImages];

  return (
    <div
      className="pet-card"
      onClick={() => onSelect(pet)}
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
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.boxShadow = '0px 8px 24px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0px 2px 8px rgba(0,0,0,0.08)';
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
        <img
          src={allImages[imgIndex]}
          alt={pet.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'data:image/svg+xml,' +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="220" viewBox="0 0 260 220"><rect fill="#F0F2F5" width="260" height="220"/><text fill="#999" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">${pet.name}</text></svg>`
              );
          }}
        />
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
                onClick={(e) => {
                  e.stopPropagation();
                  setImgIndex(i);
                }}
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: i === imgIndex ? '#F58F29' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
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
