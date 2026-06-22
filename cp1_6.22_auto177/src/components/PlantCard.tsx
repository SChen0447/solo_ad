import React from 'react';
import { useGameStore } from '../PlayerState';
import { PLANT_LEVELS } from '../types';

export const PlantCard: React.FC = React.memo(() => {
  const selectedCard = useGameStore(s => s.selectedCard);
  const sunlight = useGameStore(s => s.sunlight);
  const selectCard = useGameStore(s => s.selectCard);
  const isSelected = selectedCard === 'plant';
  const cost = PLANT_LEVELS[1].cost;
  const canAfford = sunlight >= cost;

  const handleClick = () => {
    if (!canAfford) return;
    selectCard(isSelected ? null : 'plant');
  };

  return (
    <div
      className={`plant-card ${isSelected ? 'selected' : ''} ${!canAfford ? 'disabled' : ''}`}
      onClick={handleClick}
    >
      <div className="plant-card-icon">
        <div className="card-plant-sprite">
          <div className="card-stem" />
          <div className="card-leaf card-leaf-left" />
          <div className="card-leaf card-leaf-right" />
        </div>
      </div>
      <div className="plant-card-info">
        <span className="plant-card-name">豌豆射手</span>
        <span className="plant-card-cost">
          <span className="sun-icon">☀</span> {cost}
        </span>
      </div>
      <div className="plant-card-stats">
        <span>ATK: {PLANT_LEVELS[1].attackPower}</span>
        <span>RNG: {PLANT_LEVELS[1].range}</span>
        <span>SPD: {PLANT_LEVELS[1].attackSpeed}s</span>
      </div>
    </div>
  );
});
PlantCard.displayName = 'PlantCard';

export const PlantCardBar: React.FC = React.memo(() => {
  return (
    <div className="plant-card-bar">
      <PlantCard />
    </div>
  );
});
PlantCardBar.displayName = 'PlantCardBar';
