import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useDocumentStore } from '../state/documentStore';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Comment } from '../types';
import './CommentPanel.css';

const VIRTUAL_THRESHOLD = 50;
const VISIBLE_COUNT = 10;
const ITEM_HEIGHT = 120;

export function CommentPanel() {
  const {
    comments,
    activeCommentId,
    updateCommentStatus,
    setActiveCommentId,
    versions,
  } = useDocumentStore();

  const { emitCommentUpdate, emitRestoreVersion } = useWebSocket();

  const [showVersions, setShowVersions] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => b.timestamp - a.timestamp);
  }, [comments]);

  const useVirtualList = sortedComments.length > VIRTUAL_THRESHOLD;

  const visibleComments = useMemo(() => {
    if (!useVirtualList) return sortedComments;

    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2);
    const endIndex = Math.min(
      sortedComments.length,
      startIndex + VISIBLE_COUNT + 4
    );
    return sortedComments.slice(startIndex, endIndex).map((comment, index) => ({
      ...comment,
      _virtualIndex: startIndex + index,
    }));
  }, [sortedComments, scrollTop, useVirtualList]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStatusToggle = (commentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
    updateCommentStatus(commentId, newStatus as 'pending' | 'resolved');
    emitCommentUpdate(commentId, newStatus as 'pending' | 'resolved');
  };

  const handleLocate = (commentId: string) => {
    setActiveCommentId(commentId);
    setTimeout(() => setActiveCommentId(null), 2000);
  };

  const handleRestoreVersion = () => {
    if (!selectedVersionId) return;
    emitRestoreVersion(selectedVersionId);
    setShowVersions(false);
  };

  const totalHeight = useVirtualList ? sortedComments.length * ITEM_HEIGHT : 'auto';
  const offsetY = useVirtualList
    ? Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2) * ITEM_HEIGHT
    : 0;

  return (
    <div className="comment-panel">
      <div className="panel-header">
        <h3>评论与批注</h3>
        <span className="comment-count">{sortedComments.length} 条评论</span>
      </div>

      <div
        className={`comment-list ${useVirtualList ? 'virtual-list' : ''}`}
        ref={listRef}
        onScroll={handleScroll}
        style={{ height: useVirtualList ? 'calc(100vh - 280px)' : 'auto' }}
      >
        {useVirtualList && (
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div style={{ transform: `translateY(${offsetY}px)` }}>
              {visibleComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment as Comment & { _virtualIndex: number }}
                  isActive={activeCommentId === comment.id}
                  formatTime={formatTime}
                  onStatusToggle={handleStatusToggle}
                  onLocate={handleLocate}
                />
              ))}
            </div>
          </div>
        )}

        {!useVirtualList &&
          sortedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isActive={activeCommentId === comment.id}
              formatTime={formatTime}
              onStatusToggle={handleStatusToggle}
              onLocate={handleLocate}
            />
          ))}

        {sortedComments.length === 0 && (
          <div className="empty-state">
            <p>暂无评论</p>
            <span>选中文档中的文字即可添加评论</span>
          </div>
        )}
      </div>

      <div className="panel-footer">
        <div className="version-section">
          <button
            className="version-toggle-btn"
            onClick={() => setShowVersions(!showVersions)}
          >
            <span className="version-icon">📜</span>
            历史版本
            <span className={`version-arrow ${showVersions ? 'rotated' : ''}`}>
              ▼
            </span>
          </button>

          {showVersions && (
            <div className="version-dropdown">
              {versions.length === 0 ? (
                <p className="no-versions">暂无历史版本</p>
              ) : (
                versions.map((version) => (
                  <div
                    key={version.id}
                    className={`version-item ${
                      selectedVersionId === version.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedVersionId(version.id)}
                  >
                    <span className="version-time">
                      {new Date(version.timestamp).toLocaleString('zh-CN')}
                    </span>
                  </div>
                ))
              )}
              {selectedVersionId && (
                <button
                  className="restore-btn"
                  onClick={handleRestoreVersion}
                >
                  恢复此版本
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  isActive: boolean;
  formatTime: (timestamp: number) => string;
  onStatusToggle: (id: string, status: string) => void;
  onLocate: (id: string) => void;
}

function CommentItem({
  comment,
  isActive,
  formatTime,
  onStatusToggle,
  onLocate,
}: CommentItemProps) {
  const isResolved = comment.status === 'resolved';

  return (
    <div
      className={`comment-item ${isResolved ? 'resolved' : ''} ${
        isActive ? 'active' : ''
      }`}
    >
      <div className="comment-header">
        <div className="comment-author">
          <div className="author-avatar">
            {comment.author.charAt(0)}
          </div>
          <span className="author-name">{comment.author}</span>
        </div>
        <span className={`status-badge ${comment.status}`}>
          {isResolved ? '已解决' : '待处理'}
        </span>
      </div>

      <div className="comment-selected-text">
        "{comment.selectedText?.slice(0, 50)}
        {comment.selectedText?.length > 50 ? '...' : ''}"
      </div>

      <p className="comment-text">{comment.text}</p>

      <div className="comment-footer">
        <span className="comment-time">{formatTime(comment.timestamp)}</span>
        <div className="comment-actions">
          <button
            className="action-btn locate-btn"
            onClick={() => onLocate(comment.id)}
          >
            定位
          </button>
          <button
            className={`action-btn status-btn ${isResolved ? 'resolve' : 'unresolve'}`}
            onClick={() => onStatusToggle(comment.id, comment.status)}
          >
            {isResolved ? '重新打开' : '标记解决'}
          </button>
        </div>
      </div>
    </div>
  );
}
