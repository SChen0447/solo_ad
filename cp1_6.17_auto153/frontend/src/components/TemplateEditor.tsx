import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  generateFromTemplate,
  type Template,
} from '../utils/api';

interface TemplateEditorProps {
  mergedContent?: string;
  onGenerate?: (result: string) => void;
}

const PLACEHOLDERS = [
  { key: 'title', label: '{{title}}', desc: '文档标题' },
  { key: 'content', label: '{{content}}', desc: '文档正文' },
  { key: 'date', label: '{{date}}', desc: '当前日期' },
  { key: 'author', label: '{{author}}', desc: '作者名称' },
  { key: 'version', label: '{{version}}', desc: '版本号' },
];

const DEFAULT_TEMPLATE = `# {{title}}

> 版本：{{version}} | 日期：{{date}} | 作者：{{author}}

---

## 内容

{{content}}

---

*本文档由 Markdown 文档版本对比与模板生成工具自动生成*
`;

const TemplateEditor: React.FC<TemplateEditorProps> = ({ mergedContent = '', onGenerate }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState(DEFAULT_TEMPLATE);
  const [title, setTitle] = useState('示例文档');
  const [author, setAuthor] = useState('用户');
  const [version, setVersion] = useState('1.0');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    let result = templateContent;
    result = result.replace(/\{\{title\}\}/g, title);
    result = result.replace(/\{\{content\}\}/g, mergedContent);
    result = result.replace(/\{\{date\}\}/g, today);
    result = result.replace(/\{\{author\}\}/g, author);
    result = result.replace(/\{\{version\}\}/g, version);
    setGeneratedContent(result);
  }, [mergedContent, templateContent, title, author, version]);

  const loadTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) {
        selectTemplate(data[0]);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const selectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setTemplateName(template.name);
    setTemplateContent(template.content);
    setIsEditing(false);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setTemplateName('');
    setTemplateContent(DEFAULT_TEMPLATE);
    setIsEditing(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('请输入模板名称');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedTemplate) {
        const updated = await updateTemplate(selectedTemplate.id, templateName, templateContent);
        setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setSelectedTemplate(updated);
      } else {
        const created = await createTemplate(templateName, templateContent);
        setTemplates((prev) => [...prev, created]);
        setSelectedTemplate(created);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('保存模板失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    if (!confirm(`确定要删除模板「${selectedTemplate.name}」吗？`)) return;

    try {
      await deleteTemplate(selectedTemplate.id);
      setTemplates((prev) => prev.filter((t) => t.id !== selectedTemplate.id));
      setSelectedTemplate(null);
      setTemplateName('');
      setTemplateContent(DEFAULT_TEMPLATE);
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('删除模板失败');
    }
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('template-textarea') as HTMLTextAreaElement;
    if (!textarea) {
      setTemplateContent((prev) => prev + placeholder);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = templateContent.substring(0, start);
    const after = templateContent.substring(end);
    const newContent = before + placeholder + after;
    setTemplateContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const pos = start + placeholder.length;
      textarea.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      alert('请选择或创建一个模板');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const data = {
      title,
      content: mergedContent,
      date: today,
      author,
      version,
    };

    try {
      const result = await generateFromTemplate(selectedTemplate.id, data);
      setGeneratedContent(result.content);
      onGenerate?.(result.content);
    } catch (error) {
      console.error('Generate failed:', error);
      alert('生成文档失败');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      alert('已复制到剪贴板');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('复制失败');
    }
  };

  return (
    <div className="template-editor-container">
      <div className="template-toolbar" style={{ marginBottom: '16px' }}>
        <div className="template-list">
          {templates.map((t) => (
            <div
              key={t.id}
              className={`template-item ${selectedTemplate?.id === t.id ? 'active' : ''}`}
              onClick={() => selectTemplate(t)}
            >
              {t.name}
            </div>
          ))}
          <div
            className="template-item"
            style={{
              background: '#f0f0f0',
              borderStyle: 'dashed',
              borderColor: '#ccc',
            }}
            onClick={handleNewTemplate}
          >
            + 新建模板
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: '#666' }}>标题:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="文档标题"
              style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: '#666' }}>作者:</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="作者"
              style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: '#666' }}>版本:</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="版本号"
              style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            {isEditing || !selectedTemplate ? (
              <>
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={isLoading}>
                  {isLoading ? '保存中...' : '保存模板'}
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-outline" onClick={() => setIsEditing(true)}>
                  编辑模板
                </button>
                {selectedTemplate && (
                  <button className="btn btn-danger" onClick={handleDeleteTemplate}>
                    删除
                  </button>
                )}
              </>
            )}
            <button className="btn btn-success" onClick={handleGenerate}>
              生成文档
            </button>
            <button className="btn btn-outline" onClick={handleCopy}>
              复制
            </button>
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="placeholder-tags">
          <span style={{ fontSize: '12px', color: '#888', alignSelf: 'center' }}>占位符:</span>
          {PLACEHOLDERS.map((p) => (
            <span
              key={p.key}
              className="placeholder-tag"
              onClick={() => handleInsertPlaceholder(p.label)}
              title={p.desc}
            >
              {p.label}
            </span>
          ))}
        </div>
      )}

      <div className="template-editor">
        <div className="template-editor-panel">
          <div className="template-editor-header">
            <span>
              {isEditing ? '编辑模板' : '模板内容'}
              {selectedTemplate && !isEditing && ` - ${selectedTemplate.name}`}
            </span>
            {isEditing && (
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="模板名称"
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '12px',
                  width: '150px',
                }}
              />
            )}
          </div>
          <div className="template-editor-content">
            <textarea
              id="template-textarea"
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              readOnly={!isEditing}
              placeholder="在此编辑 Markdown 模板，使用 {{title}}、{{content}} 等占位符..."
            />
          </div>
        </div>

        <div className="template-editor-panel">
          <div className="template-editor-header">
            <span>预览</span>
          </div>
          <div className="template-preview">
            <ReactMarkdown>{generatedContent}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
