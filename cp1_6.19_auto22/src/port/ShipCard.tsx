import React from 'react';
import type { Ship } from '../store/gameStore';

interface ShipCardProps {
  ship: Ship;
  selected: boolean;
  onClick: () => void;
}

const ShipCard: React.FC<ShipCardProps> = ({ ship, selected, onClick }) => {
  const durabilityPercent = (ship.currentDurability / ship.maxDurability) * 100;

  const getDurabilityColor = () => {
    if (durabilityPercent > 60) return '#4CAF50';
    if (durabilityPercent > 30) return '#FF9800';
    return '#f44336';
  };

  return (
    <div
      className={`ship-card ${selected ? 'selected' : ''} ${ship.isDamaged ? 'damaged' : ''}`}
      onClick={onClick}
    >
      <div className="ship-card-header">
        <h3 className="ship-name">{ship.name}</h3>
        <span className="ship-level">Lv.{ship.level}</span>
      </div>

      <div className="ship-stats">
        <div className="stat-row">
          <span className="stat-label">耐久度</span>
          <div className="durability-bar-container">
            <div
              className="durability-bar"
              style={{
                width: `${durabilityPercent}%`,
                backgroundColor: getDurabilityColor(),
              }}
            />
          </div>
          <span className="stat-value">
            {ship.currentDurability}/{ship.maxDurability}
          </span>
        </div>

        <div className="stat-row">
          <span className="stat-label">火炮等级</span>
          <div className="cannon-stars">
            {[1, 2, 3].map((i) => (
              <span key={i} className={`star ${i <= ship.cannonLevel ? 'active' : ''}`}>
                ★
              </span>
            ))}
          </div>
        </div>
      </div>

      {ship.isDamaged && (
        <div className="damaged-badge">已损坏</div>
      )}
    </div>
  );
};

export default ShipCard;
