import { useState } from 'react';
import type { Pet } from '../types';

interface PetCardProps {
  pet: Pet;
  onClick: () => void;
  onApply: () => void;
}

export default function PetCard({ pet, onClick, onApply }: PetCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const allImages = pet.images.length > 0 ? pet.images : [pet.mainImage];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage(prev => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImage(prev => (prev + 1) % allImages.length);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApply();
  };

  return (
    <div className="pet-card" onClick={onClick}>
      <div className="pet-card-image">
        <img src={allImages[currentImage]} alt={pet.name} />
        {allImages.length > 1 && (
          <>
            <button className="image-nav prev" onClick={handlePrev}>‹</button>
            <button className="image-nav next" onClick={handleNext}>›</button>
            <div className="image-indicators">
              {allImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`indicator ${idx === currentImage ? 'active' : ''}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="pet-card-content">
        <div className="pet-card-header">
          <h3 className="pet-name">{pet.name}</h3>
          <span className="pet-age">{pet.age}岁</span>
        </div>
        <p className="pet-breed">{pet.breed}</p>
        <div className="pet-tags">
          {pet.personality.map(tag => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
        <button className="apply-btn" onClick={handleApply}>
          申请领养
        </button>
      </div>
    </div>
  );
}
