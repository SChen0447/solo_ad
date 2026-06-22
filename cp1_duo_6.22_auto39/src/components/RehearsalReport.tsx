import React from 'react';
import { RehearsalRecord } from './Timer';
import './RehearsalReport.css';

interface RehearsalReportProps {
  records: RehearsalRecord[];
  totalDuration: number;
  onClose: () => void;
}

const RehearsalReport: React.FC<RehearsalReportProps> = ({
  records,
  totalDuration,
  onClose,
}) => {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}小时${mins}分${secs}秒`;
    }
    return `${mins}分${secs}秒`;
  };

  const sortedRecords = [...records].sort((a, b) => b.totalDuration - a.totalDuration);

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-modal" onClick={e => e.stopPropagation()}>
        <h2 className="report-title">排练报表</h2>
        
        <div className="report-summary">
          <div className="summary-item">
            <span className="summary-label">总排练时长</span>
            <span className="summary-value">{formatTime(totalDuration)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">排练曲目数</span>
            <span className="summary-value">{records.length} 首</span>
          </div>
        </div>

        <div className="report-divider"></div>

        <div className="report-list">
          <h3 className="report-subtitle">曲目详情</h3>
          
          {sortedRecords.length === 0 ? (
            <p className="report-empty">暂无排练记录</p>
          ) : (
            <div className="record-list">
              {sortedRecords.map((record, index) => (
                <div key={record.songId} className="record-item">
                  <div className="record-rank">{index + 1}</div>
                  <div className="record-info">
                    <span className="record-name">{record.songName}</span>
                    <span className="record-count">排练 {record.count} 次</span>
                  </div>
                  <div className="record-duration">
                    {formatTime(record.totalDuration)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary btn-close" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
};

export default RehearsalReport;
