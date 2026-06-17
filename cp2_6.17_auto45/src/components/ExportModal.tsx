import React, { useState, useEffect, useRef } from 'react';
import { Theme } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: Theme;
  allThemes: Theme[];
  primaryColor: string;
}

type ExportType = 'css' | 'json';

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, currentTheme, allThemes, primaryColor }) => {
  const [exportType, setExportType] = useState<ExportType>('css');
  const [copied, setCopied] = useState(false);
  const [content, setContent] = useState('');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      generateContent();
    }
  }, [isOpen, exportType, currentTheme, allThemes]);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setContent('');
      setExportType('css');
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const generateContent = () => {
    if (exportType === 'css') {
      const css = `:root {
  --primary: ${currentTheme.primary};
  --secondary: ${currentTheme.secondary};
  --background: ${currentTheme.background};
  --text: ${currentTheme.text};
}`;
      setContent(css);
    } else {
      setContent(JSON.stringify(allThemes, null, 2));
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 500);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: 'slideInFromTop 0.3s ease-out'
        }}
      >
        <style>{`
          @keyframes slideInFromTop {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div style={{ height: 16, backgroundColor: primaryColor }} />

        <div style={{ padding: 24, color: '#333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a2e' }}>导出主题</h2>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 20,
                color: '#999',
                padding: 4
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setExportType('css')}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: exportType === 'css' ? `2px solid ${primaryColor}` : '2px solid #e0e0e0',
                backgroundColor: exportType === 'css' ? `${primaryColor}15` : '#f5f5f5',
                color: exportType === 'css' ? primaryColor : '#666',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              CSS 变量
            </button>
            <button
              onClick={() => setExportType('json')}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                border: exportType === 'json' ? `2px solid ${primaryColor}` : '2px solid #e0e0e0',
                backgroundColor: exportType === 'json' ? `${primaryColor}15` : '#f5f5f5',
                color: exportType === 'json' ? primaryColor : '#666',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              JSON 数据
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <pre
              style={{
                backgroundColor: '#1a1a2e',
                color: '#e0e0e0',
                padding: 16,
                borderRadius: 10,
                fontSize: 12,
                fontFamily: 'monospace',
                maxHeight: 240,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.6
              }}
            >
              {content}
            </pre>
          </div>

          <button
            onClick={handleCopy}
            style={{
              width: '100%',
              height: 42,
              borderRadius: 10,
              border: 'none',
              backgroundColor: copied ? '#22c55e' : primaryColor,
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            {copied ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                复制成功
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                复制到剪贴板
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
