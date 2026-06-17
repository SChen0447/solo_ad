import React, { useMemo } from 'react';
import { X, Edit2, Trash2, Calendar, Link as LinkIcon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getStableTagColor } from '../utils/colors';

const InspirationDetail: React.FC = () => {
  const {
    inspirations,
    tags,
    isDetailOpen,
    selectedInspirationId,
    closeDetail,
    deleteInspiration
  } = useStore();

  const inspiration = useMemo(() => {
    return inspirations.find(ins => ins.id === selectedInspirationId);
  }, [inspirations, selectedInspirationId]);

  const getTagColor = (tagName: string) => {
    return getStableTagColor(tagName);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async () => {
    if (!inspiration) return;
    if (confirm('确定要删除这个灵感吗？此操作无法撤销。')) {
      await deleteInspiration(inspiration.id);
    }
  };

  if (!isDetailOpen || !inspiration) return null;

  return (
    <>
      <div className="detail-overlay" onClick={closeDetail} />
      <div className="detail-panel">
        <div className="detail-header">
          <h2 className="detail-title">{inspiration.title}</h2>
          <button
            className="detail-close"
            onClick={closeDetail}
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="detail-body">
          <div className="detail-tags">
            {inspiration.tags.map(tag => (
              <span
                key={tag}
                className="card-tag-badge"
                style={{ backgroundColor: getTagColor(tag) }}
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="detail-content">{inspiration.content}</p>

          <div className="detail-meta">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Calendar size={14} />
              创建于 {formatDate(inspiration.createdAt)}
            </div>
            {inspiration.linkUrl && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <LinkIcon size={14} />
                <a href={inspiration.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-blue)' }}>
                  {inspiration.linkUrl}
                </a>
              </div>
            )}
          </div>

          {inspiration.imageUrl && (
            <img
              src={inspiration.imageUrl}
              alt={inspiration.title}
              className="detail-thumbnail"
              style={{ marginTop: '16px' }}
            />
          )}
        </div>

        <div className="detail-footer">
          <button className="btn btn-danger" onClick={handleDelete}>
            <Trash2 size={16} />
            删除
          </button>
          <button className="btn btn-primary">
            <Edit2 size={16} />
            编辑
          </button>
        </div>
      </div>
    </>
  );
};

export default InspirationDetail;
