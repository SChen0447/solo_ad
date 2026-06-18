import React from 'react';
import { Variant } from './types';
import { useStore } from './store';

interface VariantCardProps {
  variant: Variant;
  isSelected: boolean;
}

export const VariantCard: React.FC<VariantCardProps> = React.memo(({ variant, isSelected }) => {
  const selectVariant = useStore((state) => state.selectVariant);
  const deleteVariant = useStore((state) => state.deleteVariant);
  const variants = useStore((state) => state.variants);

  const handleClick = () => {
    selectVariant(variant.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (variants.length > 1) {
      deleteVariant(variant.id);
    }
  };

  return (
    <div
      className={`variant-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="variant-card-preview" style={{ backgroundColor: variant.btnColor }}>
        <span className="variant-card-letter">{variant.name.charAt(0)}</span>
      </div>
      <div className="variant-card-info">
        <span className="variant-card-name">{variant.name}</span>
        <span className="variant-card-title">{variant.title.substring(0, 12)}...</span>
      </div>
      {variants.length > 1 && (
        <button className="variant-card-delete" onClick={handleDelete} aria-label="删除变体">
          ×
        </button>
      )}
    </div>
  );
});

VariantCard.displayName = 'VariantCard';
