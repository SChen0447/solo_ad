import React, { useState } from 'react';
import type { Annotation, ToolType } from '../types';
import { formatTimestamp } from '../utils/user';

interface AnnotationListProps {
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  onAnnotationSelect: (id: string | null) => void;
  onAnnotationHighlight: (id: string | null) => void;
  onAnnotationDelete: (id: string) => void;
  onAnnotationsDelete: (ids: string[]) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  filterUser: string | null;
  onFilterUserChange: (userId: string | null) => void;
  filterType: ToolType | null;
  onFilterTypeChange: (type: ToolType | null) => void;
}

const AnnotationList: React.FC<AnnotationListProps> = ({
  annotations,
  selectedAnnotationId,
  onAnnotationSelect,
  onAnnotationHighlight,
  onAnnotationDelete,
  onAnnotationsDelete,
  isCollapsed,
  onToggleCollapse,
  filterUser,
  onFilterUserChange,
  filterType,
  onFilterTypeChange,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const sortedAnnotations = [...annotations].sort((a, b) => b.timestamp - a.timestamp);

  const users = Array.from(new Map(annotations.map(a => [a.userId, { id: a.userId, name: a.userName, avatar: a.userAvatar }])).values());
  const types: ToolType[] = ['arrow', 'rectangle', 'text', 'brush'];

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === sortedAnnotations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedAnnotations.map(a => a.id)));
    }
  };

  const deleteSelected = () => {
    if (selectedIds.size > 0 && window.confirm(`确定删除 ${selectedIds.size} 条批注吗？`)) {
      onAnnotationsDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const getToolIcon = (type: ToolType) => {
    const icons: Record<ToolType, React.ReactNode> = {
      arrow: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="19" x2="19" y2="5" />
          <polyline points="12 5 19 5 19 12" />
        </svg>
      ),
      rectangle: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      ),
      text: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      ),
      brush: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18.37 2.63L14 7l-3-3 4.37-4.37a2.5 2.5 0 0 1 3 0z" />
          <path d="M14 7L3 18l3 3 11-11" />
        </svg>
      ),
    };
    return icons[type];
  };

  const getToolLabel = (type: ToolType): string => {
    const labels: Record<ToolType, string> = {
      arrow: '箭头',
      rectangle: '矩形',
      text: '文字',
      brush: '画笔',
    };
    return labels[type];
  };

  if (isCollapsed) {
    return (
      <button style={styles.collapsedButton} onClick={onToggleCollapse} title="展开批注列表">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <h3 style={styles.title}>批注列表</h3>
          <span style={styles.count}>{sortedAnnotations.length}</span>
        </div>
        <button style={styles.collapseBtn} onClick={onToggleCollapse} title="收起">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div style={styles.filters}>
        <select
          style={styles.filterSelect}
          value={filterUser || ''}
          onChange={(e) => onFilterUserChange(e.target.value || null)}
        >
          <option value="">全部用户</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>

        <select
          style={styles.filterSelect}
          value={filterType || ''}
          onChange={(e) => onFilterTypeChange(e.target.value as ToolType | null || null)}
        >
          <option value="">全部类型</option>
          {types.map(type => (
            <option key={type} value={type}>{getToolLabel(type)}</option>
          ))}
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div style={styles.batchActions}>
          <label style={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={selectedIds.size === sortedAnnotations.length}
              onChange={selectAll}
              style={styles.checkbox}
            />
            已选 {selectedIds.size} 项
          </label>
          <button style={styles.deleteSelectedBtn} onClick={deleteSelected}>
            删除选中
          </button>
        </div>
      )}

      <div style={styles.list}>
        {sortedAnnotations.length === 0 ? (
          <div style={styles.empty}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={styles.emptyIcon}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={styles.emptyText}>暂无批注</p>
          </div>
        ) : (
          sortedAnnotations.map((annotation) => (
            <div
              key={annotation.id}
              style={{
                ...styles.item,
                ...(selectedAnnotationId === annotation.id ? styles.itemSelected : {}),
                ...(selectedIds.has(annotation.id) ? styles.itemBatchSelected : {}),
              }}
              onClick={() => onAnnotationSelect(annotation.id)}
              onMouseEnter={() => onAnnotationHighlight(annotation.id)}
              onMouseLeave={() => onAnnotationHighlight(null)}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(annotation.id)}
                onChange={(e) => toggleSelect(annotation.id, e as unknown as React.MouseEvent)}
                onClick={(e) => e.stopPropagation()}
                style={styles.itemCheckbox}
              />
              
              <img
                src={annotation.userAvatar}
                alt={annotation.userName}
                style={styles.avatar}
              />
              
              <div style={styles.itemContent}>
                <div style={styles.itemHeader}>
                  <span style={styles.userName}>{annotation.userName}</span>
                  <div style={{ ...styles.toolIcon, color: annotation.color }}>
                    {getToolIcon(annotation.type)}
                  </div>
                </div>
                <div style={styles.itemMeta}>
                  <span style={styles.toolType}>{getToolLabel(annotation.type)}</span>
                  <span style={styles.time}>{formatTimestamp(annotation.timestamp)}</span>
                </div>
                {annotation.type === 'text' && (
                  <p style={styles.textPreview}>{annotation.text}</p>
                )}
              </div>

              <button
                style={styles.deleteBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('确定删除这条批注吗？')) {
                    onAnnotationDelete(annotation.id);
                  }
                }}
                title="删除"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 280,
    height: '100%',
    backgroundColor: 'var(--card-background)',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid var(--border-color)',
    transition: 'var(--transition)',
  },
  collapsedButton: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 32,
    height: 64,
    backgroundColor: 'var(--card-background)',
    borderRadius: '8px 0 0 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRight: 'none',
    zIndex: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: 'var(--text-primary)',
    margin: 0,
  },
  count: {
    padding: '2px 8px',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 500,
  },
  collapseBtn: {
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--border-radius-sm)',
  },
  filters: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    borderBottom: '1px solid var(--border-color)',
  },
  filterSelect: {
    flex: 1,
    padding: '6px 10px',
    backgroundColor: 'var(--background)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 12,
    outline: 'none',
  },
  batchActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderBottom: '1px solid var(--border-color)',
  },
  selectAllLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  checkbox: {
    width: 14,
    height: 14,
    accentColor: 'var(--primary-color)',
  },
  deleteSelectedBtn: {
    padding: '4px 12px',
    backgroundColor: 'var(--danger)',
    color: 'white',
    borderRadius: 'var(--border-radius-sm)',
    fontSize: 12,
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: 8,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: 12,
  },
  emptyIcon: {
    color: 'var(--border-color)',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    margin: 0,
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '12px',
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderRadius: 'var(--border-radius)',
    cursor: 'pointer',
    transition: 'var(--transition)',
    position: 'relative',
    border: '2px solid transparent',
  },
  itemSelected: {
    borderColor: 'var(--primary-color)',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
  },
  itemBatchSelected: {
    backgroundColor: 'rgba(108, 99, 255, 0.05)',
  },
  itemCheckbox: {
    flexShrink: 0,
    width: 16,
    height: 16,
    marginTop: 2,
    accentColor: 'var(--primary-color)',
    cursor: 'pointer',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    flexShrink: 0,
    border: '2px solid var(--border-color)',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  toolIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  toolType: {
    fontSize: 11,
    color: 'var(--primary-color)',
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    padding: '2px 6px',
    borderRadius: 4,
  },
  time: {
    fontSize: 11,
    color: 'var(--text-secondary)',
  },
  textPreview: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    borderRadius: 'var(--border-radius-sm)',
    opacity: 0,
    transition: 'var(--transition)',
  },
};

export default AnnotationList;
