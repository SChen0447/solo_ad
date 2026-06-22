import { useState } from 'react';
import { DiaryEntry, ViewMode } from '../types';
import { getRecentDays, formatDateKey, formatDateDisplay } from '../utils/calendarHelper';
import { getMoodLabel, getMoodHoverColor } from '../utils/moodAnalyzer';
import './MoodBar.css';

interface MoodBarProps {
  entries: DiaryEntry[];
}

export default function MoodBar({ entries }: MoodBarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const recentDays = getRecentDays(7);
  const diaryMap = new Map<string, DiaryEntry>();
  entries.forEach(e => diaryMap.set(e.date, e));

  const moodData = recentDays.map(date => {
    const dateStr = formatDateKey(date);
    const diary = diaryMap.get(dateStr);
    const moodLabel = diary ? getMoodLabel(diary.moodLevel) : '';
    const baseColor = diary?.moodColor || '#e5e7eb';
    return {
      date: dateStr,
      displayDate: formatDateDisplay(date),
      shortDate: `${date.getMonth() + 1}/${date.getDate()}`,
      hasMood: !!diary,
      color: baseColor,
      hoverColor: getMoodHoverColor(baseColor),
      keywords: diary?.keywords || [],
      moodLevel: diary?.moodLevel ?? 50,
      moodLabel,
    };
  });

  const renderCurve = () => {
    const blockWidth = 40;
    const gap = 6;
    const totalWidth = 7 * blockWidth + 6 * gap;
    const curveHeight = 60;
    const svgHeight = 100;
    
    const points = moodData.map((d, i) => {
      const x = i * (blockWidth + gap) + blockWidth / 2;
      const y = svgHeight - (d.moodLevel / 100) * curveHeight - 10;
      return { x, y, color: d.color };
    });

    let pathD = '';
    for (let i = 0; i < points.length; i++) {
      if (i === 0) {
        pathD += `M ${points[i].x} ${points[i].y}`;
      } else {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx1 = prev.x + (blockWidth + gap) / 3;
        const cpx2 = curr.x - (blockWidth + gap) / 3;
        pathD += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
      }
    }

    const gradientColors = moodData
      .filter(d => d.hasMood)
      .map(d => d.color);

    return (
      <svg
        className="mood-curve-svg"
        width={totalWidth}
        height={svgHeight}
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
      >
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            {gradientColors.length > 0 ? gradientColors.map((color, i) => (
              <stop
                key={i}
                offset={`${(i / (gradientColors.length - 1)) * 100}%`}
                stopColor={color}
              />
            )) : (
              <>
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#6366F1" />
              </>
            )}
          </linearGradient>
        </defs>
        <path
          d={pathD}
          fill="none"
          stroke="url(#curveGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          className="curve-path"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="5"
            fill={p.color}
            stroke="white"
            strokeWidth="2"
            className="curve-point"
            style={{ animationDelay: `${i * 0.2 + 1}s` }}
          />
        ))}
      </svg>
    );
  };

  return (
    <div className="mood-bar-container">
      <div className="mood-bar-header">
        <h2 className="mood-bar-title">最近7天心情</h2>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            日视图
          </button>
          <button
            className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            周视图
          </button>
        </div>
      </div>
      
      <div className="mood-bar-content">
        {viewMode === 'week' && (
          <div className="curve-container">
            {renderCurve()}
          </div>
        )}
        
        <div className="mood-blocks">
          {moodData.map((day, index) => (
            <div
              key={day.date}
              className={`mood-block ${day.hasMood ? 'has-mood' : 'empty'}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === index && day.hasMood && (
                <div className="mood-tooltip">
                  <div className="tooltip-date">{day.displayDate}</div>
                  <div className="tooltip-mood-label">{day.moodLabel}</div>
                  {day.keywords.length > 0 && (
                    <div className="tooltip-keywords">
                      {day.keywords.slice(0, 3).join(' · ')}
                    </div>
                  )}
                </div>
              )}
              <div
                className="mood-block-color"
                style={{
                  backgroundColor: hoveredIndex === index && day.hasMood ? day.hoverColor : day.color,
                }}
              />
              <div className="mood-block-date">{day.shortDate}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
