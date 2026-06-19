import React, { useState, useMemo, useEffect } from 'react';
import { ComponentNode } from '../interfaces';
import './ExportPanel.css';

type ExportTab = 'json' | 'react' | 'html';

interface ExportPanelProps {
  open: boolean;
  onClose: () => void;
  componentTree: ComponentNode;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ open, onClose, componentTree }) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('json');
  const [copied, setCopied] = useState(false);
  const [fileName, setFileName] = useState('ui-components');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const jsonString = useMemo(
    () => JSON.stringify(componentTree, null, 2),
    [componentTree],
  );

  const reactCode = useMemo(() => generateReactCode(componentTree), [componentTree]);
  const htmlCode = useMemo(() => generateHtmlCode(componentTree), [componentTree]);

  const activeContent =
    activeTab === 'json' ? jsonString : activeTab === 'react' ? reactCode : htmlCode;

  const activeExt = activeTab === 'json' ? 'json' : activeTab === 'react' ? 'jsx' : 'html';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = activeContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([activeContent], {
      type:
        activeTab === 'json'
          ? 'application/json'
          : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'ui-components'}.${activeExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div
      className="ep-modal-mask"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ep-modal" role="dialog" aria-modal="true" aria-label="导出代码">
        <div className="ep-header">
          <h3 className="ep-title">导出与代码预览</h3>
          <button className="ep-close" onClick={onClose} title="关闭 (Esc)">
            ×
          </button>
        </div>

        <div className="ep-tabs">
          <button
            className={`ep-tab ${activeTab === 'json' ? 'ep-tab-active' : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
          <button
            className={`ep-tab ${activeTab === 'react' ? 'ep-tab-active' : ''}`}
            onClick={() => setActiveTab('react')}
          >
            React JSX
          </button>
          <button
            className={`ep-tab ${activeTab === 'html' ? 'ep-tab-active' : ''}`}
            onClick={() => setActiveTab('html')}
          >
            HTML
          </button>
        </div>

        <div className="ep-toolbar">
          <div className="ep-file-name">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value.replace(/[^\w-]/g, ''))}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'inherit',
                fontSize: 12,
                color: '#475569',
                width: 180,
              }}
              maxLength={40}
              title="文件名"
            />
            .{activeExt}
          </div>
          <div className="ep-actions">
            <button className="ep-btn ep-btn-secondary" onClick={handleCopy}>
              📋 复制
            </button>
            <button className="ep-btn ep-btn-primary" onClick={handleDownload}>
              ⬇ 下载
            </button>
          </div>
        </div>

        <div className="ep-body">
          <div className="ep-code-wrapper">
            {copied && <div className="ep-copied">✓ 已复制到剪贴板</div>}
            <pre className="ep-code">
              <code>{activeContent}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

function generateReactCode(node: ComponentNode, depth = 0): string {
  const indent = '  '.repeat(depth);
  const styleStr = Object.keys(node.style).length
    ? JSON.stringify(node.style, null, 2)
        .split('\n')
        .map((l, i) => (i === 0 ? l : indent + '    ' + l))
        .join('\n')
    : '{}';

  const propsStr = Object.entries(node.props)
    .filter(([k]) => k !== 'children')
    .map(([k, v]) => {
      if (typeof v === 'string') return `${k}="${escapeAttr(v)}"`;
      return `${k}={${JSON.stringify(v)}}`;
    })
    .join(' ');

  const hasChildrenArray = Array.isArray(node.children) && node.children.length > 0;
  const hasTextChild = typeof node.children === 'string' && node.children.length > 0;
  const hasPropsChild =
    typeof node.props.children === 'string' && node.props.children.length > 0;
  const textContent = hasTextChild
    ? node.children
    : hasPropsChild
    ? (node.props.children as string)
    : '';

  const styleAttr = Object.keys(node.style).length ? ` style={${styleStr}}` : '';
  const propAttr = propsStr.length ? ` ${propsStr}` : '';

  switch (node.type) {
    case 'Container':
    case 'Card': {
      const tag = node.type === 'Card' ? 'div' : 'div';
      const header = `${indent}<${tag}${propAttr}${styleAttr}>`;
      if (!hasChildrenArray && !textContent.length) {
        return header.slice(0, -1) + ' />';
      }
      const childCode = hasChildrenArray
        ? (node.children as ComponentNode[])
            .map((c) => generateReactCode(c, depth + 1))
            .join('\n')
        : '';
      const textPart = textContent.length ? `${indent}  ${escapeText(textContent)}` + '\n' : '';
      return `${header}\n${textPart}${childCode}${childCode || textContent.length ? '\n' : ''}${indent}</${tag}>`;
    }
    case 'Button': {
      return `${indent}<button${propAttr}${styleAttr}>${
        textContent.length ? escapeText(textContent) : 'Button'
      }</button>`;
    }
    case 'Input': {
      return `${indent}<input${propAttr}${styleAttr} />`;
    }
    case 'Image': {
      return `${indent}<img${propAttr}${styleAttr} />`;
    }
    case 'Badge': {
      return `${indent}<span${propAttr}${styleAttr}>${
        textContent.length ? escapeText(textContent) : 'Badge'
      }</span>`;
    }
    case 'Text': {
      return `${indent}<p${propAttr}${styleAttr}>${
        textContent.length ? escapeText(textContent) : ''
      }</p>`;
    }
    default:
      return `${indent}<div /* Unknown type: ${node.type} */${styleAttr} />`;
  }
}

function generateHtmlCode(node: ComponentNode, depth = 0): string {
  const indent = '  '.repeat(depth);
  const styleStr = Object.entries(node.style)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');
  const styleAttr = styleStr.length ? ` style="${escapeAttr(styleStr)}"` : '';

  const attrsArr: string[] = [];
  for (const [k, v] of Object.entries(node.props)) {
    if (k === 'children') continue;
    if (k === 'disabled' && !!v) attrsArr.push('disabled');
    else if (typeof v === 'string' && v.length) attrsArr.push(`${k}="${escapeAttr(v)}"`);
    else if (typeof v !== 'object') attrsArr.push(`${k}="${escapeAttr(String(v))}"`);
  }
  const propsAttr = attrsArr.length ? ' ' + attrsArr.join(' ') : '';

  const hasChildrenArray = Array.isArray(node.children) && node.children.length > 0;
  const hasTextChild = typeof node.children === 'string' && node.children.length > 0;
  const hasPropsChild =
    typeof node.props.children === 'string' && node.props.children.length > 0;
  const textContent = hasTextChild
    ? node.children
    : hasPropsChild
    ? (node.props.children as string)
    : '';

  switch (node.type) {
    case 'Container': {
      const tag = 'div';
      if (!hasChildrenArray && !textContent.length) {
        return `${indent}<${tag}${propsAttr}${styleAttr}></${tag}>`;
      }
      const childCode = hasChildrenArray
        ? (node.children as ComponentNode[])
            .map((c) => generateHtmlCode(c, depth + 1))
            .join('\n')
        : '';
      const textPart = textContent.length ? `${indent}  ${escapeText(textContent)}` + '\n' : '';
      return `${indent}<${tag}${propsAttr}${styleAttr}>\n${textPart}${childCode}${
        childCode || textContent.length ? '\n' : ''
      }${indent}</${tag}>`;
    }
    case 'Card': {
      if (!hasChildrenArray && !textContent.length) {
        return `${indent}<div class="card"${propsAttr}${styleAttr}></div>`;
      }
      const childCode = hasChildrenArray
        ? (node.children as ComponentNode[])
            .map((c) => generateHtmlCode(c, depth + 1))
            .join('\n')
        : '';
      const textPart = textContent.length ? `${indent}  ${escapeText(textContent)}` + '\n' : '';
      return `${indent}<div class="card"${propsAttr}${styleAttr}>\n${textPart}${childCode}${
        childCode || textContent.length ? '\n' : ''
      }${indent}</div>`;
    }
    case 'Button':
      return `${indent}<button${propsAttr}${styleAttr}>${
        textContent.length ? escapeText(textContent) : 'Button'
      }</button>`;
    case 'Input':
      return `${indent}<input type="text"${propsAttr}${styleAttr}>`;
    case 'Image':
      return `${indent}<img${propsAttr}${styleAttr}>`;
    case 'Badge':
      return `${indent}<span class="badge"${propsAttr}${styleAttr}>${
        textContent.length ? escapeText(textContent) : 'Badge'
      }</span>`;
    case 'Text':
      return `${indent}<p${propsAttr}${styleAttr}>${
        textContent.length ? escapeText(textContent) : ''
      }</p>`;
    default:
      return `${indent}<!-- Unknown type: ${node.type} -->\n${indent}<div${styleAttr}></div>`;
  }
}

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase();
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default ExportPanel;
