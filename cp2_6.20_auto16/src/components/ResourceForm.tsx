import React, { useState } from 'react';
import type { ResourceType } from '../data/resources';

interface ResourceFormProps {
  onSubmit: (data: { title: string; type: ResourceType; description: string }) => void;
  onClose: () => void;
}

const TYPES: ResourceType[] = ['笔记', '习题', '课件', '其他'];

const ResourceForm: React.FC<ResourceFormProps> = ({ onSubmit, onClose }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ResourceType>('笔记');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), type, description: description.trim() });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">发布资源</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入资源标题"
              required
            />
          </div>
          <div className="form-group">
            <label>类型</label>
            <div className="type-selector">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`type-option ${type === t ? 'active' : ''}`}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请输入资源描述"
              rows={4}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn-submit">
              发布
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResourceForm;
