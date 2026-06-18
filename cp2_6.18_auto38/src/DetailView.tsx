import React from 'react';
import { TimelineRecord } from './dataManager';
import TagBadge from './TagBadge';

interface DetailViewProps {
  record: TimelineRecord;
  isExpanded: boolean;
  activeTag: string | null;
  onTagClick: (tag: string) => void;
}

const DetailView: React.FC<DetailViewProps> = ({ record, isExpanded, activeTag, onTagClick }) => {
  if (!isExpanded) return null;

  return (
    <div className="detail-view">
      <div className="detail-view-inner">
        {record.imageUrl && (
          <img
            src={record.imageUrl}
            alt={record.title}
            className="detail-image"
            loading="lazy"
          />
        )}
        {record.tags.length > 0 && (
          <div className="card-tags" style={{ marginBottom: '12px' }}>
            {record.tags.map(tag => (
              <TagBadge
                key={tag}
                tag={tag}
                isActive={activeTag === tag}
                onClick={onTagClick}
              />
            ))}
          </div>
        )}
        <p className="detail-description">{record.description}</p>
        {record.url && (
          <a href={record.url} target="_blank" rel="noopener noreferrer" className="detail-url">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            查看原文链接
          </a>
        )}
      </div>
    </div>
  );
};

export default DetailView;
