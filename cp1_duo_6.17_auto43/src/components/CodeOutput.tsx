import React, { useState, useMemo, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { generateCSS } from '../utils/generateCode';
import { TypographyParams } from '../utils/generateCode';

interface CodeOutputProps {
  params: TypographyParams;
}

const CodeOutput: React.FC<CodeOutputProps> = ({ params }) => {
  const [copied, setCopied] = useState(false);
  const [codeType, setCodeType] = useState<'css' | 'tailwind'>('css');

  const cssCode = useMemo(() => generateCSS(params), [params]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }, [cssCode]);

  const customStyle = {
    ...oneDark,
    'pre[class*="language-"]': {
      ...oneDark['pre[class*="language-"]'],
      margin: 0,
      padding: '20px',
      background: '#0f3460',
      fontSize: '13px',
      lineHeight: 1.6,
      borderRadius: '8px'
    },
    'code[class*="language-"]': {
      ...oneDark['code[class*="language-"]'],
      fontFamily: "'Source Code Pro', monospace"
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#16213e',
      height: '100%',
      width: '360px',
      flexShrink: 0,
      overflow: 'hidden'
    }} className="code-output-panel">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid #0f3460'
      }}>
        <span style={{
          color: '#eaeaea',
          fontSize: '16px',
          fontWeight: 600
        }}>
          代码输出
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setCodeType('css')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: codeType === 'css' ? '#e94560' : '#0f3460',
              color: '#eaeaea',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'background 0.2s'
            }}
          >
            CSS
          </button>
          <button
            onClick={() => setCodeType('tailwind')}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: codeType === 'tailwind' ? '#e94560' : '#0f3460',
              color: '#eaeaea',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'background 0.2s'
            }}
          >
            Tailwind
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {codeType === 'css' ? (
          <SyntaxHighlighter language="css" style={customStyle} customStyle={{ background: '#0f3460' }}>
            {cssCode}
          </SyntaxHighlighter>
        ) : (
          <SyntaxHighlighter language="jsx" style={customStyle} customStyle={{ background: '#0f3460' }}>
            {`<div className="font-sans text-[${params.fontSize}px] leading-[${params.lineHeight}] tracking-[${params.letterSpacing}em] text-${params.textAlign} w-[${params.containerWidth}px]">
  {/* 内容 */}
</div>`}
          </SyntaxHighlighter>
        )}
      </div>

      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #0f3460' }}>
        <button
          onClick={handleCopy}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: copied ? '#22c55e' : '#e94560',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'background 0.2s ease',
            boxShadow: '0 2px 8px rgba(233, 69, 96, 0.3)'
          }}
        >
          {copied ? '✓ 已复制' : '一键复制'}
        </button>
      </div>

      <style>{`
        .code-output-panel ::-webkit-scrollbar {
          width: 6px;
        }
        .code-output-panel ::-webkit-scrollbar-track {
          background: #16213e;
        }
        .code-output-panel ::-webkit-scrollbar-thumb {
          background: #0f3460;
          border-radius: 3px;
        }
        .code-output-panel ::-webkit-scrollbar-thumb:hover {
          background: #e94560;
        }
      `}</style>
    </div>
  );
};

export default CodeOutput;
