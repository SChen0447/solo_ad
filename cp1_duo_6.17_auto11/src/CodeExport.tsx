import React, { useState } from 'react';
import { BezierCurve, AnimationType } from './types';

interface CodeExportProps {
  curve: BezierCurve;
  animationType: AnimationType;
}

const ANIMATION_PROPERTIES: Record<AnimationType, string> = {
  translate: 'transform',
  scale: 'transform',
  rotate: 'transform',
  opacity: 'opacity'
};

const CodeExport: React.FC<CodeExportProps> = ({ curve, animationType }) => {
  const [copied, setCopied] = useState(false);

  const property = ANIMATION_PROPERTIES[animationType];
  const bezierValue = `cubic-bezier(${curve.p1x.toFixed(3)}, ${curve.p1y.toFixed(3)}, ${curve.p2x.toFixed(3)}, ${curve.p2y.toFixed(3)})`;
  const cssCode = `transition: ${property} 2s ${bezierValue};`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>代码导出</h3>

      <div style={styles.codePanel}>
        <div style={styles.codeHeader}>
          <span style={styles.codeLabel}>CSS</span>
          <button
            style={{
              ...styles.copyButton,
              ...(copied ? styles.copyButtonCopied : {})
            }}
            onClick={handleCopy}
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
        <div style={styles.codeContent}>
          <pre style={styles.codePre}>
            <code style={styles.code}>
              <span style={styles.property}>transition</span>
              <span style={styles.colon}>:</span>{' '}
              <span style={styles.value}>{property}</span>{' '}
              <span style={styles.value}>2s</span>{' '}
              <span style={styles.function}>
                cubic-bezier
                <span style={styles.paren}>(</span>
                <span style={styles.number}>{curve.p1x.toFixed(3)}</span>
                <span style={styles.comma}>,</span>{' '}
                <span style={styles.number}>{curve.p1y.toFixed(3)}</span>
                <span style={styles.comma}>,</span>{' '}
                <span style={styles.number}>{curve.p2x.toFixed(3)}</span>
                <span style={styles.comma}>,</span>{' '}
                <span style={styles.number}>{curve.p2y.toFixed(3)}</span>
                <span style={styles.paren}>)</span>
              </span>
              <span style={styles.semicolon}>;</span>
            </code>
          </pre>
        </div>
      </div>

      <div style={styles.bezierFormula}>
        <h4 style={styles.subtitle}>贝塞尔曲线参数</h4>
        <div style={styles.paramRow}>
          <span style={styles.paramName}>P1</span>
          <span style={styles.paramValue}>
            ({curve.p1x.toFixed(3)}, {curve.p1y.toFixed(3)})
          </span>
        </div>
        <div style={styles.paramRow}>
          <span style={styles.paramName}>P2</span>
          <span style={styles.paramValue}>
            ({curve.p2x.toFixed(3)}, {curve.p2y.toFixed(3)})
          </span>
        </div>
      </div>

      {copied && (
        <div style={styles.toast}>
          ✓ 已复制到剪贴板
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    height: '100%',
    gap: '16px',
    position: 'relative'
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#e0e0e0',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#a0a0c0',
    marginBottom: '10px'
  },
  codePanel: {
    backgroundColor: '#0f0f23',
    borderRadius: '8px',
    border: '1px solid #2a2a4e',
    overflow: 'hidden'
  },
  codeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    backgroundColor: '#16213e',
    borderBottom: '1px solid #2a2a4e'
  },
  codeLabel: {
    fontSize: '12px',
    color: '#667eea',
    fontWeight: 600,
    textTransform: 'uppercase'
  },
  copyButton: {
    padding: '6px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  copyButtonCopied: {
    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)'
  },
  codeContent: {
    padding: '16px'
  },
  codePre: {
    margin: 0,
    fontFamily: "'Fira Code', 'Consolas', monospace",
    fontSize: '13px',
    lineHeight: 1.6,
    overflowX: 'auto'
  },
  code: {
    fontFamily: "'Fira Code', 'Consolas', monospace"
  },
  property: {
    color: '#ff79c6'
  },
  colon: {
    color: '#e0e0e0'
  },
  value: {
    color: '#8be9fd'
  },
  function: {
    color: '#50fa7b'
  },
  paren: {
    color: '#e0e0e0'
  },
  number: {
    color: '#ffb86c'
  },
  comma: {
    color: '#e0e0e0'
  },
  semicolon: {
    color: '#e0e0e0'
  },
  bezierFormula: {
    backgroundColor: '#16213e',
    borderRadius: '8px',
    padding: '14px',
    border: '1px solid #2a2a4e'
  },
  paramRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0'
  },
  paramName: {
    color: '#a0a0c0',
    fontSize: '13px'
  },
  paramValue: {
    color: '#e0e0e0',
    fontFamily: 'monospace',
    fontSize: '13px'
  },
  toast: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#4CAF50',
    color: '#fff',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.4)',
    animation: 'fadeInOut 1.5s ease',
    zIndex: 100
  }
};

export default CodeExport;
