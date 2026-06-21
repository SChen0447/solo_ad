import React, { useState, useRef, useEffect } from 'react';
import { Plant } from '@/types';
import { getDaysUntilWatering, isOverdue } from '@/utils/dateUtils';
import { PlantIcon } from './PlantIcon';

interface PlantCardProps {
  plant: Plant;
  onClick: () => void;
  isHighlighted?: boolean;
  showWarning?: boolean;
  onQuickWater?: (plantId: string) => void;
  onViewLog?: (plantId: string) => void;
}

export const PlantCard: React.FC<PlantCardProps> = ({
  plant,
  onClick,
  isHighlighted,
  showWarning = true,
  onQuickWater,
  onViewLog,
}) => {
  const daysUntil = getDaysUntilWatering(plant);
  const overdue = isOverdue(plant);
  const severelyOverdue = showWarning && overdue && Math.abs(daysUntil) > 7;
  const isAbundant = !overdue && daysUntil > 30;
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCountdownColor = () => {
    if (overdue) return '#DC2626';
    if (isAbundant) return '#2563EB';
    return '#16A34A';
  };

  const countdownColor = getCountdownColor();

  const cardStyle: React.CSSProperties = {
    width: 220,
    borderRadius: 12,
    background: 'linear-gradient(to bottom, #E8F5E9, #FFFFFF)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out, border 0.3s ease-out',
    position: 'relative',
    border: isHighlighted ? '3px solid #22C55E' : severelyOverdue ? '2px dashed #DC2626' : 'none',
    animation: isHighlighted ? 'pulse-border 0.9s ease-out' : 'none',
    boxSizing: 'border-box' as const,
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
    borderTop: severelyOverdue ? '1px dashed #DC2626' : '1px solid #E5E7EB',
    flexWrap: 'wrap' as const,
  };

  const countdownTextStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: countdownColor,
  };

  const warningIconStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
  };

  const threeDotButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
    opacity: isHovered || showMenu ? 1 : 0,
    transition: 'opacity 0.2s ease, transform 0.2s ease',
    transform: showMenu ? 'scale(1)' : 'scale(0.9)',
  };

  const dropdownMenuStyle: React.CSSProperties = {
    position: 'absolute',
    top: 48,
    right: 12,
    backgroundColor: 'white',
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
    zIndex: 10,
    overflow: 'hidden',
    minWidth: 140,
    opacity: showMenu ? 1 : 0,
    transform: showMenu ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.95)',
    transition: 'all 0.2s ease-out',
    pointerEvents: showMenu ? 'auto' : 'none',
  };

  const menuItemStyle: React.CSSProperties = {
    padding: '10px 14px',
    fontSize: 13,
    color: '#374151',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: 'none',
    backgroundColor: 'transparent',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'background-color 0.15s ease',
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHovered(true);
    e.currentTarget.style.transform = 'scale(1.03)';
    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.12)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHovered(false);
    if (!showMenu) {
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
    }
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

  const handleThreeDotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(prev => !prev);
  };

  const handleQuickWater = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onQuickWater) {
      onQuickWater(plant.id);
    }
  };

  const handleViewLog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onViewLog) {
      onViewLog(plant.id);
    }
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
      <button
        style={threeDotButtonStyle}
        onClick={handleThreeDotClick}
        onMouseEnter={(e) => e.stopPropagation()}
        onMouseLeave={(e) => e.stopPropagation()}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      <div ref={menuRef} style={dropdownMenuStyle}>
        <button
          style={menuItemStyle}
          onClick={handleQuickWater}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F0FDF4')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          标记已浇水
        </button>
        <button
          style={menuItemStyle}
          onClick={handleViewLog}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          查看养护日志
        </button>
      </div>
      <img src={plant.photoUrl} alt={plant.name} style={photoStyle} />
      <div style={infoStyle}>
        <h3 style={nameStyle}>{plant.name}</h3>
        <p style={speciesStyle}>{plant.species}</p>
        <div style={countdownStyle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={countdownColor} strokeWidth="2">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
          <span style={countdownTextStyle}>{formatCountdown()}</span>
          {severelyOverdue && (
            <span style={warningIconStyle} title="严重逾期">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#DC2626" stroke="#DC2626" strokeWidth="1">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" />
                <line x1="12" y1="17" x2="12.01" y2="17" stroke="white" strokeWidth="2" />
              </svg>
            </span>
          )}
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
