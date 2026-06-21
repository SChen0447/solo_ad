import { useState } from 'react';
import type { Keyword } from '../utils/moodAnalyzer';
import type { DiaryEntry } from '../App';

interface TimelineProps {
  entries: DiaryEntry[];
  onSelectDate: (date: string) => void;
}

function truncateSummary(text: string, maxLines = 2, maxChars = 60): string {
  let result = text.replace(/\n/g, ' ');
  if (result.length > maxChars) {
    result = result.slice(0, maxChars) + '…';
  }
  return result;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return `${y}年${parseInt(m)}月${parseInt(d)}日 · ${weekdays[date.getDay()]}`;
}

function KeywordCloud({ keywords, moodColor }: { keywords: Keyword[]; moodColor: string }) {
  const adjustColor = (hex: string, amount: number): string => {
    const h = hex.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(h.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(h.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(h.slice(4, 6), 16) + amount));
    return `rgb(${r},${g},${b})`;
  };

  const variants = [
    moodColor,
    adjustColor(moodColor, -20),
    adjustColor(moodColor, 20),
    adjustColor(moodColor, -40),
    adjustColor(moodColor, 35),
  ];

  return (
    <div className="keyword-cloud">
      {keywords.map((kw, idx) => {
        const fontSize = 14 + kw.weight * 14;
        const opacity = 0.55 + kw.weight * 0.45;
        const color = variants[idx % variants.length];
        return (
          <span
            key={`${kw.text}-${idx}`}
            className="keyword-tag"
            style={{
              fontSize: `${fontSize}px`,
              opacity,
              color: '#1F2937',
              background: color,
              animationDelay: `${idx * 0.05}s`,
            }}
          >
            {kw.text}
          </span>
        );
      })}
      <style>{`
        .keyword-cloud {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px dashed #E5E7EB;
        }
        .keyword-tag {
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 500;
          display: inline-block;
          animation: fadeInUp 0.4s ease-out backwards;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default function Timeline({ entries, onSelectDate }: TimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sortedEntries = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  const toggleExpand = (id: string, date: string) => {
    setExpandedId(prev => (prev === id ? null : id));
    onSelectDate(date);
  };

  if (sortedEntries.length === 0) {
    return (
      <div className="timeline-empty">
        <div className="empty-illustration">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#C7D2FE" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="13" x2="15" y2="13"/>
            <line x1="9" y1="17" x2="15" y2="17"/>
          </svg>
        </div>
        <p className="empty-title">还没有日记</p>
        <p className="empty-desc">记录今天的心情，开启时间线旅程</p>
        <style>{`
          .timeline-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
            color: #9CA3AF;
          }
          .empty-illustration {
            margin-bottom: 16px;
            opacity: 0.7;
          }
          .empty-title {
            font-size: 16px;
            color: #6B7280;
            margin: 0 0 6px;
            font-weight: 500;
          }
          .empty-desc {
            font-size: 13px;
            margin: 0;
            color: #9CA3AF;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <span className="timeline-title">心情时间线</span>
        <span className="timeline-count">{sortedEntries.length} 篇记录</span>
      </div>
      <div className="timeline-list">
        {sortedEntries.map((entry, index) => {
          const isExpanded = expandedId === entry.id;
          return (
            <div
              key={entry.id}
              className={`diary-card ${isExpanded ? 'is-expanded' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => toggleExpand(entry.id, entry.date)}
            >
              <div className="card-ribbon" style={{ background: entry.moodColor }} />
              <div className="card-body">
                <div className="card-header-row">
                  <span className="card-date">{formatDisplayDate(entry.date)}</span>
                  <span
                    className="card-mood-dot"
                    style={{ background: entry.moodColor }}
                  />
                </div>
                <div className="card-mood-badge" style={{ background: `${entry.moodColor}40`, color: '#4B5563' }}>
                  {entry.moodName}
                </div>
                {isExpanded ? (
                  <>
                    <p className="card-content-full">{entry.content}</p>
                    <KeywordCloud keywords={entry.keywords} moodColor={entry.moodColor} />
                  </>
                ) : (
                  <p className="card-summary">{truncateSummary(entry.content)}</p>
                )}
                <div className="card-expand-hint">
                  {isExpanded ? '点击收起' : '点击展开查看详情'}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease-out' }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        .timeline-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 4px;
        }
        .timeline-title {
          font-size: 17px;
          font-weight: 600;
          color: #111827;
        }
        .timeline-count {
          font-size: 13px;
          color: #9CA3AF;
          background: #F3F4F6;
          padding: 3px 10px;
          border-radius: 10px;
        }
        .timeline-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          max-height: calc(100vh - 340px);
          overflow-y: auto;
          padding-right: 4px;
        }
        .timeline-list::-webkit-scrollbar {
          width: 6px;
        }
        .timeline-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .timeline-list::-webkit-scrollbar-thumb {
          background: #E5E7EB;
          border-radius: 3px;
        }
        .timeline-list::-webkit-scrollbar-thumb:hover {
          background: #D1D5DB;
        }
        .diary-card {
          width: 100%;
          max-width: 280px;
          border-radius: 16px;
          background: #FFFFFF;
          border: 2px solid #E5E7EB;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.3s ease-out, box-shadow 0.3s ease-out, border-color 0.3s ease-out;
          animation: slideInUp 0.4s ease-out backwards;
          position: relative;
        }
        .diary-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(99, 102, 241, 0.08);
          border-color: #C7D2FE;
        }
        .diary-card.is-expanded {
          border-color: #C7D2FE;
          box-shadow: 0 10px 24px rgba(99, 102, 241, 0.15);
        }
        .card-ribbon {
          height: 8px;
          width: 100%;
        }
        .card-body {
          padding: 16px;
        }
        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .card-date {
          font-size: 14px;
          color: #6B7280;
        }
        .card-mood-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 3px #E5E7EB;
        }
        .card-mood-badge {
          display: inline-block;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 8px;
          margin-bottom: 10px;
          font-weight: 500;
        }
        .card-summary {
          font-size: 16px;
          color: #374151;
          line-height: 1.6;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-content-full {
          font-size: 15px;
          color: #374151;
          line-height: 1.75;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .card-expand-hint {
          margin-top: 12px;
          font-size: 12px;
          color: #9CA3AF;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
