import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Component } from '../types';
import { generateImportStatement, copyToClipboard } from '../utils/componentUtils';
import '../styles/component-detail.css';

function CodeBlock({ code, language = 'jsx' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyToClipboard(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const lines = code.split('\n');

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-language">{language}</span>
        <button
          className={`copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ 已复制' : '📋 复制'}
        </button>
      </div>
      <div className="code-content">
        <pre className="code-pre">
          <code className="code-inner">
            {lines.map((line, index) => (
              <div key={index} className="code-line">
                <span className="line-number">{index + 1}</span>
                <span className="line-code">{line || ' '}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function PreviewFrame({ jsx, props }: { jsx: string; props: Record<string, any> }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generateHtml = useCallback(() => {
    const propsEntries = Object.entries(props);
    const propsCode = propsEntries.map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: "${value.replace(/"/g, '\\"')}"`;
      }
      if (typeof value === 'object' && value !== null) {
        return `${key}: ${JSON.stringify(value)}`;
      }
      return `${key}: ${value}`;
    }).join(',\n    ');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background-color: #ffffff;
      padding: 24px;
    }
    #root { width: 100%; display: flex; align-items: center; justify-content: center; }
  </style>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const props = {
      ${propsCode}
    };

    const Component = (props) => {
      return (
        ${jsx}
      );
    };

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<Component {...props} />);
  </script>
</body>
</html>
    `;
    return html;
  }, [jsx, props]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const timeoutId = setTimeout(() => {
      const doc = iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(generateHtml());
        doc.close();
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [generateHtml]);

  return (
    <iframe
      ref={iframeRef}
      className="preview-frame"
      title="组件预览"
      sandbox="allow-scripts"
    />
  );
}

function PropEditor({
  props,
  defaultProps,
  onChange,
}: {
  props: Record<string, any>;
  defaultProps: Record<string, any>;
  onChange: (key: string, value: any) => void;
}) {
  const renderControl = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <label className="prop-switch">
          <input
            type="checkbox"
            checked={props[key] ?? value}
            onChange={(e) => onChange(key, e.target.checked)}
          />
          <span className="switch-slider" />
        </label>
      );
    }

    if (typeof value === 'number') {
      return (
        <input
          type="number"
          value={props[key] ?? value}
          onChange={(e) => onChange(key, Number(e.target.value))}
          className="prop-input"
        />
      );
    }

    if (key === 'variant' || key === 'size' || key === 'color' || key === 'type' || key === 'shape' || key === 'paddingSize') {
      const options = typeof value === 'string' ? [value] : [];
      const allOptions = key === 'variant'
        ? ['primary', 'secondary', 'danger', 'outline', 'ghost', 'dark', 'light']
        : key === 'size'
        ? ['small', 'medium', 'large', 'xlarge']
        : key === 'color'
        ? ['primary', 'success', 'warning', 'danger', 'default', 'info', 'error']
        : key === 'type'
        ? ['text', 'password', 'line', 'card', 'info', 'success', 'warning', 'error']
        : key === 'shape'
        ? ['circle', 'square']
        : key === 'paddingSize'
        ? ['small', 'medium', 'large']
        : options;

      const uniqueOptions = [...new Set([...allOptions, value as string])];

      return (
        <select
          value={props[key] ?? value}
          onChange={(e) => onChange(key, e.target.value)}
          className="prop-select"
        >
          {uniqueOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (typeof value === 'string') {
      return (
        <input
          type="text"
          value={props[key] ?? value}
          onChange={(e) => onChange(key, e.target.value)}
          className="prop-input"
        />
      );
    }

    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      return (
        <textarea
          value={JSON.stringify(props[key] ?? value, null, 2)}
          onChange={(e) => {
            try {
              onChange(key, JSON.parse(e.target.value));
            } catch {}
          }}
          className="prop-textarea"
          rows={4}
        />
      );
    }

    return (
      <input
        type="text"
        value={String(props[key] ?? value)}
        onChange={(e) => onChange(key, e.target.value)}
        className="prop-input"
      />
    );
  };

  return (
    <div className="prop-editor">
      <h4 className="prop-editor-title">Props 配置</h4>
      <div className="prop-list">
        {Object.entries(defaultProps).map(([key, value]) => (
          <div key={key} className="prop-item">
            <label className="prop-label">
              <span className="prop-name">{key}</span>
              <span className="prop-type">
                {Array.isArray(value) ? 'array' : typeof value}
              </span>
            </label>
            <div className="prop-control">{renderControl(key, value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComponentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [component, setComponent] = useState<Component | null>(null);
  const [loading, setLoading] = useState(true);
  const [props, setProps] = useState<Record<string, any>>({});
  const [copiedImport, setCopiedImport] = useState(false);

  useEffect(() => {
    const fetchComponent = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/components/${id}`);
        if (!res.ok) throw new Error('组件不存在');
        const data = await res.json();
        setComponent(data);
        const latestVersion = data.versions[data.versions.length - 1];
        setProps({ ...latestVersion.defaultProps });
      } catch (error) {
        console.error('获取组件详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchComponent();
  }, [id]);

  const handlePropChange = (key: string, value: any) => {
    setProps((prev) => ({ ...prev, [key]: value }));
  };

  const handleCopyImport = async () => {
    if (!component) return;
    const latestVersion = component.versions[component.versions.length - 1];
    const importStatement = generateImportStatement(
      component.name,
      component.id,
      latestVersion.version
    );
    try {
      await copyToClipboard(importStatement);
      setCopiedImport(true);
      setTimeout(() => setCopiedImport(false), 1500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="spinner" />
        <p>加载组件详情...</p>
      </div>
    );
  }

  if (!component) {
    return (
      <div className="detail-error">
        <h2>组件不存在</h2>
        <button onClick={() => navigate('/')}>返回列表</button>
      </div>
    );
  }

  const latestVersion = component.versions[component.versions.length - 1];
  const importStatement = generateImportStatement(
    component.name,
    component.id,
    latestVersion.version
  );

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回
        </button>
        <div className="detail-header-main">
          <h1 className="detail-title">{component.name}</h1>
          <p className="detail-description">{component.description}</p>
          <div className="detail-meta">
            <div className="detail-tags">
              {component.tags.map((tag, index) => (
                <span key={index} className="tag detail-tag">
                  {tag}
                </span>
              ))}
            </div>
            <span className="detail-version">版本: {latestVersion.version}</span>
          </div>
        </div>
      </div>

      <div className="detail-body">
        <div className="preview-section">
          <div className="section-header">
            <h3>实时预览</h3>
            <span className="section-badge">实时响应</span>
          </div>
          <div className="preview-container">
            <PreviewFrame jsx={latestVersion.jsx} props={props} />
          </div>
          <PropEditor
            props={props}
            defaultProps={latestVersion.defaultProps}
            onChange={handlePropChange}
          />
        </div>

        <div className="code-section">
          <div className="section-header">
            <h3>组件源码</h3>
            <span className="section-badge">JSX</span>
          </div>
          <CodeBlock code={latestVersion.jsx} language="jsx" />
        </div>
      </div>

      <div className="import-section">
        <div className="section-header">
          <h3>引用方式</h3>
        </div>
        <div className="import-code-wrapper">
          <code className="import-code">{importStatement}</code>
          <button
            className={`copy-btn small ${copiedImport ? 'copied' : ''}`}
            onClick={handleCopyImport}
          >
            {copiedImport ? '✓ 已复制' : '📋'}
          </button>
        </div>
      </div>

      <div className="version-history">
        <div className="section-header">
          <h3>版本历史</h3>
        </div>
        <div className="version-list">
          {[...component.versions].reverse().map((ver, index) => (
            <div key={index} className="version-item">
              <span className="version-tag">{ver.version}</span>
              <span className="version-date">
                {new Date(ver.createdAt).toLocaleDateString('zh-CN')}
              </span>
              {index === 0 && <span className="version-latest">最新</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ComponentDetail;
