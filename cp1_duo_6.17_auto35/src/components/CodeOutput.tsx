import React, { useState, useCallback, useMemo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { TypographyParams } from '../utils/textSample';
import { generateCodeBlock } from '../utils/generateCode';

interface CodeOutputProps {
  params: TypographyParams;
}

type CodeFormat = 'css' | 'tailwind';

export const CodeOutput: React.FC<CodeOutputProps> = React.memo(({ params }) => {
  const [format, setFormat] = useState<CodeFormat>('css');
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    return generateCodeBlock(params, format);
  }, [params, format]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 200);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  const handleFormatChange = useCallback((newFormat: CodeFormat) => {
    setFormat(newFormat);
  }, []);

  const customStyle = useMemo(() => ({
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      background: '#16213e',
      margin: 0,
      borderRadius: '0 0 8px 8px',
      fontSize: '13px',
      lineHeight: '1.6',
      overflow: 'auto'
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      background: '#16213e',
      fontFamily: '"Source Code Pro", monospace'
    }
  }), []);

  return (
    <div className="code-output-panel">
      <div className="code-header">
        <div className="code-title-section">
          <h2 className="code-title">代码输出</h2>
          <div className="format-tabs">
            <button
              className={`format-tab ${format === 'css' ? 'active' : ''}`}
              onClick={() => handleFormatChange('css')}
            >
              CSS
            </button>
            <button
              className={`format-tab ${format === 'tailwind' ? 'active' : ''}`}
              onClick={() => handleFormatChange('tailwind')}
            >
              Tailwind
            </button>
          </div>
        </div>
        <button
          className={`copy-btn ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          aria-label="复制代码"
        >
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>

      <div className="code-content">
        <SyntaxHighlighter
          language={format === 'css' ? 'css' : 'jsx'}
          style={customStyle}
          showLineNumbers={false}
          wrapLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>

      <style>{`
        .code-output-panel {
          width: 380px;
          min-width: 380px;
          display: flex;
          flex-direction: column;
          background-color: #16213e;
          border-left: 1px solid #0f3460;
        }

        .code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px;
          border-bottom: 1px solid #0f3460;
          gap: 12px;
        }

        .code-title-section {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .code-title {
          font-size: 16px;
          font-weight: 600;
          color: #eaeaea;
          white-space: nowrap;
        }

        .format-tabs {
          display: flex;
          background-color: #0f3460;
          border-radius: 6px;
          padding: 2px;
        }

        .format-tab {
          padding: 6px 12px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #a0a0a0;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .format-tab:hover {
          color: #eaeaea;
        }

        .format-tab.active {
          background-color: #e94560;
          color: #fff;
        }

        .copy-btn {
          padding: 8px 16px;
          background-color: #0f3460;
          border: none;
          border-radius: 6px;
          color: #eaeaea;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
          white-space: nowrap;
          min-width: 80px;
        }

        .copy-btn:hover {
          background-color: #1a4a7a;
        }

        .copy-btn.copied {
          background-color: #22c55e;
          color: #fff;
          transition: background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }

        .code-content {
          flex: 1;
          overflow: auto;
        }

        .code-content::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .code-content::-webkit-scrollbar-track {
          background: #16213e;
        }

        .code-content::-webkit-scrollbar-thumb {
          background: #0f3460;
          border-radius: 3px;
        }

        @media (max-width: 768px) {
          .code-output-panel {
            width: 100%;
            min-width: 100%;
            border-left: none;
            border-top: 1px solid #0f3460;
            height: 300px;
          }

          .code-header {
            flex-wrap: wrap;
            padding: 16px;
          }

          .code-title-section {
            flex-wrap: wrap;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
});

CodeOutput.displayName = 'CodeOutput';

export default CodeOutput;
