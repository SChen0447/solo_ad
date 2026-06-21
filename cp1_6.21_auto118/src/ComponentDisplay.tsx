import React, { useMemo } from 'react';
import { componentConfigs } from './components';

interface ComponentDisplayProps {
  componentName: string;
  props: Record<string, any>;
  code: string;
  isAnimating?: boolean;
}

const syntaxHighlight = (code: string): React.ReactNode[] => {
  const lines = code.split('\n');
  return lines.map((line, lineIndex) => {
    let highlighted = line;
    highlighted = highlighted.replace(/(<\/?)(\w+)/g, '$1<span class="token tag">$2</span>');
    highlighted = highlighted.replace(/(\/?>)/g, '<span class="token tag">$1</span>');
    highlighted = highlighted.replace(/(\s+)(\w+)(=)/g, '$1<span class="token attr-name">$2</span>$3');
    highlighted = highlighted.replace(/"([^"]*)"/g, '<span class="token string">"$1"</span>');
    highlighted = highlighted.replace(/{([^}]+)}/g, '{<span class="token number">$1</span>}');
    
    return (
      <div key={lineIndex} className="code-line">
        <span dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }} />
      </div>
    );
  });
};

export const ComponentDisplay: React.FC<ComponentDisplayProps> = ({ componentName, props, code, isAnimating }) => {
  const config = useMemo(() => componentConfigs[componentName], [componentName]);
  const Component = config?.component;

  if (!config || !Component) {
    return (
      <div className="component-display">
        <div className="empty-state">请选择一个组件</div>
      </div>
    );
  }

  return (
    <div className={`component-display ${isAnimating ? 'fade-in' : ''}`}>
      <div className="preview-section">
        <div className="section-header">
          <span className="section-title">预览 Preview</span>
        </div>
        <div className="preview-card">
          <Component {...props} />
        </div>
      </div>
      
      <div className="code-section">
        <div className="section-header">
          <span className="section-title">代码 Code</span>
        </div>
        <div className="code-card">
          <pre className="code-highlight">
            <code>{syntaxHighlight(code)}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ComponentDisplay;
