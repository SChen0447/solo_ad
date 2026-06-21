import React from 'react';
import { Plant } from '@/types';
import { getDaysUntilWatering, isOverdue } from '@/utils/dateUtils';
import { PlantIcon } from './PlantIcon';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
  isHighlighted?: boolean;
}

export const PlantCard: React.FC<PlantCardProps> = ({ plant, onClick, isHighlighted }) => {
  const daysUntil = getDaysUntilWatering(plant);
  const overdue = isOverdue(plant);

  const cardStyle: React.CSSProperties = {
    width: 220,
    borderRadius: 12,
    background: 'linear-gradient(to bottom, #E8F5E9, #FFFFFF)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
    position: 'relative',
    border: isHighlighted ? '3px solid #22C55E' : 'none',
    animation: isHighlighted ? 'pulse-border 0.9s ease-out' : 'none',
  };

  const iconContainerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  };

  const photoStyle: React.CSSProperties = {
    width: '100%',
    height: 140,
    objectFit: 'cover' as const,
  };

  const infoStyle: React.CSSProperties = {
    padding: '12px 16px',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    color: '#1F2937',
    margin: 0,
    marginBottom: 4,
  };

  const speciesStyle: React.CSSProperties = {
    fontSize: 13,
    color: '#6B7280',
    margin: 0,
    marginBottom: 12,
  };

  const countdownStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTop: '1px solid #E5E7EB',
  };

  const countdownTextStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: overdue ? '#DC2626' : '#16A34A',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1.03)';
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
  };

  const formatCountdown = () => {
    if (overdue) {
      const overdueDays = Math.abs(daysUntil);
      if (overdueDays === 0) return '今天需要浇水';
      return `逾期 ${overdueDays} 天`;
    }
    if (daysUntil === 0) return '今天需要浇水';
    if (daysUntil === 1) return '明天需要浇水';
    return `还有 ${daysUntil} 天浇水`;
  };

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div style={iconContainerStyle}>
        <PlantIcon type={plant.type} size={20} />
      </div>
      <img src={plant.photoUrl} alt={plant.name} style={photoStyle} />
      <div style={infoStyle}>
        <h3 style={nameStyle}>{plant.name}</h3>
        <p style={speciesStyle}>{plant.species}</p>
        <div style={countdownStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={overdue ? '#DC2626' : '#16A34A'} strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span style={countdownTextStyle}>{formatCountdown()}</span>
        </div>
      </div>
      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
        }
      `}</style>
    </div>
  );
};
