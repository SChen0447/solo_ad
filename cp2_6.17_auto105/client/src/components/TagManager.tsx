import React, { useEffect, useState, useCallback } from 'react';
import { Edit3, Trash2, Check, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../utils/api';
import { TAG_COLORS } from '../types';

const TagManager: React.FC = () => {
  const { tags, fetchTags, fetchInspirations } = useStore();
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleEditClick = useCallback((tagName: string, tagColor: string) => {
    setEditingTag(tagName);
    setEditName(tagName);
    setEditColor(tagColor);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingTag(null);
    setEditName('');
    setEditColor('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingTag || !editName.trim()) return;

    try {
      await api.updateTag(editingTag, {
        name: editName.trim(),
        color: editColor
      });
      await fetchTags();
      await fetchInspirations();
      handleCancelEdit();
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新失败');
    }
  }, [editingTag, editName, editColor, fetchTags, fetchInspirations, handleCancelEdit]);

  const handleDeleteTag = useCallback(async (tagName: string) => {
    if (tagName === '未分类') {
      alert('不能删除"未分类"标签');
      return;
    }
    if (!confirm(`确定要删除标签"${tagName}"吗？所有使用该标签的灵感将被标记为"未分类"。`)) {
      return;
    }

    try {
      await api.deleteTag(tagName);
      await fetchTags();
      await fetchInspirations();
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败');
    }
  }, [fetchTags, fetchInspirations]);

  const getRandomColor = () => TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];

  return (
    <div className="tag-manager">
      <div className="page-header">
        <h1 className="page-title">标签管理</h1>
        <p className="page-description">管理你的灵感分类标签</p>
      </div>

      <div className="tag-list">
        {tags.map(tag => (
          <div
            key={tag.name}
            className="tag-item"
            style={{ backgroundColor: tag.color }}
          >
            {editingTag === tag.name ? (
              <div className="tag-edit-form" style={{ width: '100%' }}>
                <input
                  type="text"
                  className="tag-edit-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="标签名称"
                  disabled={tag.name === '未分类'}
                />
                <input
                  type="color"
                  className="color-picker"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSaveEdit}
                  style={{ width: 'auto', padding: '0 12px' }}
                >
                  <Check size={16} />
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                  style={{ width: 'auto', padding: '0 12px' }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <span>{tag.name}</span>
                <span className="tag-count">{tag.count}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(tag.name, tag.color);
                  }}
                  style={{ color: 'white', marginLeft: '8px' }}
                  aria-label="编辑标签"
                >
                  <Edit3 size={14} />
                </button>
                {tag.name !== '未分类' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTag(tag.name);
                    }}
                    style={{ color: 'white' }}
                    aria-label="删除标签"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TagManager;
