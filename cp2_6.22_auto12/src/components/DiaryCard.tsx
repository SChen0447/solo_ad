import { useState } from 'react';
import { DiaryEntry } from '../types';
import { formatDateDisplay } from '../utils/calendarHelper';
import './DiaryCard.css';

interface DiaryCardProps {
  entry: DiaryEntry;
}

export default function DiaryCard({ entry }: DiaryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSummary = (content: string, maxLength: number = 50): string => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  const getKeywordFontSize = (index: number): number => {
    const sizes = [28, 24, 22, 20, 18, 16, 15, 14];
    return sizes[Math.min(index, sizes.length - 1)];
  };

  const getKeywordOpacity = (index: number): number => {
    return 1 - (index * 0.08);
  };

  return (
    <div
      className={`diary-card ${isExpanded ? 'expanded' : ''}`}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div
        className="card-color-band"
        style={{ backgroundColor: entry.moodColor }}
      />
      <div className="card-content">
        <div className="card-header">
          <span className="card-date">{formatDateDisplay(entry.date)}</span>
          <span
            className="card-mood-dot"
            style={{ backgroundColor: entry.moodColor }}
          />
        </div>
        {isExpanded ? (
          <div className="card-expanded">
            <p className="card-full-text">{entry.content}</p>
            {entry.keywords.length > 0 && (
              <div className="keyword-cloud">
                <div className="keyword-cloud-title">关键词</div>
                <div className="keyword-cloud-words">
                  {entry.keywords.map((keyword, index) => (
                    <span
                      key={keyword}
                      className="keyword-tag"
                      style={{
                        fontSize: `${getKeywordFontSize(index)}px`,
                        color: entry.moodColor,
                        opacity: getKeywordOpacity(index),
                      }}
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="card-summary">{getSummary(entry.content)}</p>
        )}
      </div>
    </div>
  );
}
