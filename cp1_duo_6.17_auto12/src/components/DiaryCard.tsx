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

const genreBgTints: Record<string, string> = {
  pop: 'rgba(255, 171, 145, 0.15)',
  rock: 'rgba(165, 214, 167, 0.15)',
  electronic: 'rgba(144, 202, 249, 0.15)',
  classical: 'rgba(206, 147, 216, 0.15)',
  default: 'rgba(224, 224, 224, 0.06)'
};

const weekdayColors: string[] = [
  '#FFCCBC',
  '#C8E6C9',
  '#B3E5FC',
  '#F8BBD0',
  '#FFF9C4',
  '#D1C4E9'
];

const weekdayAbbr = ['日', '一', '二', '三', '四', '五', '六'];

export const DiaryCard: React.FC<DiaryCardProps> = ({ entry, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const date = new Date(entry.date);
  const day = date.getDate();
  const weekday = date.getDay();
  const genre = entry.musicInfo?.genre || 'default';
  const accentColor = genreColors[genre] || genreColors.default;
  const bgTint = genreBgTints[genre] || genreBgTints.default;
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
    <>
      <div
        className="diary-card"
        onClick={handleClick}
        data-genre={genre}
      >
        <div className="diary-card-date-tag" style={{ backgroundColor: weekdayBg }}>
          <span className="diary-card-day">{day}</span>
          <span className="diary-card-weekday">周{weekdayAbbr[weekday]}</span>
        </div>

        <div className="diary-card-content">
          {entry.musicInfo && (
            <div className="diary-card-music">
              {entry.musicInfo.coverUrl && (
                <img
                  src={entry.musicInfo.coverUrl}
                  alt={entry.musicInfo.title}
                  className="diary-card-cover"
                />
              )}
              <div className="diary-card-music-text">
                <div className="diary-card-song-title">{entry.musicInfo.title}</div>
                <div className="diary-card-artist-name">{entry.musicInfo.artist}</div>
              </div>
            </div>
          )}

          <div
            className="diary-card-text"
            dangerouslySetInnerHTML={{ __html: isExpanded ? entry.text : `<p>${summary}</p>` }}
          />

          {entry.mediaPaths.length > 0 && (
            <div className="diary-card-media-grid">
              {entry.mediaPaths.slice(0, isExpanded ? undefined : 4).map((media) => (
                <div key={media.id} className="diary-card-media-item">
                  <img
                    src={media.thumbnailUrl || media.url}
                    alt={media.filename}
                    className="diary-card-media-img"
                  />
                  {media.type === 'video' && (
                    <div className="diary-card-play-overlay">
                      <div className="diary-card-play-icon" />
                    </div>
                  )}
                </div>
              ))}
              {!isExpanded && entry.mediaPaths.length > 4 && (
                <div className="diary-card-more-indicator">
                  <span>+{entry.mediaPaths.length - 4}</span>
                </div>
              )}
            </div>
          )}

          {entry.text.length > 100 && (
            <div className="diary-card-expand-hint">
              {isExpanded ? '点击收起' : '点击展开查看更多'}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .diary-card {
          display: flex;
          gap: 16px;
          padding: 20px;
          border-radius: 12px;
          background-color: #1E1E1E;
          border-left: 4px solid ${accentColor};
          background-image: linear-gradient(${bgTint}, ${bgTint});
          cursor: pointer;
          margin-bottom: 16px;
          transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
          will-change: transform;
        }
        .diary-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .diary-card-date-tag {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 60px;
          height: 60px;
          border-radius: 8px;
          color: #333;
          font-weight: 600;
          flex-shrink: 0;
        }
        .diary-card-day {
          font-size: 20px;
          line-height: 1;
        }
        .diary-card-weekday {
          font-size: 12px;
          opacity: 0.8;
        }

        .diary-card-content {
          flex: 1;
          min-width: 0;
        }

        .diary-card-music {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 8px;
          background-color: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }
        .diary-card-cover {
          width: 48px;
          height: 48px;
          border-radius: 6px;
          object-fit: cover;
        }
        .diary-card-music-text {
          overflow: hidden;
        }
        .diary-card-song-title {
          color: #E0E0E0;
          font-weight: 500;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .diary-card-artist-name {
          color: #888;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .diary-card-text {
          color: #E0E0E0;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .diary-card-media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px;
        }
        .diary-card-media-item {
          position: relative;
          padding-top: 100%;
          border-radius: 8px;
          overflow: hidden;
        }
        .diary-card-media-img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          animation: mediaFadeIn 0.5s ease-out;
        }
        .diary-card-play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .diary-card-play-icon {
          width: 0;
          height: 0;
          border-left: 10px solid white;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          margin-left: 2px;
        }
        .diary-card-more-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          padding-top: 100%;
          border-radius: 8px;
          background-color: rgba(255, 255, 255, 0.1);
          color: #888;
          font-size: 14px;
          font-weight: 500;
          position: relative;
        }
        .diary-card-more-indicator span {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
        }
        .diary-card-expand-hint {
          margin-top: 8px;
          color: #64B5F6;
          font-size: 12px;
          text-align: center;
        }

        @keyframes mediaFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (max-width: 768px) {
          .diary-card {
            padding: 14px;
            gap: 12px;
          }
          .diary-card-date-tag {
            min-width: 48px;
            height: 48px;
          }
          .diary-card-day {
            font-size: 16px;
          }
        }
      `}</style>
    </>
  );
};
