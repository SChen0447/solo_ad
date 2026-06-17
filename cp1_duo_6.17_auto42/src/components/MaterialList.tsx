import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { materialApi } from '../api';
import type { Material } from '../types';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const MaterialList: React.FC = () => {
  const navigate = useNavigate();
  const { materials, tags, loading, fetchMaterials, fetchTags } = useApp();
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDebounce(searchInput, 300);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFade, setShowFade] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  useEffect(() => {
    fetchMaterials();
    fetchTags();
  }, [fetchMaterials, fetchTags]);

  const filteredMaterials = useMemo(() => {
    let result = materials;
    if (searchQuery) {
      result = result.filter((m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedTag) {
      result = result.filter((m) => m.tags.includes(selectedTag));
    }
    return result;
  }, [materials, searchQuery, selectedTag]);

  useEffect(() => {
    setShowFade(true);
    const timer = setTimeout(() => setShowFade(false), 200);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag]);

  const handleCreate = () => {
    navigate('/editor/new');
  };

  const handleEdit = (id: string) => {
    navigate(`/editor/${id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个素材吗？')) {
      try {
        await materialApi.remove(id);
        fetchMaterials();
      } catch (err) {
        alert('删除失败');
      }
    }
  };

  const tagColors = [
    { bg: '#E8F4FD', color: '#3498DB' },
    { bg: '#D5F5E3', color: '#27AE60' },
    { bg: '#FEF5E7', color: '#F39C12' },
    { bg: '#FDEDEC', color: '#E74C3C' },
    { bg: '#F5EEF8', color: '#8E44AD' },
  ];

  const getTagColor = (index: number) => tagColors[index % tagColors.length];

  return (
    <div className="page-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>素材管理</h2>
        <button className="btn btn-primary" onClick={handleCreate}>
          + 新建素材
        </button>
      </div>

      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              type="text"
              placeholder="搜索素材标题..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              className={`tag`}
              onClick={() => setSelectedTag(null)}
              style={{
                background: selectedTag === null ? 'var(--accent-color)' : '#E8F4FD',
                color: selectedTag === null ? 'white' : 'var(--accent-color)',
                cursor: 'pointer',
              }}
            >
              全部
            </button>
            {tags.map((tag, index) => {
              const color = getTagColor(index);
              return (
                <button
                  key={tag}
                  className="tag"
                  onClick={() => setSelectedTag(tag)}
                  style={{
                    background: selectedTag === tag ? color.color : color.bg,
                    color: selectedTag === tag ? 'white' : color.color,
                    cursor: 'pointer',
                  }}
                >
                  {tag}
                </button>
              );
            })}
            {showTagInput ? (
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onBlur={() => setShowTagInput(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTagInput.trim()) {
                    setShowTagInput(false);
                    setNewTagInput('');
                  }
                }}
                autoFocus
                style={{
                  padding: '2px 8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 999,
                  fontSize: 12,
                  width: 80,
                }}
              />
            ) : (
              <button
                className="tag"
                onClick={() => setShowTagInput(true)}
                style={{ cursor: 'pointer', background: '#F0F0F0', color: '#999' }}
              >
                + 添加
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      ) : (
        <div
          className={`material-list ${showFade ? 'fade-in' : ''}`}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}
        >
          {filteredMaterials.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              暂无素材
            </div>
          ) : (
            filteredMaterials.map((material) => (
              <div
                key={material.id}
                className="card card-shadow-md"
                onClick={() => handleEdit(material.id)}
                style={{
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
              >
                {material.images.length > 0 && (
                  <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={material.images[0]}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
                <div style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                    {material.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      marginBottom: 12,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {material.content}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {material.tags.slice(0, 2).map((tag, idx) => {
                        const color = getTagColor(tags.indexOf(tag) >= 0 ? tags.indexOf(tag) : idx);
                        return (
                          <span
                            key={tag}
                            className="tag"
                            style={{ background: color.bg, color: color.color }}
                          >
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: 12 }}
                      onClick={(e) => handleDelete(material.id, e)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default MaterialList;
