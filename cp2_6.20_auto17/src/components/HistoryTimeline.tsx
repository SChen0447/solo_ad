import React from 'react';
import type { HistorySnapshot } from '../colorSystem/colorTypes';

interface HistoryTimelineProps {
  history: HistorySnapshot[];
  onRestore: (snapshot: HistorySnapshot) => void;
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ history, onRestore }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} 分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} 小时前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const renderMiniPalette = (snapshot: HistorySnapshot) => {
    const primaryColors = snapshot.primaryScale
      .filter((s) => [100, 300, 500, 700, 900].includes(s.level))
      .map((s) => s.hex);
    const secondaryColors = snapshot.secondaryScale
      .filter((s) => [100, 300, 500, 700, 900].includes(s.level))
      .map((s) => s.hex);
    const allColors = [...primaryColors, ...secondaryColors];

    return (
      <div className="mini-palette">
        {allColors.map((color, index) => (
          <div
            key={index}
            className="mini-color"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="history-timeline">
      <div className="timeline-header">
        <h3 className="timeline-title">历史记录</h3>
        <span className="history-count">{history.length}/10</span>
      </div>

      {history.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">📋</div>
          <p>暂无历史记录</p>
          <span>调整色彩后将自动保存</span>
        </div>
      ) : (
        <div className="timeline-list">
          {history.map((snapshot, index) => (
            <div
              key={snapshot.id}
              className="timeline-item"
              onClick={() => onRestore(snapshot)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRestore(snapshot);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`恢复到 ${formatTime(snapshot.timestamp)} 的色板`}
            >
              <div className="timeline-dot">
                <div className="dot-inner" />
              </div>
              <div className="timeline-line" style={{ opacity: index < history.length - 1 ? 1 : 0 }} />
              <div className="timeline-content">
                <div className="timeline-time">{formatTime(snapshot.timestamp)}</div>
                {renderMiniPalette(snapshot)}
                <div className="timeline-colors">
                  <div className="color-preview">
                    <span
                      className="color-dot"
                      style={{ backgroundColor: snapshot.primaryColor }}
                    />
                    <span className="color-label">主色: {snapshot.primaryColor.toUpperCase()}</span>
                  </div>
                  <div className="color-preview">
                    <span
                      className="color-dot"
                      style={{ backgroundColor: snapshot.secondaryColor }}
                    />
                    <span className="color-label">辅色: {snapshot.secondaryColor.toUpperCase()}</span>
                  </div>
                </div>
                <button className="restore-btn">
                  ↩ 恢复此版本
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryTimeline;
