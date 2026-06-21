import React, { useState } from 'react';
import { format } from 'date-fns';
import { Clock, History, ChevronLeft } from 'lucide-react';
import { Version } from '../../version/types';
import '../styles/VersionTimeline.css';

interface VersionTimelineProps {
  versions: Version[];
  selectedVersionId: string | null;
  compareVersionIds: string[];
  isCompareMode: boolean;
  onSelectVersion: (versionId: string | null) => void;
  onToggleCompare: (versionId: string) => void;
  onStartCompare: () => void;
  onCancelCompare: () => void;
  className?: string;
}

export const VersionTimeline: React.FC<VersionTimelineProps> = ({
  versions,
  selectedVersionId,
  compareVersionIds,
  isCompareMode,
  onSelectVersion,
  onToggleCompare,
  onStartCompare,
  onCancelCompare,
  className = '',
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const formatTime = (timestamp: string): string => {
    return format(new Date(timestamp), 'yyyy-MM-dd HH:mm');
  };

  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const handleItemClick = (versionId: string) => {
    if (isCompareMode) {
      onToggleCompare(versionId);
    } else {
      onSelectVersion(versionId === selectedVersionId ? null : versionId);
    }
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const timelineContent = (
    <div className={`version-timeline ${isMobileOpen ? 'open' : ''} ${className}`}>
      <div className="timeline-mobile-header">
        <div className="timeline-mobile-title">
          <History size={16} />
          版本历史
          <span className="timeline-count">{versions.length}</span>
        </div>
        <button 
          className="timeline-close-btn"
          onClick={() => setIsMobileOpen(false)}
        >
          <ChevronLeft size={20} />
        </button>
      </div>
      
      <div className="timeline-header">
        <div className="timeline-title">
          <History size={16} />
          版本历史
          <span className="timeline-count">{versions.length} 个版本</span>
        </div>
        
        <div className="timeline-actions">
          {isCompareMode ? (
            <>
              <button 
                className="compare-btn cancel"
                onClick={onCancelCompare}
              >
                取消
              </button>
              <button 
                className="compare-btn"
                onClick={onStartCompare}
                disabled={compareVersionIds.length !== 2}
              >
                对比 ({compareVersionIds.length}/2)
              </button>
            </>
          ) : (
            <button 
              className="compare-btn"
              onClick={() => {}}
              disabled={versions.length < 2}
            >
              对比版本
            </button>
          )}
        </div>
      </div>
      
      <div className="timeline-list">
        {sortedVersions.length === 0 ? (
          <div className="timeline-empty">
            <Clock size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <div>暂无版本记录</div>
          </div>
        ) : (
          sortedVersions.map((version) => (
            <div
              key={version.id}
              className={`timeline-item 
                ${selectedVersionId === version.id ? 'selected' : ''}
                ${compareVersionIds.includes(version.id) ? 'compare-selected' : ''}
              `}
              onClick={() => handleItemClick(version.id)}
            >
              <div className={`timeline-dot ${version.status}`} />
              
              {isCompareMode && (
                <input
                  type="checkbox"
                  className="timeline-checkbox"
                  checked={compareVersionIds.includes(version.id)}
                  onChange={() => onToggleCompare(version.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              
              <div className="timeline-version-number">
                v{version.versionNumber}
                {version.status === 'latest' && (
                  <span className="latest-badge">最新</span>
                )}
              </div>
              
              <div className="timestamp">
                {formatTime(version.timestamp)}
              </div>
              
              <div className="timeline-summary">
                {version.summary}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {timelineContent}
      
      <div 
        className={`timeline-overlay ${isMobileOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />
      
      <button 
        className="timeline-toggle-btn"
        onClick={toggleMobile}
      >
        <History size={20} />
      </button>
    </>
  );
};

export default VersionTimeline;
