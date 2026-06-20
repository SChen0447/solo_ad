import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FontItem, TypographySettings } from './types';

interface CodeGeneratorProps {
  fonts: FontItem[];
  typography: TypographySettings;
  onClose: () => void;
}

function CodeGenerator({ fonts, typography, onClose }: CodeGeneratorProps) {
  const [copied, setCopied] = useState(false);

  const getCssFontFormat = (format: string): string => {
    switch (format) {
      case 'ttf': return 'truetype';
      case 'otf': return 'opentype';
      case 'woff': return 'woff';
      case 'woff2': return 'woff2';
      default: return format;
    }
  };

  const generatedCode = useMemo(() => {
    const fontFaceRules = fonts.map(font => {
      const cssFormat = getCssFontFormat(font.format);
      return `@font-face {
  font-family: '${font.name}';
  src: url('./fonts/${font.fileName}') format('${cssFormat}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}`;
    }).join('\n\n');

    const fontFamilies = fonts.map(f => `'${f.name}'`).join(', ');

    const cssStyle = `.typography-preview {
  ${fonts.length > 0 ? `font-family: ${fontFamilies};` : ''}
  font-size: ${typography.fontSize}px;
  line-height: ${typography.lineHeight};
  font-weight: ${typography.fontWeight};
  color: ${typography.color};
  text-align: ${typography.textAlign};
}`;

    return `/* 字体声明 */\n${fontFaceRules}\n\n/* 排版样式 */\n${cssStyle}`;
  }, [fonts, typography]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = generatedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>导出代码</h3>
        <button style={styles.closeButton} onClick={onClose}>
          ✕
        </button>
      </div>

      <div style={styles.content}>
        <div style={styles.codeHeader}>
          <span style={styles.codeLabel}>CSS 代码</span>
          <motion.button
            style={{
              ...styles.copyButton,
              ...(copied ? styles.copyButtonCopied : {}),
            }}
            onClick={handleCopy}
            whileTap={{ scale: 0.97 }}
          >
            {copied ? '✓ 已复制' : '复制代码'}
          </motion.button>
        </div>

        <div style={styles.codeBlock}>
          <pre style={styles.codePre}>
            <code style={styles.codeText}>{generatedCode}</code>
          </pre>
        </div>

        <p style={styles.hint}>
          提示：将字体文件放置在 fonts 目录下，并将上述 CSS 代码添加到你的样式表中即可使用。
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '80vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
  },
  closeButton: {
    width: '32px',
    height: '32px',
    border: 'none',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.1s',
  },
  content: {
    padding: '20px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflow: 'hidden',
  },
  codeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  copyButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'filter 0.1s',
  },
  copyButtonCopied: {
    backgroundColor: '#10b981',
  },
  codeBlock: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    overflow: 'auto',
    minHeight: '300px',
  },
  codePre: {
    margin: 0,
    padding: '16px',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  codeText: {
    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Mono', 'Droid Sans Mono', 'Source Code Pro', monospace",
    color: '#e2e8f0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  hint: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.5,
  },
};

export default CodeGenerator;
