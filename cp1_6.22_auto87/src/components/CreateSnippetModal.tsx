import { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-json';
import type { Language, Snippet } from '../data/snippets';
import {
  LANGUAGE_COLORS,
  LANGUAGE_PRISM_MAP,
  generateId,
  hashStringToColor,
  hashStringToTextColor,
} from '../data/snippets';

interface CreateSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (snippet: Snippet) => void;
}

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'json', label: 'JSON' },
];

export default function CreateSnippetModal({ isOpen, onClose, onCreate }: CreateSnippetModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<Language>('javascript');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const previewRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setCode('');
      setLanguage('javascript');
      setTagInput('');
      setTags([]);
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (previewRef.current && code) {
      previewRef.current.textContent = code;
      Prism.highlightElement(previewRef.current);
    }
  }, [code, language, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const addTagsFromInput = () => {
    if (!tagInput.trim()) return;
    const newTags = tagInput
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0 && !tags.includes(t));
    setTags(prev => [...prev, ...newTags]);
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagsFromInput();
    }
    if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = '请输入标题';
    if (!description.trim()) newErrors.description = '请输入描述';
    if (!code.trim()) newErrors.code = '请输入代码内容';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const finalTags = tagInput.trim()
      ? [
          ...tags,
          ...tagInput
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0 && !tags.includes(t)),
        ]
      : tags;

    const snippet: Snippet = {
      id: generateId(),
      title: title.trim(),
      description: description.trim(),
      code: code.trim(),
      language,
      tags: finalTags.length > 0 ? finalTags : ['未分类'],
      createdAt: Date.now(),
    };

    onCreate(snippet);
    onClose();
  };

  const handleTextareaTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newValue);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  if (!isOpen) return null;

  const prismLang = LANGUAGE_PRISM_MAP[language];
  const langColor = LANGUAGE_COLORS[language];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>新建代码片段</h2>
          <button className="modal-close-btn" onClick={onClose} title="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <label className="form-label">
              标题 <span className="required">*</span>
            </label>
            <input
              type="text"
              className={`form-input ${errors.title ? 'has-error' : ''}`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="给你的代码片段起个名字"
            />
            {errors.title && <span className="error-text">{errors.title}</span>}
          </div>

          <div className="form-row">
            <label className="form-label">
              描述 <span className="required">*</span>
            </label>
            <textarea
              className={`form-textarea-small ${errors.description ? 'has-error' : ''}`}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="简要描述这段代码的用途..."
              rows={2}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-row">
            <label className="form-label">编程语言</label>
            <div className="language-selector">
              {LANGUAGE_OPTIONS.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  className={`lang-option ${language === opt.value ? 'active' : ''}`}
                  onClick={() => setLanguage(opt.value)}
                  style={
                    language === opt.value
                      ? { backgroundColor: LANGUAGE_COLORS[opt.value], color: '#fff', borderColor: LANGUAGE_COLORS[opt.value] }
                      : {}
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">
              代码内容 <span className="required">*</span>
            </label>
            <div className={`code-editor-wrapper ${errors.code ? 'has-error' : ''}`}>
              <div className="editor-header" style={{ borderTop: `3px solid ${langColor}` }}>
                <span className="editor-lang">{language.toUpperCase()}</span>
                <span className="editor-preview-label">预览</span>
              </div>
              <div className="editor-container">
                <textarea
                  ref={textareaRef}
                  className="code-textarea"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={handleTextareaTab}
                  placeholder="在这里粘贴或输入代码..."
                  spellCheck={false}
                />
                <div className="code-preview">
                  <pre className={`language-${prismLang}`} style={{ margin: 0, padding: '12px', minHeight: '100%' }}>
                    <code ref={previewRef} className={`language-${prismLang}`}>
                      {code || '// 代码将在这里显示语法高亮预览'}
                    </code>
                  </pre>
                </div>
              </div>
            </div>
            {errors.code && <span className="error-text">{errors.code}</span>}
          </div>

          <div className="form-row">
            <label className="form-label">标签</label>
            <div className="tags-input-wrapper">
              <div className="tags-display">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="input-tag"
                    style={{
                      backgroundColor: hashStringToColor(tag),
                      color: hashStringToTextColor(tag),
                    }}
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="tag-remove-btn">
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  className="tags-input"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  onBlur={addTagsFromInput}
                  placeholder={tags.length === 0 ? '输入标签，用逗号分隔，回车确认' : ''}
                />
              </div>
            </div>
            <span className="hint-text">用逗号分隔多个标签，按回车确认添加</span>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              创建片段
            </button>
          </div>
        </form>

        <style>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 24px;
            animation: fadeIn 0.2s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .modal-content {
            background: #ffffff;
            border-radius: 16px;
            width: 100%;
            max-width: 720px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideUp 0.25s ease-out;
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
            position: sticky;
            top: 0;
            background: #fff;
            z-index: 10;
          }

          .modal-header h2 {
            font-size: 18px;
            font-weight: 600;
            color: #1a202c;
          }

          .modal-close-btn {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            color: #4a5568;
            transition: all 0.15s;
          }

          .modal-close-btn:hover {
            background: #f7fafc;
            color: #1a202c;
          }

          .modal-form {
            padding: 24px;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .form-row {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .form-label {
            font-size: 14px;
            font-weight: 500;
            color: #2d3748;
          }

          .required {
            color: #e53e3e;
          }

          .form-input,
          .form-textarea-small {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            color: #1a202c;
            transition: all 0.2s;
            background: #fff;
            font-family: inherit;
            resize: vertical;
          }

          .form-input:focus,
          .form-textarea-small:focus {
            outline: none;
            border-color: #3182ce;
            box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.15);
          }

          .has-error {
            border-color: #fc8181 !important;
          }

          .error-text {
            font-size: 12px;
            color: #e53e3e;
          }

          .hint-text {
            font-size: 12px;
            color: #a0aec0;
          }

          .language-selector {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
          }

          .lang-option {
            padding: 6px 14px;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            background: #fff;
            color: #4a5568;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
          }

          .lang-option:hover {
            border-color: #cbd5e0;
            background: #f7fafc;
          }

          .lang-option:active {
            transform: scale(0.95);
          }

          .lang-option.active {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .code-editor-wrapper {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
          }

          .code-editor-wrapper.has-error {
            border-color: #fc8181;
          }

          .editor-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 16px;
            background: #f7fafc;
            border-bottom: 1px solid #e2e8f0;
          }

          .editor-lang {
            font-size: 11px;
            font-weight: 600;
            color: #4a5568;
            letter-spacing: 0.5px;
          }

          .editor-preview-label {
            font-size: 11px;
            color: #a0aec0;
            font-weight: 500;
          }

          .editor-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: 200px;
          }

          .code-textarea {
            width: 100%;
            min-height: 200px;
            padding: 12px;
            border: none;
            border-right: 1px solid #e2e8f0;
            resize: none;
            font-family: 'JetBrains Mono', Menlo, Monaco, Consolas, monospace;
            font-size: 13px;
            line-height: 1.6;
            color: #1a202c;
            background: #fff;
            outline: none;
          }

          .code-preview {
            overflow: auto;
            max-height: 300px;
            background: #2d2d2d;
          }

          .code-preview pre {
            min-height: 200px;
          }

          .tags-input-wrapper {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 6px 10px;
            transition: all 0.2s;
            min-height: 40px;
            display: flex;
            align-items: center;
          }

          .tags-input-wrapper:focus-within {
            border-color: #3182ce;
            box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.15);
          }

          .tags-display {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            align-items: center;
            width: 100%;
          }

          .input-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 12px;
            font-weight: 500;
            padding: 3px 8px 3px 10px;
            border-radius: 12px;
          }

          .tag-remove-btn {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.1);
            color: inherit;
            font-size: 12px;
            line-height: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.15s;
          }

          .tag-remove-btn:hover {
            background: rgba(0, 0, 0, 0.2);
          }

          .tags-input {
            flex: 1;
            min-width: 120px;
            border: none;
            outline: none;
            font-size: 13px;
            padding: 4px;
            background: transparent;
            color: #1a202c;
          }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding-top: 4px;
          }

          .btn {
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.15s;
          }

          .btn-secondary {
            background: #f7fafc;
            color: #4a5568;
            border: 1px solid #e2e8f0;
          }

          .btn-secondary:hover {
            background: #edf2f7;
          }

          .btn-primary {
            background: #3182ce;
            color: #ffffff;
          }

          .btn-primary:hover {
            background: #2b6cb0;
          }

          .btn:active {
            transform: scale(0.97);
          }

          @media (max-width: 640px) {
            .editor-container {
              grid-template-columns: 1fr;
            }
            .code-textarea {
              border-right: none;
              border-bottom: 1px solid #e2e8f0;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
