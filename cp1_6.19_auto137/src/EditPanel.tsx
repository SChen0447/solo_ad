import React, { useMemo } from 'react';
import { Annotation, TagType } from './types';
import { generateCodeSkeleton, copyToClipboard } from './export';

interface Props {
  annotation: Annotation;
  allAnnotations: Annotation[];
  onUpdate: (annotation: Annotation) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TAG_OPTIONS: { value: TagType; label: string; description: string }[] = [
  { value: 'div', label: '<div>', description: '通用容器' },
  { value: 'section', label: '<section>', description: '文档区块' },
  { value: 'header', label: '<header>', description: '页眉头部' },
  { value: 'nav', label: '<nav>', description: '导航栏' },
  { value: 'button', label: '<button>', description: '按钮组件' },
  { value: 'img', label: '<img>', description: '图片元素' },
  { value: 'footer', label: '<footer>', description: '页脚' },
  { value: 'article', label: '<article>', description: '文章内容' },
  { value: 'aside', label: '<aside>', description: '侧边栏' }
];

const CodeLine: React.FC<{ lineNumber: number; content: React.ReactNode }> = ({ lineNumber, content }) => (
  <div className="code-line">
    <span className="code-line-number">{lineNumber}</span>
    <span className="code-line-content">{content}</span>
  </div>
);

const highlightCodeLine = (line: string, lineIdx: number): React.ReactNode => {
  if (line.startsWith('<!--')) {
    return (
      <CodeLine
        key={lineIdx}
        lineNumber={lineIdx + 1}
        content={<span className="code-comment">{line}</span>}
      />
    );
  }

  const tagMatch = line.match(/^(\s*)(<\/?)([a-zA-Z0-9]+)([^>]*)(\/?>)(.*)$/);
  if (tagMatch) {
    const [, indent, openClose, tagName, attrsPart, selfClose, rest] = tagMatch;

    const attrNodes: React.ReactNode[] = [];
    const attrRegex = /([a-zA-Z-]+)(=)(?:"([^"]*)"|'([^']*)')/g;
    let attrMatch;
    let lastIdx = 0;
    while ((attrMatch = attrRegex.exec(attrsPart)) !== null) {
      if (attrMatch.index > lastIdx) {
        attrNodes.push(<span key={`t-${lastIdx}`}>{attrsPart.slice(lastIdx, attrMatch.index)}</span>);
      }
      const value = attrMatch[3] ?? attrMatch[4] ?? '';
      attrNodes.push(
        <React.Fragment key={`a-${attrMatch.index}`}>
          <span className="code-attr">{attrMatch[1]}</span>
          <span className="code-bracket">{attrMatch[2]}</span>
          <span className="code-bracket">"</span>
          <span className="code-attr-value">{value}</span>
          <span className="code-bracket">"</span>
        </React.Fragment>
      );
      lastIdx = attrMatch.index + attrMatch[0].length;
    }
    if (lastIdx < attrsPart.length) {
      attrNodes.push(<span key={`t-end`}>{attrsPart.slice(lastIdx)}</span>);
    }

    const textContent = rest.trim();
    return (
      <CodeLine
        key={lineIdx}
        lineNumber={lineIdx + 1}
        content={
          <>
            {indent}
            <span className="code-bracket">{openClose}</span>
            <span className="code-tag">{tagName}</span>
            {attrNodes}
            <span className="code-bracket">{selfClose}</span>
            {textContent && <span> {textContent}</span>}
          </>
        }
      />
    );
  }

  return (
    <CodeLine
      key={lineIdx}
      lineNumber={lineIdx + 1}
      content={<span>{line}</span>}
    />
  );
};

const EditPanel: React.FC<Props> = ({
  annotation,
  allAnnotations,
  onUpdate,
  onDelete,
  onClose
}) => {
  const codeLines = useMemo(
    () => generateCodeSkeleton(annotation, allAnnotations),
    [annotation, allAnnotations]
  );

  const parentSuggestions = useMemo(() => {
    const names = new Set<string>();
    allAnnotations.forEach((a) => {
      if (a.id !== annotation.id) {
        if (a.componentName) names.add(a.componentName);
        names.add(a.id);
      }
    });
    return Array.from(names);
  }, [allAnnotations, annotation.id]);

  const handleCopyCode = async () => {
    const code = codeLines.join('\n');
    await copyToClipboard(code);
  };

  return (
    <div className="edit-panel">
      <div className="panel-header">
        <div className="panel-id-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          {annotation.id}
        </div>
        <div className="panel-title">
          {annotation.componentName || '未命名组件'}
        </div>
      </div>

      <div className="panel-body">
        <div className="form-group">
          <label className="form-label">组件名称</label>
          <input
            type="text"
            className="form-input"
            placeholder="如 HeaderBar、SubmitButton"
            value={annotation.componentName}
            onChange={(e) => onUpdate({ ...annotation, componentName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">父级组件</label>
          <input
            type="text"
            className="form-input"
            placeholder="如 MainLayout、CardContainer"
            value={annotation.parentName}
            onChange={(e) => onUpdate({ ...annotation, parentName: e.target.value })}
            list={`parent-list-${annotation.id}`}
          />
          <datalist id={`parent-list-${annotation.id}`}>
            {parentSuggestions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div className="form-group">
          <label className="form-label">HTML 标签类型</label>
          <select
            className="form-select"
            value={annotation.tagType}
            onChange={(e) => onUpdate({ ...annotation, tagType: e.target.value as TagType })}
          >
            {TAG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.description}
              </option>
            ))}
          </select>
        </div>

        <div className="section-title">位置与尺寸</div>
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">X 坐标</span>
            <span className="info-value">{Math.round(annotation.x)}px</span>
          </div>
          <div className="info-row">
            <span className="info-label">Y 坐标</span>
            <span className="info-value">{Math.round(annotation.y)}px</span>
          </div>
          <div className="info-row">
            <span className="info-label">宽度</span>
            <span className="info-value">{Math.round(annotation.width)}px</span>
          </div>
          <div className="info-row">
            <span className="info-label">高度</span>
            <span className="info-value">{Math.round(annotation.height)}px</span>
          </div>
          <div className="info-row">
            <span className="info-label">创建时间</span>
            <span className="info-value" style={{ fontFamily: 'inherit', fontSize: 11 }}>
              {new Date(annotation.createdAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        <div className="section-title">代码骨架预览</div>
        <div className="code-preview-wrapper">
          <div className="code-preview-header">
            <span className="code-preview-title">
              {annotation.tagType}.html
            </span>
            <button
              onClick={handleCopyCode}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s'
              }}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(148,163,184,0.1)';
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              复制
            </button>
          </div>
          <div className="code-preview-body">
            {codeLines.map((line, idx) => highlightCodeLine(line, idx))}
          </div>
        </div>
      </div>

      <div className="panel-footer">
        <button
          className="btn btn-ghost"
          onClick={() => onDelete(annotation.id)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          删除
        </button>
        <button
          className="btn btn-primary"
          onClick={onClose}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          完成
        </button>
      </div>
    </div>
  );
};

export default EditPanel;
