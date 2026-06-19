import React, { useState, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Work } from '../types';
import '../styles/releases.css';

const Releases: React.FC = () => {
  const { state, updateWork } = useApp();
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [hoveredWork, setHoveredWork] = useState<string | null>(null);
  const [draggingWork, setDraggingWork] = useState<Work | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const allWorks = useMemo(() => {
    const works: (Work & { artistName: string })[] = [];
    state.artists.forEach(artist => {
      artist.works.forEach(work => {
        works.push({ ...work, artistName: artist.name });
      });
    });
    return works.sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  }, [state.artists]);

  const performanceDates = useMemo(() => {
    const dates = new Set<string>();
    state.performances.forEach(p => dates.add(p.date));
    return dates;
  }, [state.performances]);

  const getCountdown = (releaseDate: string) => {
    const now = new Date();
    const release = new Date(releaseDate);
    const diff = release.getTime() - now.getTime();
    
    if (diff <= 0) return '已发布';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}天${hours}小时`;
  };

  const startDate = new Date(2025, 0, 1);
  const endDate = new Date(2025, 11, 31);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const getDatePosition = (dateStr: string) => {
    const date = new Date(dateStr);
    const diff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return (diff / totalDays) * 100;
  };

  const getPositionDate = (positionPercent: number) => {
    const days = Math.floor((positionPercent / 100) * totalDays);
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDragStart = (e: React.MouseEvent, work: Work) => {
    e.preventDefault();
    setDraggingWork(work);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingWork || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newDate = getPositionDate(percent);
    
    if (newDate !== draggingWork.releaseDate) {
      updateWork(draggingWork.artistId, draggingWork.id, { releaseDate: newDate });
    }
  };

  const handleMouseUp = () => {
    setDraggingWork(null);
  };

  const months = useMemo(() => {
    const result: { label: string; position: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date(2025, i, 1);
      const diff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      result.push({
        label: `${i + 1}月`,
        position: (diff / totalDays) * 100,
      });
    }
    return result;
  }, []);

  const hasPerformanceOnDate = (dateStr: string) => {
    return performanceDates.has(dateStr);
  };

  return (
    <div className="releases-page">
      <div className="page-header">
        <h1 className="page-title">作品发布计划</h1>
        <div className="release-stats">
          <span className="stat-item">
            <span className="stat-number">{allWorks.length}</span>
            <span className="stat-label">首作品</span>
          </span>
          <span className="stat-item">
            <span className="stat-number">{state.artists.length}</span>
            <span className="stat-label">位艺术家</span>
          </span>
        </div>
      </div>

      <div className="timeline-container">
        <div className="timeline-header">
          {months.map(m => (
            <div
              key={m.label}
              className="timeline-month"
              style={{ left: `${m.position}%` }}
            >
              {m.label}
            </div>
          ))}
        </div>

        <div
          className="timeline-track"
          ref={timelineRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="timeline-axis"></div>

          {allWorks.map((work, idx) => {
            const position = getDatePosition(work.releaseDate);
            const hasConflict = hasPerformanceOnDate(work.releaseDate);
            const isSelected = selectedWork?.id === work.id;

            return (
              <div
                key={work.id}
                className={`release-marker ${isSelected ? 'selected' : ''} ${draggingWork?.id === work.id ? 'dragging' : ''}`}
                style={{
                  left: `${position}%`,
                  top: `${(idx % 5) * 30 + 20}px`,
                }}
                onMouseDown={e => handleDragStart(e, work)}
                onMouseEnter={() => setHoveredWork(work.id)}
                onMouseLeave={() => setHoveredWork(null)}
                onClick={() => setSelectedWork(isSelected ? null : work)}
              >
                <div className="release-triangle" title={work.name}>
                  ▲
                  {hasConflict && (
                    <span className="conflict-star" title="作品发布与演出同一天，建议错开">
                      ★
                    </span>
                  )}
                </div>

                {hoveredWork === work.id && (
                  <div className="release-tooltip">
                    <div className="tooltip-title">{work.name}</div>
                    <div className="tooltip-artist">{work.artistName}</div>
                    <div className="tooltip-date">发行日期: {work.releaseDate}</div>
                    {hasConflict && (
                      <div className="tooltip-warning">
                        ⚠️ 与演出日重合
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedWork && (
          <div className="release-detail-panel">
            <div className="detail-header">
              <h3>{selectedWork.name}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedWork(null)}
              >
                ×
              </button>
            </div>
            <div className="detail-body">
              <div className="detail-row">
                <span className="detail-label">艺术家</span>
                <span className="detail-value">
                  {state.artists.find(a => a.id === selectedWork.artistId)?.name || '未知'}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">发行日期</span>
                <span className="detail-value">{selectedWork.releaseDate}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">发布倒计时</span>
                <span className="detail-value highlight">{getCountdown(selectedWork.releaseDate)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">时长</span>
                <span className="detail-value">
                  {Math.floor(selectedWork.duration / 60)}分{selectedWork.duration % 60}秒
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">播放链接</span>
                <a href={selectedWork.playUrl} className="detail-link" target="_blank" rel="noreferrer">
                  点击播放
                </a>
              </div>
              {hasPerformanceOnDate(selectedWork.releaseDate) && (
                <div className="detail-warning">
                  ⚠️ 作品发布与演出同一天，建议错开
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="works-list-section">
        <h2 className="section-title">全部作品</h2>
        <div className="works-table">
          <div className="works-table-header">
            <span>作品名</span>
            <span>艺术家</span>
            <span>发行日期</span>
            <span>状态</span>
          </div>
          {allWorks.map(work => (
            <div
              key={work.id}
              className="works-table-row"
              onClick={() => setSelectedWork(work)}
            >
              <span className="work-name">🎵 {work.name}</span>
              <span className="work-artist">{work.artistName}</span>
              <span className="work-date">{work.releaseDate}</span>
              <span className={`work-status ${new Date(work.releaseDate) > new Date() ? 'upcoming' : 'released'}`}>
                {new Date(work.releaseDate) > new Date() ? '待发布' : '已发布'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Releases;
