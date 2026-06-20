import React, { useState } from 'react';
import apiClient from '../apiClient';

interface NoteModalProps {
  bookId: number;
  selectedText: string;
  pageNumber: number;
  onClose: () => void;
  onSaved: () => void;
}

const NoteModal: React.FC<NoteModalProps> = ({
  bookId,
  selectedText,
  pageNumber,
  onClose,
  onSaved
}) => {
  const [noteContent, setNoteContent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setSaving(true);
    try {
      await apiClient.post('/notes', {
        book_id: bookId,
        highlighted_text: selectedText,
        note_content: noteContent.trim(),
        page_number: pageNumber
      });
      onSaved();
    } catch (err) {
      alert('保存笔记失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-xl shadow-2xl flex flex-col"
        style={{
          width: '400px',
          height: '300px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800 text-sm mb-2">添加笔记</h3>
          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded italic line-clamp-2">
            "{selectedText}"
          </div>
          <p className="text-xs text-gray-400 mt-2">第 {pageNumber} 页</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="写下你的想法..."
            className="flex-1 w-full resize-none border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:border-blue-400"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !noteContent.trim()}
              className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #4a90d9, #357abd)',
                color: 'white',
                border: 'none'
              }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteModal;
