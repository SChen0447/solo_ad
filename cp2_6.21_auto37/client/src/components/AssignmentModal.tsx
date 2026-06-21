import React, { useState, useRef, useCallback } from 'react';
import type { Lesson, Attachment } from '../../services/api';
import './AssignmentModal.css';

export interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (content: string, attachments: Attachment[]) => Promise<void>;
  lesson?: Lesson;
}

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg'];
const ALLOWED_EXT = ['.pdf', '.docx', '.png', '.jpg'];
const MAX_SIZE = 10 * 1024 * 1024;

const AssignmentModal: React.FC<AssignmentModalProps> = ({ open, onClose, onSubmit, lesson }) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Array<{ file: File; progress: number; uploaded: boolean; url: string }>>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const execCommand = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }, []);

  const insertImage = useCallback(() => {
    const url = window.prompt('请输入图片链接：');
    if (url) {
      execCommand('insertImage', url);
    }
  }, [execCommand]);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
      return '不支持的文件格式，请上传 .pdf, .docx, .png, .jpg';
    }
    if (file.size > MAX_SIZE) {
      return '文件大小不能超过 10MB';
    }
    return null;
  };

  const simulateUpload = (file: File, idx: number) => {
    return new Promise<string>((resolve) => {
      const interval = setInterval(() => {
        setAttachments(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            const current = updated[idx].progress;
            const next = Math.min(current + Math.random() * 25, 100);
            updated[idx] = { ...updated[idx], progress: next };
            if (next >= 100) {
              clearInterval(interval);
              updated[idx].uploaded = true;
              updated[idx].url = URL.createObjectURL(file);
              resolve(updated[idx].url);
            }
          }
          return updated;
        });
      }, 150);
    });
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError('');
    const fileArr = Array.from(files);
    const validFiles: typeof attachments = [];

    for (const file of fileArr) {
      const err = validateFile(file);
      if (err) {
        setError(`${file.name}: ${err}`);
        continue;
      }
      validFiles.push({ file, progress: 0, uploaded: false, url: '' });
    }

    const startIdx = attachments.length;
    setAttachments(prev => [...prev, ...validFiles]);

    for (let i = 0; i < validFiles.length; i++) {
      await simulateUpload(validFiles[i].file, startIdx + i);
    }
  }, [attachments]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!editorRef.current?.innerHTML || editorRef.current.innerHTML === '<br>') {
      setError('请输入作业内容');
      return;
    }
    if (attachments.some(a => !a.uploaded)) {
      setError('请等待文件上传完成');
      return;
    }

    setIsSubmitting(true);
    setError('');

    const formattedContent = editorRef.current.innerHTML;
    const formattedAttachments: Attachment[] = attachments.map((a, idx) => ({
      id: 'att_' + Date.now() + '_' + idx,
      name: a.file.name,
      url: a.url,
      type: a.file.type,
      size: a.file.size
    }));

    try {
      await onSubmit(formattedContent, formattedAttachments);
      setContent('');
      if (editorRef.current) editorRef.current.innerHTML = '';
      setAttachments([]);
      onClose();
    } catch (e) {
      setError('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-container"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">提交作业</h3>
            {lesson && <p className="modal-subtitle">{lesson.title}</p>}
          </div>
          <button className="modal-close-btn" onClick={handleClose} disabled={isSubmitting}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {lesson?.assignment && (
            <div className="requirement-box">
              <div className="requirement-label">作业要求</div>
              <p className="requirement-text">{lesson.assignment.description}</p>
              {lesson.assignment.attachments?.length > 0 && (
                <div className="requirement-attachments">
                  {lesson.assignment.attachments.map(att => (
                    <a key={att.id} href={att.url} className="attachment-link" target="_blank" rel="noreferrer">
                      📎 {att.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="editor-wrapper">
            <div className="editor-toolbar">
              <button type="button" onClick={() => execCommand('bold')} title="加粗">
                <strong>B</strong>
              </button>
              <button type="button" onClick={() => execCommand('italic')} title="斜体">
                <em>I</em>
              </button>
              <div className="toolbar-divider" />
              <button type="button" onClick={() => execCommand('insertUnorderedList')} title="无序列表">
                • 列表
              </button>
              <button type="button" onClick={() => execCommand('insertOrderedList')} title="有序列表">
                1. 编号
              </button>
              <div className="toolbar-divider" />
              <button type="button" onClick={insertImage} title="插入图片">
                🖼 图片
              </button>
            </div>
            <div
              ref={editorRef}
              className="rich-editor"
              contentEditable
              suppressContentEditableWarning
              onInput={e => setContent(e.currentTarget.innerHTML)}
              placeholder="在此输入作业内容..."
            />
          </div>

          <div
            className={`upload-area ${dragging ? 'dragging' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.png,.jpg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
              style={{ display: 'none' }}
              onChange={e => e.target.files && handleFiles(e.target.files)}
            />
            <div className="upload-icon">📁</div>
            <div className="upload-text">拖拽文件到此处，或<span className="upload-hint">点击选择文件</span></div>
            <div className="upload-formats">支持 .pdf / .docx / .png / .jpg，单个文件不超过 10MB</div>
          </div>

          {attachments.length > 0 && (
            <div className="attachment-list">
              {attachments.map((att, idx) => (
                <div key={idx} className="attachment-item">
                  <span className="attachment-icon">📄</span>
                  <span className="attachment-name">{att.file.name}</span>
                  <div className="attachment-progress-wrap">
                    <div
                      className="attachment-progress-bar"
                      style={{ width: `${att.progress}%` }}
                    />
                  </div>
                  <span className="attachment-size">
                    {(att.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  {att.uploaded && <span className="attachment-status success">✓</span>}
                  <button
                    className="attachment-remove"
                    onClick={() => removeAttachment(idx)}
                    disabled={!att.uploaded}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="modal-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '提交中...' : '提交作业'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignmentModal;
