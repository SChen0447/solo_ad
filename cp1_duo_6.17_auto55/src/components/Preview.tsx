import React, { useState, useEffect, useMemo } from 'react';
import { marked } from 'marked';

interface PreviewProps {
  content: string;
}

const Preview: React.FC<PreviewProps> = ({ content }) => {
  const [html, setHtml] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      const parsed = marked.parse(content) as string;
      setHtml(parsed);
    }, 200);

    return () => clearTimeout(timer);
  }, [content]);

  const styles = useMemo(() => `
    .preview-container {
      padding: 32px;
      color: #24292e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
    }
    .preview-container h1,
    .preview-container h2,
    .preview-container h3,
    .preview-container h4,
    .preview-container h5,
    .preview-container h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    .preview-container h1 {
      font-size: 2em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid #eaecef;
    }
    .preview-container h2 {
      font-size: 1.5em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid #eaecef;
    }
    .preview-container h3 {
      font-size: 1.25em;
    }
    .preview-container h4 {
      font-size: 1em;
    }
    .preview-container p {
      margin-top: 0;
      margin-bottom: 1.5em;
    }
    .preview-container ul,
    .preview-container ol {
      margin-top: 0;
      margin-bottom: 1.5em;
      padding-left: 2em;
    }
    .preview-container li {
      margin-top: 0.25em;
    }
    .preview-container code {
      padding: 0.2em 0.4em;
      background-color: #f5f5f5;
      border-radius: 3px;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 85%;
    }
    .preview-container pre {
      padding: 16px;
      background-color: #f5f5f5;
      border-radius: 6px;
      overflow-x: auto;
      margin-top: 0;
      margin-bottom: 1.5em;
    }
    .preview-container pre code {
      padding: 0;
      background-color: transparent;
      font-size: 85%;
    }
    .preview-container blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
      margin: 0 0 1.5em 0;
    }
    .preview-container table {
      border-spacing: 0;
      border-collapse: collapse;
      margin-bottom: 1.5em;
      width: 100%;
    }
    .preview-container table th,
    .preview-container table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
    .preview-container table th {
      font-weight: 600;
      background-color: #f6f8fa;
    }
    .preview-container table tr:nth-child(2n) {
      background-color: #f6f8fa;
    }
    .preview-container img {
      max-width: 100%;
      box-sizing: content-box;
      background-color: #fff;
    }
    .preview-container a {
      color: #0366d6;
      text-decoration: none;
    }
    .preview-container a:hover {
      text-decoration: underline;
    }
    .preview-container hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #e1e4e8;
      border: 0;
    }
    .preview-container strong {
      font-weight: 600;
    }
    .preview-container em {
      font-style: italic;
    }
  `, []);

  return (
    <div className="preview-wrapper" style={{ height: '100%', overflowY: 'auto' }}>
      <style>{styles}</style>
      <div
        className="preview-container"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

export default Preview;
