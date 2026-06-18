import React, { useState, useRef } from 'react';
import { TimelineRecord } from './dataManager';
import DateBadge from './DateBadge';
import TagBadge from './TagBadge';
import DetailView from './DetailView';

interface TimelineItemProps {
  record: TimelineRecord;
  isActiveYear: boolean;
  activeTag: string | null;
  onTagClick: (tag: string) => void;
  onExpand: (id: string | null) => void;
  expandedId: string | null;
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  record,
  isActiveYear,
  activeTag,
  onTagClick,
  onExpand,
  expandedId
}) => {
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  const isExpanded = expandedId === record.id;

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.copy-link-btn') ||
      target.closest('.tag-badge') ||
      target.closest('.detail-url')
    ) {
      return;
    }
    onExpand(isExpanded ? null : record.id);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const d = new Date(record.date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    const text = `${record.title} - ${formattedDate}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="timeline-item" ref={itemRef} id={`record-${record.id}`}>
      <div
        className={`timeline-card ${isExpanded ? 'expanded-view' : 'collapsed-view'}`}
        onClick={handleCardClick}
      >
        <div className="card-thumbnail">
          {record.imageUrl ? (
            <img
              src={record.imageUrl}
              alt={record.title}
              className="card-thumbnail-image"
              loading="lazy"
            />
          ) : (
            <div className="card-thumbnail-placeholder">📝</div>
          )}
          <div className="card-thumbnail-content">
            <h3 className="card-title">{record.title}</h3>
            {record.tags.length > 0 && (
              <div className="card-tags">
                {record.tags.slice(0, 3).map(tag => (
                  <TagBadge
                    key={tag}
                    tag={tag}
                    isActive={activeTag === tag}
                    onClick={onTagClick}
                  />
                ))}
              </div>
            )}
          </div>
          <button
            className="copy-link-btn"
            onClick={handleCopyLink}
            title="复制链接"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          {showCopySuccess && (
            <div className="copy-success-toast">已复制!</div>
          )}
        </div>
        <DetailView
          record={record}
          isExpanded={isExpanded}
          activeTag={activeTag}
          onTagClick={onTagClick}
        />
      </div>
      <DateBadge date={record.date} isActiveYear={isActiveYear} />
    </div>
  );
};

export default TimelineItem;
