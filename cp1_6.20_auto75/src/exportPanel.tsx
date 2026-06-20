import { useState } from 'react';
import type { ThemePackage, ExportFormat } from './types';

interface ExportPanelProps {
  theme: ThemePackage | null;
}

const FORMAT_LABELS: Record<ExportFormat, string> = {
  css: 'CSS 变量',
  scss: 'SCSS 变量',
  tailwind: 'Tailwind 配置',
};

const FORMAT_EXT: Record<ExportFormat, string> = {
  css: 'css',
  scss: 'scss',
  tailwind: 'js',
};

const FORMAT_DESC: Record<ExportFormat, string> = {
  css: ':root { --primary: #xxx; } 格式，适用于原生CSS项目',
  scss: '$primary: #xxx; 格式，适用于Sass/SCSS项目',
  tailwind: 'theme.extend.colors { ... } 格式，适用于Tailwind CSS项目',
};

export default function ExportPanel({ theme }: ExportPanelProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('css');
  const [copied, setCopied] = useState(false);

  if (!theme) return null;

  const getContent = () => {
    switch (selectedFormat) {
      case 'css':
        return theme.cssString;
      case 'scss':
        return theme.scssString;
      case 'tailwind':
        return theme.tailwindConfig;
      default:
        return '';
    }
  };

  const triggerDownload = () => {
    const content = getContent();
    const ext = FORMAT_EXT[selectedFormat];
    const filename =
      selectedFormat === 'tailwind' ? 'tailwind.config.js' : `theme.${ext}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDialog(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '16px 24px',
          background: '#1a1a1a',
          borderBottom: '1px solid #333',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 600 }}>
            主题已生成
          </div>
          <div style={{ fontSize: '11px', color: '#9e9e9e', marginTop: '2px' }}>
            包含 {Object.keys(theme.variables).length} 个 CSS 变量
          </div>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          style={{
            padding: '10px 24px',
            background: `linear-gradient(135deg, ${theme.colors[0]?.hex || '#6366f1'}, ${
              theme.colors[2]?.hex || '#8b5cf6'
            })`,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          导出主题
        </button>
      </div>

      {showDialog && (
        <>
          <div
            onClick={() => setShowDialog(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 999,
              animation: 'fadeInScale 0.2s ease-out',
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              width: '560px',
              maxWidth: '90vw',
              background: 'rgba(30, 30, 30, 0.85)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
              animation: 'fadeInScale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#e0e0e0',
                }}
              >
                导出主题配置
              </h3>
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: '#9e9e9e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#9e9e9e',
                    marginBottom: '10px',
                    fontWeight: 500,
                  }}
                >
                  选择导出格式
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt)}
                      style={{
                        flex: 1,
                        padding: '14px 12px',
                        borderRadius: '10px',
                        border:
                          selectedFormat === fmt
                            ? `2px solid ${theme.colors[0]?.hex || '#6366f1'}`
                            : '2px solid rgba(255,255,255,0.08)',
                        background:
                          selectedFormat === fmt
                            ? `linear-gradient(135deg, ${
                                theme.colors[0]?.hex || '#6366f1'
                              }22, ${theme.colors[2]?.hex || '#8b5cf6'}22)`
                            : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        color:
                          selectedFormat === fmt ? '#e0e0e0' : '#9e9e9e',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        {FORMAT_LABELS[fmt]}
                      </div>
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#666',
                    marginTop: '8px',
                    paddingLeft: '4px',
                  }}
                >
                  {FORMAT_DESC[selectedFormat]}
                </div>
              </div>

              <div
                style={{
                  background: '#0d0d0d',
                  borderRadius: '10px',
                  padding: '16px',
                  border: '1px solid #2a2a2a',
                  maxHeight: '240px',
                  overflow: 'auto',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    预览
                  </span>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: copied
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(255,255,255,0.05)',
                      border: 'none',
                      color: copied ? '#22c55e' : '#9e9e9e',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      {copied ? (
                        <polyline points="20 6 9 17 4 12" />
                      ) : (
                        <>
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </>
                      )}
                    </svg>
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontSize: '12px',
                    lineHeight: 1.6,
                    color: '#e0e0e0',
                    fontFamily:
                      "'Fira Code', 'Consolas', 'Monaco', monospace",
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {getContent()}
                </pre>
              </div>
            </div>

            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
              }}
            >
              <button
                onClick={() => setShowDialog(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#e0e0e0',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                取消
              </button>
              <button
                onClick={triggerDownload}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  background: `linear-gradient(135deg, ${
                    theme.colors[0]?.hex || '#6366f1'
                  }, ${theme.colors[2]?.hex || '#8b5cf6'})`,
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载文件
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
