import { useState } from 'react';
import type { ResourceType } from '../types';
import './ResourceForm.css';

interface ResourceFormProps {
  onSubmit: (data: { title: string; type: ResourceType; description: string }) => void;
  onCancel: () => void;
}

const ResourceForm = ({ onSubmit, onCancel }: ResourceFormProps) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('笔记');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      return;
    }
    onSubmit({ title, type, description });
  };

  const types: ResourceType[] = ['笔记', '习题', '课件', '其他'];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="form-modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h2 className="form-title">发布学习资源</h2>
          <button className="close-btn" onClick={onCancel} aria-label="关闭">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form-content">
          <div className="form-group">
            <label htmlFor="title">资源标题</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="请输入资源标题"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="type">资源类型</label>
            <select
              id="type"
              value={type}
              onChange={e => setType(e.target.value as ResourceType)}
            >
              {types.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="description">资源描述</label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="请输入资源描述，包括内容概要、适用人群等信息"
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim() || !description.trim()}
            >
              发布资源
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceForm;
