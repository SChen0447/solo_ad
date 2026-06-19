import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useBoardStore } from '../store/useBoardStore';

const AddColumnModal: React.FC = () => {
  const { isAddColumnOpen, closeAddColumn, addColumn } = useBoardStore();
  const [title, setTitle] = useState('');

  if (!isAddColumnOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addColumn(title.trim());
    setTitle('');
    closeAddColumn();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeAddColumn();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-md rounded-xl p-6 modal-content"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            添加新列
          </h3>
          <button
            onClick={closeAddColumn}
            className="p-2 rounded-lg transition-transform hover-scale"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              列标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入列标题..."
              autoFocus
              className="w-full px-4 py-3 rounded-lg transition-transform hover-scale focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={closeAddColumn}
              className="flex-1 px-6 py-3 rounded-lg font-medium transition-transform hover-scale"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-6 py-3 rounded-lg font-medium transition-transform hover-scale disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--bg-primary)',
                border: 'none',
              }}
            >
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddColumnModal;
