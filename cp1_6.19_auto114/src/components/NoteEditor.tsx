import React, { useState, useEffect } from 'react';
import type { Note } from '@/types';

interface NoteEditorProps {
  bookId: string;
  totalPages: number;
  currentPage: number;
  editingNote: Note | null;
  onCancelEdit: () => void;
  onSaveNote: (data: {
    id?: string;
    title: string;
    content: string;
    pageNumber: number;
    isQuote: boolean;
  }) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({
  bookId,
  totalPages,
  currentPage,
  editingNote,
  onCancelEdit,
  onSaveNote,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pageNumber, setPageNumber] = useState<string>('');
  const [isQuote, setIsQuote] = useState(false);

  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title);
      setContent(editingNote.content);
      setPageNumber(String(editingNote.pageNumber));
      setIsQuote(editingNote.isQuote);
    } else {
      setTitle('');
      setContent('');
      setPageNumber(String(currentPage > 0 ? currentPage : 1));
      setIsQuote(false);
    }
  }, [editingNote, currentPage, bookId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    const page = Math.min(totalPages, Math.max(1, parseInt(pageNumber) || 1));
    onSaveNote({
      id: editingNote?.id,
      title: title.trim() || '未命名笔记',
      content: content.trim(),
      pageNumber: page,
      isQuote,
    });
    if (!editingNote) {
      setTitle('');
      setContent('');
    }
  };

  return (
    <div className="note-editor">
      <form onSubmit={handleSubmit} className="editor-form draft-bg">
        <div className="editor-header">
          <h3 className="editor-title">
            {editingNote ? '编辑笔记' : '记录新笔记'}
          </h3>
          {editingNote && (
            <button type="button" className="cancel-edit-btn" onClick={onCancelEdit}>
              取消编辑
            </button>
          )}
        </div>

        <div className="editor-row">
          <div className="editor-field">
            <label className="field-label">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这篇笔记起个标题..."
              className="editor-input"
            />
          </div>
          <div className="editor-field page-field">
            <label className="field-label">页码</label>
            <input
              type="number"
              min="1"
              max={totalPages}
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              className="editor-input"
            />
            <span className="page-total">/ {totalPages}</span>
          </div>
        </div>

        <div className="editor-field">
          <label className="field-label">
            {isQuote ? '摘抄内容' : '笔记内容'}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={isQuote ? '粘贴或输入要摘抄的段落...' : '写下你的阅读感想、思考和感悟...'}
            className="editor-textarea"
            rows={8}
          />
        </div>

        <div className="editor-footer">
          <label className="quote-checkbox">
            <input
              type="checkbox"
              checked={isQuote}
              onChange={(e) => setIsQuote(e.target.checked)}
            />
            <span className="checkmark" />
            <span className="checkbox-label">标记为摘抄（将在摘抄专区高亮显示）</span>
          </label>
          <button type="submit" className="btn-primary save-note-btn" disabled={!content.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <path d="M17 21v-8H7v8M7 3v5h8" />
            </svg>
            <span>{editingNote ? '保存修改' : '保存笔记'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default NoteEditor;
