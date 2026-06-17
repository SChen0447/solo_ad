import React, { useState } from 'react';
import type { Annotation, AnnotationType } from '../../types';
import './AnnotationList.css';

interface AnnotationListProps {
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
  onDelete?: (id: string) => void;
}

const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations,
  onAnnotationClick,
  onDelete
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getAnnotationColor = (type: AnnotationType) => {
    switch (type) {
      case 'suggestion': return '#4CAF50';
      case 'error': return '#F44336';
      case 'question': return '#FF9800';
      default: return '#2196F3';
    }
  };

  const getAnnotationLabel = (type: AnnotationType) => {
    switch (type) {
      case 'suggestion': return '建议';
      case 'error': return '错误';
      case 'question': return '疑问';
      default: return '批注';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const sortedAnnotations = [...annotations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className={`annotation-list ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="list-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="header-left">
          <span className="list-icon">📝</span>
          <span className="list-title">批注列表</span>
          <span className="list-count">{annotations.length}</span>
        </div>
        <span className={`collapse-arrow ${isExpanded ? 'up' : 'down'}`}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {isExpanded && (
        <div className="list-content">
          {sortedAnnotations.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">💬</span>
              <p>暂无批注</p>
              <p className="empty-hint">在预览区域框选区域添加批注</p>
            </div>
          ) : (
            <div className="annotation-cards">
              {sortedAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="annotation-card"
                  onClick={() => onAnnotationClick(annotation)}
                >
                  <div className="card-header">
                    <span
                      className="type-badge"
                      style={{ backgroundColor: `${getAnnotationColor(annotation.type)}20` }}
                    >
                      <span
                        className="type-dot"
                        style={{ backgroundColor: getAnnotationColor(annotation.type) }}
                      />
                      {getAnnotationLabel(annotation.type)}
                    </span>
                    <span className="card-time">
                      {formatDate(annotation.createdAt)}
                    </span>
                  </div>
                  <div className="card-content">
                    <p className="annotation-text">
                      {annotation.text.length > 50
                        ? annotation.text.substring(0, 50) + '...'
                        : annotation.text}
                    </p>
                    {annotation.codeSnippet && (
                      <div className="code-snippet">
                        <span className="snippet-label">选区:</span>
                        <span className="snippet-text">
                          {annotation.codeSnippet.length > 30
                            ? annotation.codeSnippet.substring(0, 30) + '...'
                            : annotation.codeSnippet}
                        </span>
                      </div>
                    )}
                  </div>
                  {onDelete && (
                    <button
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(annotation.id);
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnotationList;
