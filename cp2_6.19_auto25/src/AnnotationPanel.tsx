import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Annotation,
  FilterType,
  formatTime,
} from './highlightUtils';
import AnnotationForm from './AnnotationForm';

interface AnnotationPanelProps {
  annotations: Annotation[];
  allAnnotations: Annotation[];
  filterType: FilterType;
  filteredCount: number;
  onFilterChange: (type: FilterType) => void;
  onAddComment: (annotationId: string, content: string) => void;
  onToggleResolved: (annotationId: string) => void;
}

function Avatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return <div style={styles.avatar}>{initial}</div>;
}

type CollapseState = 'expanded' | 'collapsing' | 'collapsed' | 'expanding';

function ThreadCard({
  annotation,
  onAddComment,
  onToggleResolved,
  isNew,
}: {
  annotation: Annotation;
  onAddComment: (id: string, content: string) => void;
  onToggleResolved: (id: string) => void;
  isNew: boolean;
}) {
  const [collapseState, setCollapseState] = useState<CollapseState>('expanded');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const prevCommentCountRef = useRef(annotation.comments.length);
  const [latestCommentId, setLatestCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (contentRef.current) {
      setMeasuredHeight(contentRef.current.scrollHeight);
    }
  }, [annotation.comments.length, showReplyForm, collapseState]);

  useEffect(() => {
    if (annotation.comments.length > prevCommentCountRef.current) {
      const latest = annotation.comments[annotation.comments.length - 1];
      setLatestCommentId(latest.id);
      setTimeout(() => setLatestCommentId(null), 700);
    }
    prevCommentCountRef.current = annotation.comments.length;
  }, [annotation.comments.length]);

  useEffect(() => {
    if (collapseState === 'collapsing' && wrapperRef.current) {
      const h = contentRef.current?.scrollHeight ?? 0;
      wrapperRef.current.style.height = h + 'px';
      requestAnimationFrame(() => {
        if (wrapperRef.current) {
          wrapperRef.current.style.height = '0px';
        }
      });
      const timer = setTimeout(() => setCollapseState('collapsed'), 360);
      return () => clearTimeout(timer);
    }
    if (collapseState === 'expanding' && wrapperRef.current && contentRef.current) {
      const targetH = contentRef.current.scrollHeight;
      wrapperRef.current.style.height = '0px';
      requestAnimationFrame(() => {
        if (wrapperRef.current) {
          wrapperRef.current.style.height = targetH + 'px';
        }
      });
      const timer = setTimeout(() => {
        if (wrapperRef.current) {
          wrapperRef.current.style.height = 'auto';
        }
        setCollapseState('expanded');
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [collapseState]);

  const handleToggle = useCallback(() => {
    if (collapseState === 'expanded') {
      setCollapseState('collapsing');
    } else if (collapseState === 'collapsed') {
      setCollapseState('expanding');
    }
  }, [collapseState]);

  const handleAddComment = useCallback(
    (content: string) => {
      onAddComment(annotation.id, content);
      setShowReplyForm(false);
    },
    [annotation.id, onAddComment]
  );

  const hasComments = annotation.comments.length > 0;
  const isExpanded = collapseState === 'expanded' || collapseState === 'expanding';

  const wrapperHeight: React.CSSProperties['height'] =
    collapseState === 'expanded'
      ? 'auto'
      : collapseState === 'collapsed'
      ? 0
      : undefined;

  return (
    <div
      style={{
        ...styles.card,
        ...(isNew ? { animation: 'cardSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1)' } : {}),
      }}
      className="annotation-card"
    >
      <div style={styles.cardHeader} onClick={handleToggle}>
        <div style={styles.cardHeaderLeft}>
          <span
            style={{
              ...styles.toggleIcon,
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </span>
          <span
            style={{
              ...styles.highlightBadge,
              backgroundColor: annotation.resolved ? '#d4edda' : 'rgba(255, 243, 205, 0.9)',
              color: annotation.resolved ? '#155724' : '#856404',
            }}
          >
            {annotation.selectedText.length > 30
              ? annotation.selectedText.slice(0, 30) + '…'
              : annotation.selectedText}
          </span>
        </div>
        <div style={styles.cardHeaderRight}>
          {annotation.resolved && <span style={styles.resolvedBadge}>✓ 已解决</span>}
          <span style={styles.commentCount}>{annotation.comments.length} 条评论</span>
        </div>
      </div>

      <div
        ref={wrapperRef}
        style={{
          overflow: 'hidden',
          height: wrapperHeight,
          transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div ref={contentRef}>
          {hasComments && (
            <div style={styles.commentsList}>
              {annotation.comments.map((comment) => (
                <div
                  key={comment.id}
                  style={{
                    ...styles.commentItem,
                    ...(latestCommentId === comment.id
                      ? { animation: 'replySlideIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)' }
                      : {}),
                  }}
                >
                  <div style={styles.commentHeader}>
                    <Avatar name={comment.author} />
                    <div style={styles.commentMeta}>
                      <span style={styles.commentAuthor}>{comment.author}</span>
                      <span style={styles.commentTime}>{formatTime(comment.createdAt)}</span>
                    </div>
                  </div>
                  <div style={styles.commentContent}>{comment.content}</div>
                </div>
              ))}
            </div>
          )}

          {!hasComments && (
            <div style={styles.noComments}>
              还没有评论，添加第一条评论吧
            </div>
          )}

          <div style={styles.cardActions}>
            {annotation.resolved ? (
              <button
                style={styles.reopenButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleResolved(annotation.id);
                }}
                className="resolve-btn"
              >
                ↩ 重新打开
              </button>
            ) : (
              <button
                style={styles.resolveButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleResolved(annotation.id);
                }}
                className="resolve-btn"
              >
                ✓ 标记为已解决
              </button>
            )}
            <button
              style={styles.replyButton}
              onClick={(e) => {
                e.stopPropagation();
                setShowReplyForm(!showReplyForm);
              }}
            >
              💬 回复
            </button>
          </div>

          {showReplyForm && (
            <div
              style={{
                animation: 'replyFormFade 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <AnnotationForm
                onSubmit={handleAddComment}
                placeholder="写下你的回复..."
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnnotationPanel({
  annotations,
  filterType,
  filteredCount,
  onFilterChange,
  onAddComment,
  onToggleResolved,
}: AnnotationPanelProps) {
  const [transitionKey, setTransitionKey] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);

  const handleFilterChange = useCallback(
    (type: FilterType) => {
      if (type === filterType) return;
      setFadeOut(true);
      setFadeIn(false);

      setTimeout(() => {
        setFadeOut(false);
        onFilterChange(type);
        setTransitionKey((k) => k + 1);
        setFadeIn(true);

        setTimeout(() => {
          setFadeIn(false);
        }, 400);
      }, 200);
    },
    [filterType, onFilterChange]
  );

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'unresolved', label: '未解决' },
    { key: 'resolved', label: '已解决' },
  ];

  const [newAnnotationId, setNewAnnotationId] = useState<string | null>(null);
  useEffect(() => {
    if (annotations.length > 0) {
      const latest = annotations[annotations.length - 1];
      setNewAnnotationId(latest.id);
      const timer = setTimeout(() => setNewAnnotationId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [annotations.length]);

  const listWrapperStyle: React.CSSProperties = {
    ...styles.listWrapper,
    opacity: fadeOut ? 0 : fadeIn ? 0 : 1,
    transform: fadeOut ? 'translateY(-4px)' : fadeIn ? 'translateY(6px)' : 'none',
    transition: fadeOut
      ? 'opacity 0.2s ease, transform 0.2s ease'
      : fadeIn
      ? 'opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
      : 'none',
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>
          批注（{filteredCount}）
        </h2>
        <div style={styles.filterBar}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              style={{
                ...styles.filterButton,
                ...(filterType === f.key ? styles.filterButtonActive : {}),
              }}
              className="filter-btn"
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={listWrapperStyle} key={transitionKey}>
        <div style={styles.list}>
          {annotations.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📝</div>
              <div style={styles.emptyText}>
                {filterType === 'all'
                  ? '暂无批注，选中文档文字即可开始批注'
                  : filterType === 'unresolved'
                  ? '没有未解决的批注'
                  : '没有已解决的批注'}
              </div>
            </div>
          )}
          {annotations.map((annotation) => (
            <ThreadCard
              key={annotation.id}
              annotation={annotation}
              onAddComment={onAddComment}
              onToggleResolved={onToggleResolved}
              isNew={annotation.id === newAnnotationId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '30%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderLeft: '1px solid #dee2e6',
    overflow: 'hidden',
  },
  panelHeader: {
    padding: '18px 20px 14px',
    borderBottom: '1px solid #e9ecef',
    flexShrink: 0,
    backgroundColor: '#ffffff',
  },
  panelTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#212529',
    marginBottom: '12px',
    transition: 'all 0.15s ease',
  },
  filterBar: {
    display: 'flex',
    gap: '6px',
  },
  filterButton: {
    padding: '5px 14px',
    border: '1px solid #dee2e6',
    borderRadius: '16px',
    backgroundColor: '#ffffff',
    color: '#6c757d',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterButtonActive: {
    backgroundColor: '#007bff',
    color: '#ffffff',
    borderColor: '#007bff',
  },
  listWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  list: {
    height: '100%',
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    borderRadius: '5px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    border: '1px solid #f0f0f0',
    transition: 'box-shadow 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    cursor: 'pointer',
    backgroundColor: '#fafbfc',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background-color 0.15s ease',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  cardHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  toggleIcon: {
    fontSize: '10px',
    color: '#adb5bd',
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    flexShrink: 0,
  },
  highlightBadge: {
    padding: '2px 8px',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '180px',
  },
  resolvedBadge: {
    fontSize: '11px',
    color: '#28a745',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  commentCount: {
    fontSize: '11px',
    color: '#adb5bd',
    whiteSpace: 'nowrap',
  },
  commentsList: {
    padding: '10px 14px 0',
  },
  commentItem: {
    padding: '8px 0',
    borderBottom: '1px solid #f5f5f5',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  avatar: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    backgroundColor: '#007bff',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    flexShrink: 0,
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  commentAuthor: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#343a40',
  },
  commentTime: {
    fontSize: '11px',
    color: '#adb5bd',
  },
  commentContent: {
    fontSize: '13px',
    color: '#495057',
    lineHeight: 1.55,
    paddingLeft: '34px',
  },
  noComments: {
    padding: '16px 14px',
    fontSize: '13px',
    color: '#adb5bd',
    textAlign: 'center',
  },
  cardActions: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderTop: '1px solid #f5f5f5',
  },
  resolveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    border: '1px solid #28a745',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    color: '#28a745',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  reopenButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    border: '1px solid #ffc107',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    color: '#856404',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  replyButton: {
    padding: '4px 10px',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    color: '#6c757d',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '36px',
  },
  emptyText: {
    fontSize: '13px',
    color: '#adb5bd',
    textAlign: 'center',
    lineHeight: 1.5,
  },
};
