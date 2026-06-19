import React, { useState, useCallback } from 'react';
import { LyricLine, ExportFormat } from '../types';
import { formatSRTTime, formatASSTime } from '../utils/LyricParser';

interface ExporterProps {
  lines: LyricLine[];
}

export const Exporter: React.FC<ExporterProps> = ({ lines }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('srt');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedContent, setExportedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const generateSRT = useCallback((lines: LyricLine[]): string => {
    const sorted = [...lines].sort((a, b) => a.startTime - b.startTime);
    return sorted.map((line, index) => {
      return `${index + 1}\n${formatSRTTime(line.startTime)} --> ${formatSRTTime(line.endTime)}\n${line.text}\n`;
    }).join('\n');
  }, []);

  const generateASS = useCallback((lines: LyricLine[]): string => {
    const sorted = [...lines].sort((a, b) => a.startTime - b.startTime);
    const header = `[Script Info]
Title: Lyrics Subtitle
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,64,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
    
    const events = sorted.map(line => {
      const animEffect = getASSEffect(line.animation);
      return `Dialogue: 0,${formatASSTime(line.startTime)},${formatASSTime(line.endTime)},Default,,0,0,0,,${animEffect}${line.text}`;
    }).join('\n');

    return header + events;
  }, []);

  const getASSEffect = (animation: string): string => {
    switch (animation) {
      case 'fade':
        return '{\\fad(300,300)}';
      case 'scale':
        return '{\\fad(300,300)\\t(0,300,\\fscx50\\fscy50)\\t(300,600,\\fscx100\\fscy100)}';
      case 'slide':
        return '{\\fad(300,300)\\move(1920,540,960,540,0,300)}';
      default:
        return '';
    }
  };

  const handleExport = useCallback(() => {
    if (lines.length === 0) {
      alert('请先导入并解析歌词');
      return;
    }
    
    setIsExporting(true);
    setExportedContent('');
    
    setTimeout(() => {
      const content = format === 'srt' ? generateSRT(lines) : generateASS(lines);
      setExportedContent(content);
      setIsExporting(false);
    }, 800);
  }, [lines, format, generateSRT, generateASS]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const textarea = document.createElement('textarea');
      textarea.value = exportedContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [exportedContent]);

  const handleDownload = useCallback(() => {
    const extension = format === 'srt' ? 'srt' : 'ass';
    const mimeType = format === 'srt' ? 'text/plain' : 'text/x-ass';
    const blob = new Blob([exportedContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyrics.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportedContent, format]);

  const highlightSyntax = (content: string, fmt: ExportFormat) => {
    if (fmt === 'srt') {
      return content.split('\n').map((line, i) => {
        if (/^\d+$/.test(line.trim())) {
          return <div key={i} style={{ color: '#a78bfa', fontWeight: 700 }}>{line}</div>;
        }
        if (line.includes('-->')) {
          return <div key={i} style={{ color: '#34d399', fontFamily: 'monospace' }}>{line}</div>;
        }
        if (line.trim() === '') {
          return <div key={i}>&nbsp;</div>;
        }
        return <div key={i} style={{ color: '#cdd6f4' }}>{line}</div>;
      });
    } else {
      return content.split('\n').map((line, i) => {
        if (line.startsWith('[') && line.endsWith(']')) {
          return <div key={i} style={{ color: '#fbbf24', fontWeight: 700 }}>{line}</div>;
        }
        if (line.startsWith('Format:')) {
          return <div key={i} style={{ color: '#60a5fa' }}>{line}</div>;
        }
        if (line.startsWith('Style:')) {
          return <div key={i} style={{ color: '#f472b6' }}>{line}</div>;
        }
        if (line.startsWith('Dialogue:')) {
          return <div key={i} style={{ color: '#34d399' }}>{line}</div>;
        }
        if (line.trim() === '') {
          return <div key={i}>&nbsp;</div>;
        }
        return <div key={i} style={{ color: '#cdd6f4' }}>{line}</div>;
      });
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={lines.length === 0}
        style={{
          padding: '8px 20px',
          backgroundColor: lines.length === 0 ? '#45475a' : '#a78bfa',
          color: '#1e1e2e',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: lines.length === 0 ? 'not-allowed' : 'pointer',
          fontSize: 13,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 100
        }}
        onMouseEnter={(e) => {
          if (lines.length > 0) {
            e.currentTarget.style.backgroundColor = '#8b5cf6';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          if (lines.length > 0) {
            e.currentTarget.style.backgroundColor = '#a78bfa';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        📤 导出字幕
      </button>

      {isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div style={{
            backgroundColor: '#1e1e2e',
            borderRadius: 16,
            width: '100%',
            maxWidth: 720,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            border: '1px solid #313244'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #313244',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ color: '#cdd6f4', fontSize: 18, fontWeight: 700 }}>
                📤 导出字幕文件
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#313244',
                  color: '#cdd6f4',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  transition: 'all 0.2s ease',
                  padding: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f38ba8';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#313244';
                  e.currentTarget.style.color = '#cdd6f4';
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #313244',
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap'
            }}>
              <span style={{ color: '#cdd6f4', fontSize: 13, fontWeight: 500 }}>导出格式：</span>
              {(['srt', 'ass'] as ExportFormat[]).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 8,
                    border: `2px solid ${format === fmt ? '#a78bfa' : '#313244'}`,
                    backgroundColor: format === fmt ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                    color: format === fmt ? '#a78bfa' : '#6c7086',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: format === fmt ? 600 : 400,
                    transition: 'all 0.2s ease',
                    textTransform: 'uppercase'
                  }}
                  onMouseEnter={(e) => {
                    if (format !== fmt) {
                      e.currentTarget.style.borderColor = '#45475a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (format !== fmt) {
                      e.currentTarget.style.borderColor = '#313244';
                    }
                  }}
                >
                  {fmt}
                  <span style={{
                    fontSize: 10,
                    marginLeft: 6,
                    opacity: 0.7,
                    fontWeight: 400
                  }}>
                    {fmt === 'srt' ? '(通用)' : '(高级)'}
                  </span>
                </button>
              ))}
              
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button
                  onClick={handleExport}
                  disabled={isExporting || lines.length === 0}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: isExporting || lines.length === 0 ? '#45475a' : '#a78bfa',
                    color: '#1e1e2e',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: isExporting || lines.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onMouseEnter={(e) => {
                    if (!isExporting && lines.length > 0) {
                      e.currentTarget.style.backgroundColor = '#8b5cf6';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isExporting && lines.length > 0) {
                      e.currentTarget.style.backgroundColor = '#a78bfa';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isExporting ? (
                    <>
                      <div style={{
                        width: 14,
                        height: 14,
                        border: '2px solid rgba(30, 30, 46, 0.3)',
                        borderTopColor: '#1e1e2e',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      生成中...
                    </>
                  ) : (
                    <>🔄 生成预览</>
                  )}
                </button>
              </div>
            </div>

            <div style={{
              flex: 1,
              padding: '16px 24px',
              overflow: 'auto',
              minHeight: 200
            }}>
              {exportedContent ? (
                <div style={{
                  backgroundColor: '#181825',
                  borderRadius: 8,
                  padding: 16,
                  fontSize: 12,
                  lineHeight: 1.6,
                  fontFamily: 'monospace',
                  overflowX: 'auto'
                }}>
                  {highlightSyntax(exportedContent, format)}
                </div>
              ) : (
                <div style={{
                  height: '100%',
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6c7086',
                  gap: 12
                }}>
                  <div style={{ fontSize: 48 }}>
                    {isExporting ? (
                      <div style={{
                        width: 48,
                        height: 48,
                        border: '4px solid rgba(167, 139, 250, 0.2)',
                        borderTopColor: '#a78bfa',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                    ) : '📄'}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    {isExporting ? '正在生成字幕文件...' : '点击"生成预览"按钮查看导出内容'}
                  </div>
                </div>
              )}
            </div>

            {exportedContent && (
              <div style={{
                padding: '16px 24px',
                borderTop: '1px solid #313244',
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#313244',
                    color: '#cdd6f4',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#45475a';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#313244';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {copied ? '✓ 已复制' : '📋 复制到剪贴板'}
                </button>
                <button
                  onClick={handleDownload}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#a78bfa',
                    color: '#1e1e2e',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#8b5cf6';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#a78bfa';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  💾 下载文件
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};
