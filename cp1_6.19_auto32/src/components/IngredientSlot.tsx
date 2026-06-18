import React, { useEffect, useRef, useState } from 'react';
import type { Ingredient } from '../types';
import { INGREDIENTS } from '../data';

interface IngredientSlotProps {
  index: 0 | 1 | 2;
  ingredient: Ingredient | null;
  onDrop: (index: 0 | 1 | 2, ingredient: Ingredient) => void;
}

const RIVETS_POSITIONS = [
  { top: '4px', left: '50%', transform: 'translateX(-50%)' },
  { top: '18px', right: '10px', transform: 'rotate(0deg)' },
  { bottom: '18px', right: '10px', transform: 'rotate(0deg)' },
  { bottom: '4px', left: '50%', transform: 'translateX(-50%)' },
  { bottom: '18px', left: '10px', transform: 'rotate(0deg)' },
  { top: '18px', left: '10px', transform: 'rotate(0deg)' },
];

export const IngredientSlot: React.FC<IngredientSlotProps> = ({ index, ingredient, onDrop }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [bounceKey, setBounceKey] = useState(0);
  const [rippleKey, setRippleKey] = useState(0);
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (ingredient && ingredient.id !== prevIdRef.current) {
      setBounceKey(k => k + 1);
      setRippleKey(k => k + 1);
      prevIdRef.current = ingredient.id;
    } else if (!ingredient) {
      prevIdRef.current = null;
    }
  }, [ingredient]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const id = e.dataTransfer.getData('ingredient/id');
    const ing = INGREDIENTS.find(i => i.id === id);
    if (ing) {
      onDrop(index, ing);
    }
  };

  const liquidStyle: React.CSSProperties = ingredient
    ? {
        background: `radial-gradient(circle at 40% 35%, ${ingredient.color}ee 0%, ${ingredient.color}bb 55%, ${ingredient.color}88 100%)`,
      }
    : { background: 'transparent' };

  return (
    <div
      className={`slot ${isDragOver ? 'drag-over' : ''} ${bounceKey ? 'bounce' : ''}`}
      key={bounceKey}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {RIVETS_POSITIONS.map((pos, i) => (
        <div key={i} className="rivet" style={pos} />
      ))}
      <div className="slot-liquid">
        <div
          className={`slot-liquid-inner ${ingredient ? 'fill' : ''}`}
          style={liquidStyle}
        />
        <svg
          key={rippleKey}
          className={`ripple-svg ${rippleKey && ingredient ? 'show' : ''}`}
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`waveGrad-${index}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={ingredient?.color ?? '#fff'} stopOpacity="0.7" />
              <stop offset="100%" stopColor={ingredient?.color ?? '#fff'} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2].map(i => (
            <circle
              key={i}
              cx="60"
              cy="60"
              r="20"
              fill="none"
              stroke={`url(#waveGrad-${index})`}
              strokeWidth="3"
            >
              <animate
                attributeName="r"
                from="16"
                to="52"
                dur="1.1s"
                begin={`${i * 0.2}s`}
                repeatCount="1"
              />
              <animate
                attributeName="opacity"
                from="0.8"
                to="0"
                dur="1.1s"
                begin={`${i * 0.2}s`}
                repeatCount="1"
              />
            </circle>
          ))}
          <path d="M10 60 Q30 50, 60 60 T110 60" stroke={ingredient?.glow ?? '#fff'} strokeWidth="2" fill="none" opacity="0.6">
            <animate attributeName="d" values="M10 60 Q30 50, 60 60 T110 60; M10 60 Q30 70, 60 60 T110 60; M10 60 Q30 50, 60 60 T110 60" dur="0.8s" repeatCount="2" />
          </path>
        </svg>
      </div>
    </div>
  );
};

export default IngredientSlot;
