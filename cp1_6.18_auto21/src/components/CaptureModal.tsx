import React, { useState, useEffect, useRef } from 'react';
import { X, Link2, FileText, Tag } from 'lucide-react';
import { useCardStore } from '../store/useCardStore';
import { simulateExtractWebInfo, extractTagsFromText } from '../utils/tagUtils';

export const CaptureModal: React.FC = () => {
  const { isCaptureModalOpen, setIsCaptureModalOpen, addCard } = useCardStore();
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [closing, setClosing] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isCaptureModalOpen) {
      setUrl('');
      setContent('');
      setTagInput('');
      setTitle('');
      setSummary('');
      setClosing(false);
    }
  }, [isCaptureModalOpen]);

  useEffect(() => {
    if (isCaptureModalOpen) {
      setTimeout(() => contentRef.current?.focus(), 100);
    }
  }, [isCaptureModalOpen]);

  useEffect(() => {
    if (url.trim()) {
      const info = simulateExtractWebInfo(url);
      setTitle(info.title);
      if (!summary) setSummary(info.summary);
    }
  }, [url]);

  const handleSave = () => {
    if (!content.trim() && !url.trim()) return;

    const textTags = extractTagsFromText(content + ' ' + tagInput);
    const manualTags = tagInput
      .split(/[,，\s]+/)
      .map((t) => t.replace(/^#/, '').trim())
      .filter(Boolean);
    const allTags = [...new Set([...textTags, ...manualTags])];

    const finalTitle = title.trim() || (content.trim().slice(0, 30) + (content.length > 30 ? '...' : '')) || '未命名摘录';
    const finalSummary = summary.trim() || content.trim().slice(0, 80);

    addCard({
      title: finalTitle,
      content: content.trim(),
      url: url.trim(),
      summary: finalSummary,
      tags: allTags,
    });

    setClosing(true);
    setTimeout(() => {
      setIsCaptureModalOpen(false);
    }, 400);
  };

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setIsCaptureModalOpen(false);
    }, 300);
  };

  if (!isCaptureModalOpen && !closing) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className={`modal-container ${closing ? 'modal-closing' : 'modal-opening'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>捕获新摘录</h2>
          <button className="icon-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>
              <Link2 size={16} />
              <span>URL（可选）</span>
            </label>
            <input
              type="text"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>
              <FileText size={16} />
              <span>内容 *</span>
            </label>
            <textarea
              ref={contentRef}
              placeholder="粘贴网页内容或写下你的想法，可使用 #标签 快速标记..."
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>
              <Tag size={16} />
              <span>标题（可选，留空将自动生成）</span>
            </label>
            <input
              type="text"
              placeholder="摘录标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>
              <Tag size={16} />
              <span>标签（空格或逗号分隔）</span>
            </label>
            <input
              type="text"
              placeholder="#前端 #设计 灵感"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
            />
          </div>

          {content || url ? (
            <div className="card-preview">
              <div className="preview-label">预览</div>
              <div className="preview-card">
                <div className="preview-title">{title || '未命名摘录'}</div>
                <div className="preview-summary">
                  {summary || content.slice(0, 60) || '暂无内容'}
                </div>
                {url && <div className="preview-url">{url}</div>}
                <div className="preview-tags">
                  {[
                    ...extractTagsFromText(content + ' ' + tagInput),
                    ...tagInput
                      .split(/[,，\s]+/)
                      .map((t) => t.replace(/^#/, '').trim())
                      .filter(Boolean),
                  ]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((tag) => (
                      <span key={tag} className="preview-tag">
                        #{tag}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!content.trim() && !url.trim()}
          >
            保存摘录
          </button>
        </div>
      </div>
    </div>
  );
};
