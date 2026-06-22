import React from 'react';
import type { Plant } from '@/types';

const categoryColors: Record<string, string> = {
  leaf: '#10B981',
  fruit: '#F97316',
  root: '#8B5CF6',
};

const categoryLabels: Record<string, string> = {
  leaf: '叶菜',
  fruit: '果实类',
  root: '根茎类',
};

interface PlantCardProps {
  plant: Plant;
  onClick: (plant: Plant) => void;
}

const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick }) => {
  const borderColor = categoryColors[plant.category] || '#10B981';

  return (
    <div
      className="plant-card"
      style={{
        width: '240px',
        height: '320px',
        borderRadius: '12px',
        background: '#F9FAFB',
        borderBottom: `8px solid ${borderColor}`,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      }}
      onClick={() => onClick(plant)}
    >
      <div
        style={{
          height: '160px',
          background: `url(${plant.imageUrl}) center/cover no-repeat, linear-gradient(135deg, #D1FAE5, #A7F3D0)`,
          flexShrink: 0,
        }}
      />
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>
            {plant.name}
          </div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: '999px',
              background: borderColor + '20',
              color: borderColor,
              fontWeight: 600,
            }}
          >
            {categoryLabels[plant.category] || plant.category}
          </span>
        </div>
        <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.6' }}>
          <div>成熟周期：{plant.maturityDays}天</div>
          <div>浇水：每{plant.wateringFrequency}天 · 施肥：每{plant.fertilizingCycle}天</div>
        </div>
      </div>
    </div>
  );
};

export default PlantCard;
