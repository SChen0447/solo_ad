import { marked } from 'marked';
import DOMPurify from 'dompurify';

const PREVIEW_CSS = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Noto Serif SC', 'Source Han Serif SC', Georgia, serif;
    background: #faf3e3;
    color: #2c3e50;
    line-height: 1.75;
    padding: 32px;
    max-width: 800px;
    margin: 0 auto;
    box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.05);
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 0.5em;
    line-height: 1.3;
  }

  h1 {
    font-size: 2rem;
    padding-bottom: 0.3em;
    border-bottom: 2px solid #4a90d9;
    margin-top: 0;
  }

  h2 {
    font-size: 1.5rem;
    padding-bottom: 0.3em;
    border-bottom: 2px solid #e0e0e0;
    margin-top: 1.5em;
  }

  h3 {
    font-size: 1.2rem;
    padding-bottom: 0.3em;
    border-bottom: 2px solid #f0f0f0;
    margin-top: 1.2em;
  }

  p {
    margin-bottom: 1.5em;
    text-align: justify;
    text-indent: 2em;
  }

  p:first-of-type {
    text-indent: 0;
  }

  strong {
    font-weight: 700;
    color: #2c3e50;
  }

  em {
    font-style: italic;
  }

  del {
    text-decoration: line-through;
    color: #999;
  }

  ul, ol {
    margin-bottom: 1.5em;
    padding-left: 2em;
  }

  ul li {
    list-style: disc;
    margin-bottom: 0.5em;
  }

  ul li::marker {
    color: #4a90d9;
    font-size: 1em;
  }

  ol li {
    list-style: decimal;
    margin-bottom: 0.5em;
  }

  ol li::marker {
    font-weight: 700;
    color: #2c3e50;
  }

  blockquote {
    border-left: 4px solid #4a90d9;
    background: #f0f4f8;
    padding: 1em 1.5em;
    margin: 1.5em 0;
    font-style: italic;
    color: #555;
  }

  blockquote p {
    margin-bottom: 0;
    text-indent: 0;
  }

  code {
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
    background: #e8e8e8;
    padding: 0.2em 0.4em;
    border-radius: 4px;
    color: #e74c3c;
  }

  pre {
    background: #1e1e1e;
    padding: 1.5em;
    border-radius: 8px;
    overflow-x: auto;
    margin: 1.5em 0;
    position: relative;
  }

  pre code {
    background: none;
    padding: 0;
    color: #d4d4d4;
    font-size: 0.9em;
    line-height: 1.6;
    text-indent: 0;
  }

  .code-line {
    display: flex;
    min-height: 1.6em;
  }

  .line-number {
    color: #858585;
    text-align: right;
    padding-right: 1em;
    user-select: none;
    min-width: 3em;
    border-right: 1px solid #333;
    margin-right: 1em;
  }

  .line-content {
    flex: 1;
  }

  hr {
    border: none;
    border-top: 2px dashed #999;
    margin: 16px 0;
  }

  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1.5em auto;
    border: 1px solid #d4b896;
    border-radius: 8px;
    background: #fff;
    padding: 4px;
  }

  a {
    color: #4a90d9;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition: border-color 0.2s ease;
  }

  a:hover {
    border-bottom-color: #4a90d9;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.5em 0;
  }

  th, td {
    padding: 0.75em 1em;
    border: 1px solid #e0e0e0;
    text-align: left;
  }

  th {
    background: #f8f9fa;
    font-weight: 700;
  }

  tr:nth-child(even) {
    background: #fafafa;
  }

  @media print {
    body {
      background: #fff;
      box-shadow: none;
      padding: 0;
      max-width: 100%;
    }

    pre {
      background: #f5f5f5 !important;
      border: 1px solid #ddd;
    }

    pre code {
      color: #333 !important;
    }

    .line-number {
      color: #999 !important;
    }

    a {
      color: #2c3e50 !important;
      text-decoration: underline;
    }

    img {
      page-break-inside: avoid;
    }

    h1, h2, h3 {
      page-break-after: avoid;
    }
  }
`;

const FONT_LINKS = `
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;500;700&family=Source+Han+Serif+SC:wght@400;700&display=swap" rel="stylesheet" />
`;

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: true,
  mangle: false,
});

const renderer = new marked.Renderer();

renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const lines = text.split('\n');
  const numberedLines = lines.map((line, index) => `
    <div class="code-line">
      <span class="line-number">${index + 1}</span>
      <span class="line-content">${line}</span>
    </div>
  `).join('');
  
  return `
    <pre class="language-${lang || 'plaintext'}">
      <code>${numberedLines}</code>
    </pre>
  `;
};

marked.use({ renderer });

export const parseMarkdown = (content: string): string => {
  const startTime = performance.now();
  const rawHtml = marked.parse(content) as string;
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['loading', 'class'],
  });
  const endTime = performance.now();
  
  if (endTime - startTime > 150) {
    console.warn(`Markdown rendering took ${endTime - startTime}ms, exceeds 150ms limit`);
  }
  
  return sanitizedHtml;
};

export const exportToHtml = (content: string, title: string): string => {
  const htmlContent = parseMarkdown(content);
  
  const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - 行文笺</title>
  ${FONT_LINKS}
  <style>
    ${PREVIEW_CSS}
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;
  
  return fullHtml;
};

export const exportToPlainText = (content: string): string => {
  let text = content;
  
  text = text.replace(/^#\s+/gm, '');
  text = text.replace(/^##\s+/gm, '');
  text = text.replace(/^###\s+/gm, '');
  text = text.replace(/^####\s+/gm, '');
  text = text.replace(/^#####\s+/gm, '');
  text = text.replace(/^######\s+/gm, '');
  
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/~~(.+?)~~/g, '$1');
  text = text.replace(/`([^`]+)`/g, '$1');
  
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/^```.*\n?/gm, '');
  });
  
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/^[-*+]\s+/gm, '• ');
  text = text.replace(/^\d+\.\s+/gm, '');
  
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '[图片: $1]');
  
  text = text.replace(/^---+$/gm, '—'.repeat(30));
  
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();
  
  return text;
};

export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (e) {
      document.body.removeChild(textarea);
      return false;
    }
  }
};
