import { useState, useEffect, useMemo } from 'react';
import type { Annotation, AnnotationStatus } from '../types';
import { STATUS_LABELS, STATUS_COLORS } from '../types';

interface AnnotationPanelProps {
  annotations: Annotation[];
  filterStatus: AnnotationStatus | 'all';
  onFilterChange: (status: AnnotationStatus | 'all') => void;
  onUpdateAnnotation: (
    id: string,
    updates: Partial<Pick<Annotation, 'author' | 'comment' | 'status'>>
  ) => void;
  onExportReport: () => void;
  hasImage: boolean;
}

type FilterKey = 'all' | AnnotationStatus;

function AnnotationPanel({
  annotations,
  filterStatus,
  onFilterChange,
  onUpdateAnnotation,
  onExportReport,
  hasImage,
}: AnnotationPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ author: string; comment: string; status: AnnotationStatus }>({
    author: '',
    comment: '',
    status: 'pending',
  });
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [filterStatus]);

  const filteredAnnotations = useMemo(() => {
    return annotations;
  }, [annotations]);

  const counts = useMemo(() => {
    const result = { all: annotations.length, pending: 0, approved: 0, rejected: 0 };
    annotations.forEach((a) => {
      result[a.status]++;
    });
    return result;
  }, [annotations]);

  const startEditing = (annotation: Annotation) => {
    setEditingId(annotation.id);
    setFormData({
      author: annotation.author,
      comment: annotation.comment,
      status: annotation.status,
    });
  };

  const saveEditing = () => {
    if (!editingId) return;
    onUpdateAnnotation(editingId, {
      author: formData.author,
      comment: formData.comment,
      status: formData.status,
    });
    setEditingId(null);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleQuickStatusChange = (id: string, status: AnnotationStatus) => {
    onUpdateAnnotation(id, { status });
  };

  const filterButtons: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: '全部', count: counts.all },
    { key: 'pending', label: '待确认', count: counts.pending },
    { key: 'approved', label: '已采纳', count: counts.approved },
    { key: 'rejected', label: '已驳回', count: counts.rejected },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.innerContainer}>
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>标注列表</h2>
          {hasImage && (
            <span style={styles.headerCount}>
              共 {filteredAnnotations.length} 条
            </span>
          )}
        </div>

        {hasImage && (
          <div style={styles.filterContainer}>
            {filterButtons.map((btn) => {
              const isActive = filterStatus === btn.key;
              const isStatus = btn.key !== 'all';
              const dotColor = isStatus ? STATUS_COLORS[btn.key as AnnotationStatus] : '#3b82f6';
              return (
                <button
                  key={btn.key}
                  onClick={() => onFilterChange(btn.key)}
                  style={{
                    ...styles.filterBtn,
                    ...(isActive
                      ? {
                          backgroundColor: isStatus ? dotColor : '#3b82f6',
                          color: '#ffffff',
                        }
                      : {
                          backgroundColor: '#f3f4f6',
                          color: '#4b5563',
                        }),
                  }}
                >
                  {btn.label}
                  <span
                    style={{
                      ...styles.filterCount,
                      ...(isActive ? { backgroundColor: 'rgba(255,255,255,0.25)' } : {}),
                    }}
                  >
                    {btn.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div style={styles.listContainer}>
          {!hasImage ? (
            <div style={styles.emptyList}>
              <div style={styles.emptyListIcon}>📋</div>
              <p style={styles.emptyListText}>上传设计稿后</p>
              <p style={styles.emptyListText}>点击图片添加标注</p>
            </div>
          ) : filteredAnnotations.length === 0 ? (
            <div style={styles.emptyList}>
              <div style={styles.emptyListIcon}>🔍</div>
              <p style={styles.emptyListText}>暂无符合条件的标注</p>
            </div>
          ) : (
            <div key={animKey} style={styles.list}>
              {filteredAnnotations.map((annotation) => {
                const isEditing = editingId === annotation.id;
                const statusColor = STATUS_COLORS[annotation.status];
                return (
                  <div
                    key={annotation.id}
                    style={{
                      ...styles.listItem,
                      animation: 'fadeIn 0.3s ease-out',
                    }}
                  >
                    <div style={styles.listItemHeader}>
                      <div style={styles.itemNumberWrap}>
                        <div
                          style={{
                            ...styles.itemNumber,
                            backgroundColor: statusColor,
                          }}
                        >
                          {annotation.number}
                        </div>
                        <span style={styles.itemAuthor}>
                          {annotation.author || '未填写反馈人'}
                        </span>
                      </div>
                      {!isEditing && (
                        <select
                          value={annotation.status}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              annotation.id,
                              e.target.value as AnnotationStatus
                            )
                          }
                          style={{
                            ...styles.statusSelect,
                            borderColor: statusColor,
                            color: statusColor,
                          }}
                        >
                          <option value="pending">待确认</option>
                          <option value="approved">已采纳</option>
                          <option value="rejected">已驳回</option>
                        </select>
                      )}
                    </div>

                    {isEditing ? (
                      <div style={styles.editForm}>
                        <div style={styles.formField}>
                          <label style={styles.formLabel}>反馈人</label>
                          <input
                            type="text"
                            value={formData.author}
                            onChange={(e) =>
                              setFormData({ ...formData, author: e.target.value })
                            }
                            placeholder="请输入反馈人姓名"
                            style={styles.input}
                          />
                        </div>
                        <div style={styles.formField}>
                          <label style={styles.formLabel}>评论内容</label>
                          <textarea
                            value={formData.comment}
                            onChange={(e) =>
                              setFormData({ ...formData, comment: e.target.value })
                            }
                            placeholder="请输入反馈意见..."
                            style={styles.textarea}
                          />
                        </div>
                        <div style={styles.formField}>
                          <label style={styles.formLabel}>状态</label>
                          <div style={styles.statusButtons}>
                            {(['pending', 'approved', 'rejected'] as const).map(
                              (status) => {
                                const isActive = formData.status === status;
                                const color = STATUS_COLORS[status];
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() =>
                                      setFormData({ ...formData, status })
                                    }
                                    style={{
                                      ...styles.statusTagBtn,
                                      ...(isActive
                                        ? {
                                            backgroundColor: color,
                                            color: '#ffffff',
                                            borderColor: color,
                                          }
                                        : {
                                            backgroundColor: '#ffffff',
                                            color: color,
                                            borderColor: color,
                                          }),
                                    }}
                                  >
                                    {STATUS_LABELS[status]}
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </div>
                        <div style={styles.formActions}>
                          <button onClick={saveEditing} style={styles.saveBtn}>
                            保存
                          </button>
                          <button onClick={cancelEditing} style={styles.cancelBtn}>
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p style={styles.itemComment}>
                          {annotation.comment || '（暂无评论内容）'}
                        </p>
                        <div style={styles.itemActions}>
                          <button
                            onClick={() => startEditing(annotation)}
                            style={styles.editBtn}
                          >
                            编辑
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {hasImage && (
          <div style={styles.footer}>
            <button
              onClick={onExportReport}
              disabled={filteredAnnotations.length === 0}
              style={{
                ...styles.exportBtn,
                ...(filteredAnnotations.length === 0
                  ? { opacity: 0.5, cursor: 'not-allowed' }
                  : {}),
              }}
            >
              导出标注报告
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '350px',
    flexShrink: 0,
    backgroundColor: '#ffffff',
    borderLeft: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
  },
  innerContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 56px)',
  },
  header: {
    padding: '20px 20px 16px',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
  },
  headerCount: {
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 10px',
    borderRadius: '12px',
  },
  filterContainer: {
    padding: '16px 20px',
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    borderBottom: '1px solid #f3f4f6',
  },
  filterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  filterCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '20px',
    height: '18px',
    padding: '0 6px',
    borderRadius: '9px',
    fontSize: '11px',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  listItem: {
    padding: '14px 20px',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s',
    cursor: 'pointer',
  },
  listItemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  itemNumberWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  itemNumber: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemAuthor: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1f2937',
  },
  statusSelect: {
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '6px',
    borderWidth: '1px',
    borderStyle: 'solid',
    backgroundColor: '#ffffff',
    fontWeight: 500,
    cursor: 'pointer',
  },
  itemComment: {
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#4b5563',
    marginBottom: '10px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  itemActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  editBtn: {
    fontSize: '12px',
    color: '#3b82f6',
    backgroundColor: 'transparent',
    padding: '4px 10px',
    borderRadius: '4px',
    transition: 'background-color 0.15s',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
    transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%',
    height: '80px',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '13px',
    resize: 'none',
    transition: 'border-color 0.15s',
    lineHeight: 1.5,
  },
  statusButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  statusTagBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    borderWidth: '1px',
    borderStyle: 'solid',
    transition: 'all 0.15s',
  },
  formActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '4px',
  },
  saveBtn: {
    padding: '6px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background-color 0.15s',
  },
  cancelBtn: {
    padding: '6px 16px',
    backgroundColor: '#e5e7eb',
    color: '#4b5563',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'background-color 0.15s',
  },
  emptyList: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 24px',
    color: '#9ca3af',
  },
  emptyListIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.4,
  },
  emptyListText: {
    fontSize: '13px',
    textAlign: 'center',
    lineHeight: 1.8,
  },
  footer: {
    padding: '16px 20px 20px',
    borderTop: '1px solid #f3f4f6',
  },
  exportBtn: {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'background-color 0.2s',
  },
};

export default AnnotationPanel;
