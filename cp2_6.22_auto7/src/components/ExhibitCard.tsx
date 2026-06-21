import React, { useState, useMemo } from 'react';
import { Exhibit, api } from '../utils/api';

interface ExhibitCardProps {
  exhibit: Exhibit;
  index: number;
  onCardClick: (exhibit: Exhibit) => void;
  onGenerateQR: (exhibit: Exhibit) => void;
  onRefresh: () => void;
}

const lightColors = [
  '#E0E7FF', '#FCE7F3', '#DCFCE7', '#FEF3C7',
  '#DBEAFE', '#F3E8FF', '#CCFBF1', '#FFEDD5',
];

const ExhibitCard: React.FC<ExhibitCardProps> = ({
  exhibit,
  index,
  onCardClick,
  onGenerateQR,
  onRefresh,
}) => {
  const [liked, setLiked] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [imageError, setImageError] = useState(false);

  const placeholderColor = useMemo(() => {
    const hash = exhibit.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return lightColors[hash % lightColors.length];
  }, [exhibit.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);

    const newLiked = !liked;
    setLiked(newLiked);
    try {
      await api.interact(exhibit.id, newLiked ? 'like' : 'unlike');
      onRefresh();
    } catch (err) {
      console.error('Failed to update like:', err);
      setLiked(!newLiked);
    }
  };

  const handleQRClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.interact(exhibit.id, 'scan');
      onRefresh();
    } catch (err) {
      console.error('Failed to log scan:', err);
    }
    onGenerateQR(exhibit);
  };

  const cardStyle: React.CSSProperties = {
    width: '280px',
    borderRadius: '16px',
    background: '#FFFFFF',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
    animation: `cardFadeIn 0.5s ease-out ${index * 0.05}s both`,
  };

  return (
    <div
      style={cardStyle}
      className="exhibit-card"
      onClick={() => onCardClick(exhibit)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-10px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.18)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '220px',
          background: imageError ? placeholderColor : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {!imageError && (
          <img
            src={exhibit.imageUrl}
            alt={exhibit.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: imageError ? 'none' : 'block',
            }}
            onError={() => setImageError(true)}
          />
        )}
        {imageError && (
          <div
            style={{
              fontSize: '48px',
              opacity: 0.3,
              color: '#6366F1',
              fontWeight: 700,
            }}
          >
            {exhibit.name.charAt(0)}
          </div>
        )}

        <button
          onClick={handleQRClick}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#6366F1',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.2s ease',
            boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#6366F1';
          }}
          title="生成二维码标签"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <path d="M14 14h3v3h-3zM20 14h1M14 20h1M17 17h4M17 20h4" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#111827',
            lineHeight: 1.4,
            marginBottom: '6px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {exhibit.name}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#6B7280',
            marginBottom: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {exhibit.author} · {exhibit.material}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: '#6B7280',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{exhibit.scanCount}</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <button
              onClick={handleLike}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.3s ease',
                transform: likeAnimating ? 'scale(1.2)' : 'scale(1)',
              }}
              title="点赞"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill={liked ? '#EF4444' : 'none'}
                stroke={liked ? '#EF4444' : '#6B7280'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <span style={{ fontSize: '14px', color: '#6B7280', minWidth: '24px' }}>
              {exhibit.likeCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExhibitCard;
