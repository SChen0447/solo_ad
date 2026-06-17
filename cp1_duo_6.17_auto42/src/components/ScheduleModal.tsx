import React, { useState, useEffect } from 'react';
import { scheduleApi } from '../api';
import { useApp } from '../context/AppContext';
import type { Schedule, PlatformType, ScheduleStatus } from '../types';

interface ScheduleModalProps {
  schedule: Schedule | null;
  defaultDate: Date | null;
  onClose: () => void;
  onSaved: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ schedule, defaultDate, onClose, onSaved }) => {
  const { materials } = useApp();
  const [formData, setFormData] = useState<Partial<Schedule>>({
    title: '',
    platform: 'weibo',
    publishDate: '',
    status: 'draft',
    materialId: '',
    coverImage: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (schedule) {
      setFormData(schedule);
    } else if (defaultDate) {
      const dateStr = defaultDate;
      dateStr.setHours(10, 0, 0, 0);
      setFormData({
        title: '',
        platform: 'weibo',
        publishDate: dateStr.toISOString().slice(0, 16),
        status: 'draft',
        materialId: materials[0]?.id || '',
        coverImage: materials[0]?.images?.[0] || '',
      });
    }
  }, [schedule, defaultDate, materials]);

  const handleMaterialChange = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    setFormData((prev) => ({
      ...prev,
      materialId,
      title: material?.title || prev.title,
      coverImage: material?.images?.[0] || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (schedule) {
        await scheduleApi.update(schedule.id, formData);
      } else {
        await scheduleApi.create(formData);
      }
      onSaved();
    } catch (err) {
      alert('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) return;
    if (!confirm('确定要删除这个排期吗？')) return;
    try {
      setLoading(true);
      await scheduleApi.remove(schedule.id);
      onSaved();
    } catch (err) {
      alert('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const platforms: { value: PlatformType; label: string; color: string }[] = [
    { value: 'weibo', label: '微博', color: '#E6162D' },
    { value: 'xiaohongshu', label: '小红书', color: '#FE2C55' },
    { value: 'wechat', label: '公众号', color: '#07C160' },
  ];

  const statuses: { value: ScheduleStatus; label: string; color: string }[] = [
    { value: 'draft', label: '草稿', color: '#95A5A6' },
    { value: 'scheduled', label: '待发布', color: '#3498DB' },
    { value: 'published', label: '已发布', color: '#27AE60' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{schedule ? '编辑排期' : '新建排期'}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="请输入排期标题"
              required
            />
          </div>

          <div className="form-group">
            <label>关联素材</label>
            <select
              value={formData.materialId || ''}
              onChange={(e) => handleMaterialChange(e.target.value)}
            >
              <option value="">请选择素材</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>发布平台</label>
              <div className="platform-selector">
                {platforms.map((p) => (
                  <label
                    key={p.value}
                    className={`platform-option ${formData.platform === p.value ? 'selected' : ''}`}
                    style={{ borderColor: formData.platform === p.value ? p.color : undefined }}
                  >
                    <input
                      type="radio"
                      name="platform"
                      value={p.value}
                      checked={formData.platform === p.value}
                      onChange={() => setFormData({ ...formData, platform: p.value })}
                    />
                    <span className="platform-dot" style={{ background: p.color }}></span>
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>发布状态</label>
              <div className="status-selector">
                {statuses.map((s) => (
                  <label
                    key={s.value}
                    className={`status-option ${formData.status === s.value ? 'selected' : ''}`}
                    style={{ borderColor: formData.status === s.value ? s.color : undefined }}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s.value}
                      checked={formData.status === s.value}
                      onChange={() => setFormData({ ...formData, status: s.value })}
                    />
                    <span>{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>发布时间</label>
            <input
              type="datetime-local"
              value={formData.publishDate || ''}
              onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
              required
            />
          </div>
        </form>

        <div className="modal-footer">
          {schedule && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={loading}
            >
              删除
            </button>
          )}
          <div style={{ flex: 1 }}></div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            取消
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          background: var(--card-bg);
          border-radius: var(--radius-md);
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .modal-close {
          font-size: 24px;
          color: var(--text-secondary);
          line-height: 1;
          padding: 0;
        }

        .modal-body {
          flex: 1;
          padding: 20px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .form-group input,
        .form-group select {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          font-size: 14px;
          background: white;
        }

        .form-group input:focus,
        .form-group select:focus {
          border-color: var(--accent-color);
        }

        .platform-selector,
        .status-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .platform-option,
        .status-option {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
          flex: 1;
          justify-content: center;
        }

        .platform-option input,
        .status-option input {
          display: none;
        }

        .platform-option.selected,
        .status-option.selected {
          border-width: 2px;
          font-weight: 500;
        }

        .platform-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border-color);
        }

        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--accent-color);
          color: white;
        }

        .btn-secondary {
          background: var(--primary-bg);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
        }

        .btn-danger {
          background: var(--danger-color);
          color: white;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ScheduleModal;
