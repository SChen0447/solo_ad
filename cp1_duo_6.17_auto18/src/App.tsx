import React, { useState, useCallback, useMemo, useEffect } from 'react';
import GradientEditor from './components/GradientEditor';
import PreviewPanel from './components/PreviewPanel';
import type { ColorStop, GradientTemplate } from './types';
import { generateGradientString, generateWebkitGradient, generateId } from './utils/gradientUtils';
import { getTemplates, saveTemplate, deleteTemplate } from './services/api';

const defaultStops: ColorStop[] = [
  { id: generateId(), color: '#667eea', position: 0 },
  { id: generateId(), color: '#764ba2', position: 100 },
];

const App: React.FC = () => {
  const [stops, setStops] = useState<ColorStop[]>(defaultStops);
  const [angle, setAngle] = useState<number>(135);
  const [templates, setTemplates] = useState<GradientTemplate[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const gradientStr = useMemo(() => generateGradientString(stops, angle), [stops, angle]);
  const webkitGradientStr = useMemo(() => generateWebkitGradient(stops, angle), [stops, angle]);

  const cssCode = useMemo(() => {
    return `background: ${webkitGradientStr};\nbackground: ${gradientStr};`;
  }, [gradientStr, webkitGradientStr]);

  const handleEditorChange = useCallback((newStops: ColorStop[], newAngle: number) => {
    setStops(newStops);
    setAngle(newAngle);
  }, []);

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 800);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [cssCode]);

  useEffect(() => {
    getTemplates().then((data) => {
      setTemplates(data);
    });
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    if (!templateName.trim()) return;

    const config = { stops, angle };
    const result = await saveTemplate(templateName.trim(), config);

    if (result) {
      setTemplates((prev) => [...prev, result]);
      setShowSaveDialog(false);
      setTemplateName('');
    }
  }, [templateName, stops, angle]);

  const handleDeleteTemplate = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const success = await deleteTemplate(id);
      if (success) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    },
    []
  );

  const handleLoadTemplate = useCallback((template: GradientTemplate) => {
    setStops(template.config.stops);
    setAngle(template.config.angle);
    setSidebarOpen(false);
  }, []);

  const generateThumbnailGradient = (tpl: GradientTemplate) => {
    return generateGradientString(tpl.config.stops, tpl.config.angle);
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#f0f2f5',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          gap: '20px',
          overflow: 'auto',
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
              渐变色拾取与代码生成
            </h1>
            <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0 0' }}>
              拖拽色标调整渐变，一键生成 CSS 代码
            </p>
          </div>
          <button
            onClick={() => setShowSaveDialog(true)}
            style={{
              padding: '8px 20px',
              background: '#1890ff',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = '#40a9ff')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = '#1890ff')
            }
          >
            保存模板
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '20px',
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              background: '#ffffff',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflow: 'auto',
            }}
          >
            <GradientEditor stops={stops} angle={angle} onChange={handleEditorChange} />

            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>CSS 代码</div>
                <button
                  onClick={handleCopyCode}
                  style={{
                    padding: '6px 14px',
                    background: '#f5f5f5',
                    color: '#666',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#e8e8e8';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f5';
                  }}
                >
                  {copied ? '✓ 已复制' : '复制代码'}
                </button>
              </div>
              <div
                style={{
                  position: 'relative',
                  background: '#1e1e2e',
                  borderRadius: '8px',
                  padding: '16px',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '13px',
                  color: '#a6e3a1',
                  lineHeight: 1.6,
                  overflowX: 'auto',
                }}
              >
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {cssCode}
                </pre>
                {copied && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#52c41a',
                      color: '#fff',
                      padding: '6px 16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      animation: 'fadeInUp 0.3s ease',
                    }}
                  >
                    已复制
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              minWidth: 0,
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <PreviewPanel gradient={gradientStr} webkitGradient={webkitGradientStr} />
            </div>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            display: 'none',
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: '#1890ff',
            color: '#fff',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.4)',
            zIndex: 100,
          }}
        >
          ★
        </button>
      </div>

      <div
        style={{
          width: '280px',
          background: '#ffffff',
          borderLeft: '1px solid #e8e8e8',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.3s ease',
        }}
      >
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#333' }}>我的收藏</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
            共 {templates.length} 个模板
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
          }}
        >
          {templates.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: '#bbb',
                fontSize: '13px',
                padding: '40px 0',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📁</div>
              暂无收藏模板
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleLoadTemplate(tpl)}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      height: '60px',
                      background: generateThumbnailGradient(tpl),
                    }}
                  />
                  <div
                    style={{
                      padding: '6px 8px',
                      background: '#fafafa',
                      fontSize: '12px',
                      color: '#555',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tpl.name}
                  </div>
                  <button
                    onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(255, 77, 79, 0.9)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      lineHeight: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showSaveDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              width: '360px',
              boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>
              保存渐变模板
            </div>
            <input
              type="text"
              placeholder="请输入模板名称"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTemplate();
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d9d9d9',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '20px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveDialog(false)}
                style={{
                  padding: '8px 20px',
                  background: '#f5f5f5',
                  color: '#666',
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveTemplate}
                style={{
                  padding: '8px 20px',
                  background: '#1890ff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, 10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        @media (max-width: 1000px) {
          /* 响应式样式在实际应用中可进一步优化 */
        }
      `}</style>
    </div>
  );
};

export default App;
