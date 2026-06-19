import React, { useState, useEffect } from 'react';
import { X, Calendar, User } from 'lucide-react';
import { useBoardStore } from '../store/useBoardStore';
import CommentList from './CommentList';
import type { Task } from '@shared/types';

const CardModal: React.FC = () => {
  const { selectedTask, isModalOpen, closeModal, updateTask, addComment } = useBoardStore();
  
  const [editedTask, setEditedTask] = useState<Partial<Task>>({});

  useEffect(() => {
    if (selectedTask) {
      setEditedTask({
        title: selectedTask.title,
        description: selectedTask.description,
        assignee: selectedTask.assignee,
        dueDate: selectedTask.dueDate,
      });
    }
  }, [selectedTask]);

  if (!isModalOpen || !selectedTask) return null;

  const handleSave = () => {
    updateTask(selectedTask.id, editedTask);
    closeModal();
  };

  const handleAddComment = (content: string, author: string) => {
    addComment(selectedTask.id, content, author);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 modal-content max-h-[90vh] overflow-y-auto scrollbar-thin"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            编辑任务
          </h3>
          <button
            onClick={closeModal}
            className="p-2 rounded-lg transition-transform hover-scale"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              标题
            </label>
            <input
              type="text"
              value={editedTask.title || ''}
              onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
              className="w-full px-4 py-3 rounded-lg transition-transform hover-scale focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              描述
            </label>
            <textarea
              value={editedTask.description || ''}
              onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 rounded-lg transition-transform hover-scale focus:outline-none focus:ring-2 resize-none"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <User size={14} className="inline mr-1" />
                负责人
              </label>
              <input
                type="text"
                value={editedTask.assignee || ''}
                onChange={(e) => setEditedTask({ ...editedTask, assignee: e.target.value })}
                className="w-full px-4 py-3 rounded-lg transition-transform hover-scale focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar size={14} className="inline mr-1" />
                截止日期
              </label>
              <input
                type="date"
                value={editedTask.dueDate || ''}
                onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
                className="w-full px-4 py-3 rounded-lg transition-transform hover-scale focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={closeModal}
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
            onClick={handleSave}
            className="flex-1 px-6 py-3 rounded-lg font-medium transition-transform hover-scale"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--bg-primary)',
              border: 'none',
            }}
          >
            保存
          </button>
        </div>

        <CommentList comments={selectedTask.comments} onAddComment={handleAddComment} />
      </div>
    </div>
  );
};

export default CardModal;
