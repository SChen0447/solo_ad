import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materialApi, uploadApi } from '../api';
import { useApp } from '../context/AppContext';
import type { Material, PlatformType } from '../types';

const PLATFORM_LIMITS: Record<PlatformType, { title: number; content: number; name: string }> = {
  weibo: { title: 0, content: 140, name: '微博' },
  xiaohongshu: { title: 20, content: 1000, name: '小红书' },
  wechat: { title: 64, content: 5000, name: '公众号' },
};

const MaterialEditor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { fetchMaterials, tags, fetchTags } = useApp();
  const [material, setMaterial] = useState<Partial<Material>>({
    title: '',
    content: '',
    images: [],
    tags: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const isNew = id === 'new' || !id;

  useEffect(() => {
    fetchTags();
    if (!isNew && id) {
      loadMaterial(id);
    }
  }, [id, isNew, fetchTags]);

  const loadMaterial = async (materialId: string) => {
    try {
      setLoading(true);
      const data = await materialApi.get(materialId);
      setMaterial(data);
    } catch (err) {
      alert('加载素材失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (isNew) {
        const newMaterial = await materialApi.create(material);
        await fetchMaterials();
        navigate(`/editor/${newMaterial.id}`);
      } else if (id) {
        await materialApi.update(id, material);
        await fetchMaterials();
      }
      alert('保存成功');
    } catch (err) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) {
        try {
          const uploadPromises = files.map((file) => uploadApi.image(file));
          const results = await Promise.all(uploadPromises);
          const newImages = results.map((r) => r.url);
          setMaterial((prev) => ({
            ...prev,
            images: [...(prev.images || []), ...newImages],
          }));
        } catch (err) {
          alert('图片上传失败');
        }
      }
    },
    []
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length > 0) {
      try {
        const uploadPromises = files.map((file) => uploadApi.image(file));
        const results = await Promise.all(uploadPromises);
        const newImages = results.map((r) => r.url);
        setMaterial((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...newImages],
        }));
      } catch (err) {
        alert('图片上传失败');
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setMaterial((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
    }));
  };

  const toggleTag = (tag: string) => {
    setMaterial((prev) => {
      const hasTag = prev.tags?.includes(tag);
      return {
        ...prev,
        tags: hasTag ? prev.tags?.filter((t) => t !== tag) : [...(prev.tags || []), tag],
      };
    });
  };

  const titleLength = material.title?.length || 0;
  const contentLength = material.content?.length || 0;

  const getCharCountStatus = (platform: PlatformType) => {
    const limits = PLATFORM_LIMITS[platform];
    const contentOverflow = contentLength - limits.content;
    const titleOverflow = limits.title > 0 ? titleLength - limits.title : 0;
    const isOverflow = contentOverflow > 0 || titleOverflow > 0;
    return { isOverflow, contentOverflow, titleOverflow };
  };

  const tagColors = [
    { bg: '#E8F4FD', color: '#3498DB' },
    { bg: '#D5F5E3', color: '#27AE60' },
    { bg: '#FEF5E7', color: '#F39C12' },
    { bg: '#FDEDEC', color: '#E74C3C' },
    { bg: '#F5EEF8', color: '#8E44AD' },
  ];
  const getTagColor = (index: number) => tagColors[index % tagColors.length];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        加载中...
      </div>
    );
  }

  return (
    <div className="page-body" style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>
          {isNew ? '新建素材' : '编辑素材'}
        </h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/materials')}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>标题</label>
          <input
            type="text"
            value={material.title || ''}
            onChange={(e) => setMaterial({ ...material, title: e.target.value })}
            placeholder="请输入素材标题"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 16,
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>正文内容</label>
          <textarea
            ref={contentRef}
            value={material.content || ''}
            onChange={(e) => setMaterial({ ...material, content: e.target.value })}
            placeholder="请输入正文内容..."
            rows={10}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14,
              resize: 'vertical',
              minHeight: 200,
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>
            字数统计
          </label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {(Object.keys(PLATFORM_LIMITS) as PlatformType[]).map((platform) => {
              const status = getCharCountStatus(platform);
              const limits = PLATFORM_LIMITS[platform];
              const percentage = Math.min((contentLength / limits.content) * 100, 100);
              return (
                <div
                  key={platform}
                  style={{
                    flex: 1,
                    minWidth: 180,
                    padding: 12,
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: status.isOverflow ? '#FDEDEC' : '#F8F9FA',
                    border: status.isOverflow ? '1px solid var(--danger-color)' : '1px solid var(--border-color)',
                    transition: 'all 0.3s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{limits.name}</span>
                    <span
                      style={{
                        fontSize: 12,
                        color: status.isOverflow ? 'var(--danger-color)' : 'var(--text-secondary)',
                        fontWeight: status.isOverflow ? 600 : 400,
                      }}
                    >
                      {contentLength}/{limits.content}
                      {status.contentOverflow > 0 && ` (溢出${status.contentOverflow}字)`}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: status.isOverflow ? '#FADBD8' : '#E8ECEF',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percentage}%`,
                        backgroundColor: status.isOverflow ? 'var(--danger-color)' : 'var(--accent-color)',
                        transition: 'width 0.3s, background-color 0.3s',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>图片素材</label>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? 'var(--accent-color)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-md)',
              padding: 30,
              textAlign: 'center',
              backgroundColor: isDragging ? '#E8F4FD' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              拖拽图片到此处上传，或点击选择文件
            </p>
            <p style={{ color: 'var(--text-light)', fontSize: 12, marginTop: 4 }}>
              支持 JPG、PNG、GIF 格式
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {material.images && material.images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
              {material.images.map((img, index) => (
                <div
                  key={index}
                  style={{
                    position: 'relative',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    aspectRatio: '1',
                  }}
                >
                  <img
                    src={img}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 8 }}>标签</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tags.map((tag, index) => {
              const color = getTagColor(index);
              const isSelected = material.tags?.includes(tag);
              return (
                <button
                  key={tag}
                  className="tag"
                  onClick={() => toggleTag(tag)}
                  style={{
                    background: isSelected ? color.color : color.bg,
                    color: isSelected ? 'white' : color.color,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {isSelected ? '✓ ' : ''}{tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialEditor;
