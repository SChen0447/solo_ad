import React, { useState } from 'react';
import { DiaryEntry } from '../types';

interface DiaryCardProps {
  entry: DiaryEntry;
  onClick?: () => void;
}

const genreColors: Record<string, string> = {
  pop: '#FFAB91',
  rock: '#A5D6A7',
  electronic: '#90CAF9',
  classical: '#CE93D8',
  default: '#E0E0E0'
};

const weekdayColors: string[] = [
  '#FFCCBC',
  '#DCEDC8',
  '#B3E5FC',
  '#F8BBD0',
  '#FFF9C4',
  '#D1C4E9'
];

const weekdayAbbr = ['日', '一', '二', '三', '四', '五', '六'];

export const DiaryCard: React.FC<DiaryCardProps> = ({ entry, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const date = new Date(entry.date);
  const day = date.getDate();
  const weekday = date.getDay();
  const bgColor = entry.musicInfo?.genre 
    ? genreColors[entry.musicInfo.genre] || genreColors.default
    : genreColors.default;
  const weekdayBg = weekdayColors[weekday % 6];

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    onClick?.();
  };

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const plainText = stripHtml(entry.text);
  const summary = plainText.length > 100 
    ? plainText.substring(0, 100) + '...' 
    : plainText;

  return (
    <div 
      className="diary-card"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        gap: '16px',
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: '#1E1E1E',
        borderLeft: `4px solid ${bgColor}`,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transition: 'all 0.3s ease-out',
        cursor: 'pointer',
        marginBottom: '16px',
        animation: 'fadeIn 0.3s ease-out'
      }}
    >
      <div 
        className="date-tag"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '60px',
          height: '60px',
          borderRadius: '8px',
          backgroundColor: weekdayBg,
          color: '#333',
          fontWeight: 600,
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: '20px', lineHeight: 1 }}>{day}</span>
        <span style={{ fontSize: '12px', opacity: 0.8 }}>周{weekdayAbbr[weekday]}</span>
      </div>

      <div className="card-content" style={{ flex: 1, minWidth: 0 }}>
        {entry.musicInfo && (
          <div 
            className="music-info"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
              padding: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px'
            }}
          >
            {entry.musicInfo.coverUrl && (
              <img 
                src={entry.musicInfo.coverUrl} 
                alt={entry.musicInfo.title}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '6px',
                  objectFit: 'cover'
                }}
              />
            )}
            <div style={{ overflow: 'hidden' }}>
              <div 
                className="song-title"
                style={{
                  color: '#E0E0E0',
                  fontWeight: 500,
                  fontSize: '14px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {entry.musicInfo.title}
              </div>
              <div 
                className="artist-name"
                style={{
                  color: '#888',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {entry.musicInfo.artist}
              </div>
            </div>
          </div>
        )}

        <div 
          className="text-content"
          style={{
            color: '#E0E0E0',
            fontSize: '14px',
            lineHeight: 1.6,
            marginBottom: '12px'
          }}
          dangerouslySetInnerHTML={{ __html: isExpanded ? entry.text : `<p>${summary}</p>` }}
        />

        {entry.mediaPaths.length > 0 && (
          <div 
            className="media-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: '8px'
            }}
          >
            {entry.mediaPaths.slice(0, isExpanded ? undefined : 4).map((media) => (
              <div 
                key={media.id}
                className="media-item"
                style={{
                  position: 'relative',
                  paddingTop: '100%',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  animation: 'fadeIn 0.3s ease-out'
                }}
              >
                <img 
                  src={media.thumbnailUrl || media.url} 
                  alt={media.filename}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                {media.type === 'video' && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <div 
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: '10px solid white',
                        borderTop: '6px solid transparent',
                        borderBottom: '6px solid transparent',
                        marginLeft: '2px'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
            {!isExpanded && entry.mediaPaths.length > 4 && (
              <div 
                className="more-indicator"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: '100%',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#888',
                  fontSize: '14px',
                  fontWeight: 500,
                  position: 'relative'
                }}
              >
                <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)' }}>
                  +{entry.mediaPaths.length - 4}
                </span>
              </div>
            )}
          </div>
        )}

        {entry.text.length > 100 && (
          <div 
            className="expand-hint"
            style={{
              marginTop: '8px',
              color: '#64B5F6',
              fontSize: '12px',
              textAlign: 'center'
            }}
          >
            {isExpanded ? '点击收起' : '点击展开查看更多'}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
