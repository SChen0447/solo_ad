import React from 'react';
import { FURNITURE_CONFIGS, FurnitureType } from '../models/Furniture';

interface FurniturePanelProps {
  onAddFurniture: (type: FurnitureType) => void;
  addedTypes: Set<FurnitureType>;
}

export const FurniturePanel: React.FC<FurniturePanelProps> = ({ onAddFurniture, addedTypes }) => {
  const furnitureTypes = Object.keys(FURNITURE_CONFIGS) as FurnitureType[];

  return (
    <div className="furniture-grid">
      {furnitureTypes.map((type) => {
        const config = FURNITURE_CONFIGS[type];
        const isAdded = addedTypes.has(type);

        return (
          <div
            key={type}
            className={`furniture-item ${isAdded ? 'added' : ''}`}
            onClick={() => onAddFurniture(type)}
            title={config.name}
          >
            <div
              className="furniture-thumbnail"
              style={{ backgroundColor: config.iconColor }}
            >
              <FurnitureIcon type={type} />
            </div>
            <span className="furniture-name">{config.name}</span>
            {isAdded && <div className="added-indicator" />}
          </div>
        );
      })}
    </div>
  );
};

const FurnitureIcon: React.FC<{ type: FurnitureType }> = ({ type }) => {
  switch (type) {
    case 'sofa':
      return (
        <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
          <rect x="8" y="20" width="48" height="28" rx="4" fill="#fff" opacity="0.9" />
          <rect x="8" y="12" width="48" height="10" rx="3" fill="#fff" opacity="0.7" />
          <rect x="8" y="20" width="8" height="28" rx="2" fill="#fff" opacity="0.5" />
          <rect x="48" y="20" width="8" height="28" rx="2" fill="#fff" opacity="0.5" />
          <rect x="12" y="44" width="6" height="8" rx="1" fill="#5D4037" />
          <rect x="46" y="44" width="6" height="8" rx="1" fill="#5D4037" />
        </svg>
      );
    case 'coffeeTable':
      return (
        <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
          <rect x="6" y="28" width="52" height="6" rx="2" fill="#fff" opacity="0.9" />
          <rect x="10" y="34" width="6" height="22" rx="2" fill="#fff" opacity="0.7" />
          <rect x="48" y="34" width="6" height="22" rx="2" fill="#fff" opacity="0.7" />
          <rect x="6" y="46" width="52" height="4" rx="1" fill="#fff" opacity="0.6" />
        </svg>
      );
    case 'floorLamp':
      return (
        <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
          <ellipse cx="32" cy="56" rx="14" ry="3" fill="#fff" opacity="0.7" />
          <rect x="30" y="20" width="4" height="36" rx="2" fill="#fff" opacity="0.8" />
          <path d="M18 20 L46 20 L42 8 L22 8 Z" fill="#FFF8E1" stroke="#fff" strokeWidth="1" />
          <circle cx="32" cy="22" r="5" fill="#FFE4B5" opacity="0.9" />
        </svg>
      );
    case 'bookshelf':
      return (
        <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
          <rect x="10" y="4" width="44" height="56" rx="2" fill="#fff" opacity="0.9" />
          <rect x="14" y="4" width="2" height="56" fill="#5D4037" opacity="0.6" />
          <rect x="48" y="4" width="2" height="56" fill="#5D4037" opacity="0.6" />
          <line x1="14" y1="18" x2="50" y2="18" stroke="#5D4037" strokeWidth="2" />
          <line x1="14" y1="32" x2="50" y2="32" stroke="#5D4037" strokeWidth="2" />
          <line x1="14" y1="46" x2="50" y2="46" stroke="#5D4037" strokeWidth="2" />
          <rect x="18" y="8" width="6" height="8" fill="#E53935" />
          <rect x="26" y="8" width="5" height="8" fill="#1565C0" />
          <rect x="33" y="8" width="6" height="8" fill="#2E7D32" />
          <rect x="41" y="8" width="5" height="8" fill="#F9A825" />
          <rect x="18" y="22" width="5" height="8" fill="#6A1B9A" />
          <rect x="25" y="22" width="6" height="8" fill="#00838F" />
          <rect x="33" y="22" width="5" height="8" fill="#AD1457" />
          <rect x="40" y="22" width="6" height="8" fill="#4527A0" />
          <rect x="18" y="36" width="6" height="8" fill="#1565C0" />
          <rect x="26" y="36" width="5" height="8" fill="#E53935" />
          <rect x="33" y="36" width="5" height="8" fill="#F9A825" />
          <rect x="40" y="36" width="6" height="8" fill="#2E7D32" />
        </svg>
      );
    case 'carpet':
      return (
        <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
          <rect x="4" y="16" width="56" height="32" rx="3" fill="#fff" opacity="0.9" />
          <rect x="8" y="20" width="48" height="24" rx="1" fill="#0288D1" opacity="0.3" />
          <circle cx="20" cy="28" r="3" fill="#fff" opacity="0.7" />
          <circle cx="32" cy="28" r="3" fill="#fff" opacity="0.7" />
          <circle cx="44" cy="28" r="3" fill="#fff" opacity="0.7" />
          <circle cx="20" cy="36" r="3" fill="#fff" opacity="0.7" />
          <circle cx="32" cy="36" r="3" fill="#fff" opacity="0.7" />
          <circle cx="44" cy="36" r="3" fill="#fff" opacity="0.7" />
        </svg>
      );
  }
};
