import React from 'react';
import { Plant } from '../types';

interface PlantCardProps {
  plant: Plant;
  onClick: (plant: Plant) => void;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick }) => {
  const hoursSinceWatered = (Date.now() - new Date(plant.lastWatered).getTime()) / (1000 * 60 * 60);
  const daysSinceWatered = hoursSinceWatered / 24;
  const needsWater = daysSinceWatered > 3;

  return (
    <div
      onClick={() => onClick(plant)}
      style={{
        width: 240,
        borderRadius: 10,
        background: 'linear-gradient(135deg, #E8F5E9, #FFFFFF)',
        overflow: 'hidden',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        position: 'relative',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      }}
    >
      <div style={{
        height: '40%',
        minHeight: 120,
        backgroundImage: `url(${plant.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#C8E6C9',
      }} />
      <div style={{ padding: '12px 14px', position: 'relative' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#2E7D32', marginBottom: 4 }}>
          {plant.name}
        </div>
        <div style={{ fontSize: 12, color: '#757575' }}>
          最后浇水: {daysSinceWatered < 1 ? '今天' : `${Math.floor(daysSinceWatered)}天前`}
        </div>
        <svg
          viewBox="0 0 24 24"
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            width: 22,
            height: 22,
            fill: needsWater ? '#F44336' : '#42A5F5',
            animation: needsWater ? 'blink 1s infinite' : 'none',
          }}
        >
          <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z"/>
        </svg>
        {needsWater && (
          <style>{`@keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
        )}
      </div>
    </div>
  );
};

export default PlantCard;
