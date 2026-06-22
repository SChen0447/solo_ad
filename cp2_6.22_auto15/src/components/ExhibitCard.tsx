import { useState, useMemo } from 'react';
import { Exhibit, interact } from '../utils/api';

interface Props {
  exhibit: Exhibit;
  onRefresh: (updated: Exhibit) => void;
  onOpenDetail: () => void;
  onOpenQR: () => void;
}

const LIGHT_COLORS = [
  '#FEE2E2', '#FECACA', '#FED7AA', '#FEF3C7', '#FEF9C3',
  '#F0FDF4', '#DCFCE7', '#D1FAE5', '#D9F99D', '#ECFCCB',
  '#ECFEFF', '#CFFAFE', '#CFFAFE', '#DBEAFE', '#E0E7FF',
  '#EDE9FE', '#F3E8FF', '#FCE7F3', '#FCE7F3', '#FBCFE8',
];

function randomLightColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % LIGHT_COLORS.length;
  return LIGHT_COLORS[idx];
}

function EyeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#EF4444" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  );
}

function QRIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
      <path d="M14 14h3v3h-3z"></path>
      <path d="M20 14h1v1h-1z"></path>
      <path d="M14 20h1v1h-1z"></path>
      <path d="M17 17h4v4h-4z"></path>
    </svg>
  );
}

export default function ExhibitCard({ exhibit, onRefresh, onOpenDetail, onOpenQR }: Props) {
  const [liked, setLiked] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [imgError, setImgError] = useState(false);

  const placeholderBg = useMemo(() => randomLightColor(exhibit.id), [exhibit.id]);

  async function handleQRClick(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const result = await interact(exhibit.id, 'scan');
      onRefresh({ ...exhibit, scanCount: result.scanCount });
    } catch (err) {
      console.error('扫码记录失败:', err);
    }
    onOpenQR();
  }

  async function handleLikeClick(e: React.MouseEvent) {
    e.stopPropagation();
    setLikeAnimating(true);
    setTimeout(() => setLikeAnimating(false), 300);
    try {
      const result = await interact(exhibit.id, liked ? 'unlike' : 'like');
      setLiked(!liked);
      onRefresh({ ...exhibit, likeCount: result.likeCount });
    } catch (err) {
      console.error('点赞失败:', err);
    }
  }

  const displayLikeCount = liked ? exhibit.likeCount + 1 : exhibit.likeCount;

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    cursor: 'pointer',
    transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
    position: 'relative',
  };

  const qrBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#6366F1',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
    zIndex: 10,
    transition: 'background-color 0.2s ease',
  };

  const imageWrapStyle: React.CSSProperties = {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '16px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
    marginBottom: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const authorStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
    marginBottom: '12px',
  };

  const descStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#4B5563',
    lineHeight: 1.5,
    margin: 0,
    marginBottom: '16px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTop: '1px solid #F3F4F6',
    paddingTop: '12px',
  };

  const scanCountStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#6B7280',
  };

  const likeBtnStyle: React.CSSProperties = {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: liked ? '1px solid #EF4444' : '1px solid #D1D5DB',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: liked ? '#EF4444' : '#6B7280',
    transition: 'border-color 0.2s ease, color 0.2s ease',
    transform: likeAnimating ? 'scale(1.2)' : 'scale(1)',
    transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    transitionDuration: '0.3s',
  };

  const likeCountWrapStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  const likeCountTextStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6B7280',
    minWidth: '20px',
  };

  return (
    <div
      style={cardStyle}
      onClick={onOpenDetail}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-10px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.15)';
        const qrBtn = e.currentTarget.querySelector('.qr-btn') as HTMLElement | null;
        if (qrBtn) qrBtn.style.backgroundColor = '#4F46E5';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
        const qrBtn = e.currentTarget.querySelector('.qr-btn') as HTMLElement | null;
        if (qrBtn) qrBtn.style.backgroundColor = '#6366F1';
      }}
    >
      <button
        className="qr-btn"
        style={qrBtnStyle}
        onClick={handleQRClick}
        title="生成二维码标签"
      >
        <QRIcon />
      </button>

      <div style={imageWrapStyle}>
        {!imgError && exhibit.imageUrl ? (
          <img
            src={exhibit.imageUrl}
            alt={exhibit.name}
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '4 / 3',
              backgroundColor: placeholderBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
              fontSize: '14px',
            }}
          >
            {exhibit.name.charAt(0)}
          </div>
        )}
      </div>

      <div style={bodyStyle}>
        <h3 style={titleStyle} title={exhibit.name}>{exhibit.name}</h3>
        <p style={authorStyle}>{exhibit.author}</p>
        <p style={descStyle}>{exhibit.description}</p>

        <div style={footerStyle}>
          <div style={scanCountStyle}>
            <EyeIcon />
            <span>{exhibit.scanCount} 次扫码</span>
          </div>
          <div style={likeCountWrapStyle}>
            <button
              style={likeBtnStyle}
              onClick={handleLikeClick}
              title={liked ? '取消点赞' : '点赞'}
            >
              <HeartIcon filled={liked} />
            </button>
            <span style={likeCountTextStyle}>{displayLikeCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
