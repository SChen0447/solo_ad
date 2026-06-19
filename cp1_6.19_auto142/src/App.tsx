import React, { useState, useRef, useEffect, useCallback } from 'react';
import { parseFile, ParsedData, getPreviewRows, ColumnType } from './dataParser';
import { generateStory, TEMPLATES, TemplateId, Story, StoryChapter } from './templateEngine';
import { StoryRenderer, exportStoryToHTML } from './storyRenderer';

type GenStep = '解析数据' | '匹配模式' | '合成文本' | '渲染页面';
const GEN_STEPS: GenStep[] = ['解析数据', '匹配模式', '合成文本', '渲染页面'];

const columnTypeLabel: Record<ColumnType, string> = {
  number: '数值', string: '文本', date: '日期', boolean: '布尔', mixed: '混合'
};

const App: React.FC = () => {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<GenStep>('解析数据');
  const [story, setStory] = useState<Story | null>(null);
  const [storyRef, setStoryRef] = useState<Story | null>(null);
  const [editedChapters, setEditedChapters] = useState<Record<string, { title: string; text: string }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ title: string; text: string }>({ title: '', text: '' });
  const [exportToast, setExportToast] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storySectionRef = useRef<HTMLDivElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;
    setErrorMsg('');
    setFileName(file.name);
    try {
      const data = await parseFile(file);
      setParsedData(data);
      setStory(null);
      setStoryRef(null);
      setSelectedTemplate(null);
      setEditedChapters({});
    } catch (e) {
      setErrorMsg((e as Error).message);
      setParsedData(null);
      setFileName('');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleGenerate = useCallback(async () => {
    if (!parsedData || !selectedTemplate) return;
    setIsGenerating(true);
    setGenProgress(0);
    setCurrentStep('解析数据');

    const totalDuration = parsedData.summary.totalRows <= 5000 ? 3800 : 5000;
    const stepMs = totalDuration / GEN_STEPS.length;

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    let generated: Story | null = null;

    for (let si = 0; si < GEN_STEPS.length; si++) {
      const step = GEN_STEPS[si];
      setCurrentStep(step);
      const startProg = (si / GEN_STEPS.length) * 100;
      const endProg = ((si + 1) / GEN_STEPS.length) * 100;
      const startTime = Date.now();
      const endAt = startTime + stepMs;
      await new Promise<void>(resolve => {
        const tick = () => {
          const now = Date.now();
          const ratio = Math.min(1, (now - startTime) / stepMs);
          const eased = 1 - Math.pow(1 - ratio, 3);
          setGenProgress(startProg + (endProg - startProg) * eased);
          if (si === 2 && ratio > 0.5 && generated === null) {
            generated = generateStory(parsedData, selectedTemplate);
            setStory(generated);
            setStoryRef(generated);
          }
          if (now >= endAt) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }

    if (!generated) {
      generated = generateStory(parsedData, selectedTemplate);
      setStory(generated);
      setStoryRef(generated);
    }
    setGenProgress(100);
    await sleep(250);
    setIsGenerating(false);
    setEditedChapters({});
    setTimeout(() => {
      storySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [parsedData, selectedTemplate]);

  const handleEditChapter = (id: string) => {
    if (!story) return;
    const ch = story.chapters.find(c => c.id === id);
    if (!ch) return;
    const prev = editedChapters[id];
    setEditingId(id);
    setEditDraft({ title: prev?.title ?? ch.title, text: prev?.text ?? ch.text });
  };

  const saveEdit = () => {
    if (!editingId) return;
    setEditedChapters(prev => ({
      ...prev,
      [editingId]: { ...editDraft }
    }));
    setEditingId(null);
  };

  const resetChapter = (id: string) => {
    setEditedChapters(prev => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleExport = () => {
    if (!story) return;
    const html = exportStoryToHTML(story, editedChapters);
    const ts = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}_${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `story_${stamp}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportToast(true);
    setTimeout(() => setExportToast(false), 2500);
  };

  useEffect(() => {
    if (editingId !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [editingId]);

  const editingChapter: StoryChapter | undefined = editingId && story
    ? story.chapters.find(c => c.id === editingId)
    : undefined;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f7fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
      color: '#2c3e50'
    }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, -40%) scale(0.7); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes fadeOutUp {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to { opacity: 0; transform: translate(-50%, -55%) scale(0.95); }
        }
        @keyframes toastPop {
          0% { opacity: 0; transform: translate(-50%, -30px) scale(0.9); }
          15% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          85% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -20px) scale(0.95); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(74,144,217,0.35); }
          50% { box-shadow: 0 0 0 8px rgba(74,144,217,0); }
        }
        .grid-transition {
          transition: width 0.3s ease, flex-basis 0.3s ease;
        }
        input::file-selector-button { display: none; }
      `}</style>

      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0,0,0,0.04)'
      }}>
        <div style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg, #4a90d9, #50e3c2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 20, fontWeight: 700,
              boxShadow: '0 4px 12px rgba(74,144,217,0.3)'
            }}>S</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50' }}>DataStory Studio</div>
              <div style={{ fontSize: 12, color: '#8c96a1' }}>交互式数据故事生成器</div>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={!story}
            style={{
              position: 'fixed',
              top: 16,
              right: 32,
              zIndex: 60,
              padding: '10px 20px',
              borderRadius: 10,
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: story ? 'pointer' : 'not-allowed',
              background: story
                ? 'linear-gradient(135deg, #4a90d9, #357abd)'
                : 'linear-gradient(135deg, #c9d6e3, #b0bcc8)',
              boxShadow: story ? '0 4px 14px rgba(74,144,217,0.35)' : 'none',
              transition: 'all 0.25s ease',
              transform: story ? 'scale(1)' : 'scale(1)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: story ? 1 : 0.5
            }}
            onMouseEnter={(e) => {
              if (story) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.filter = 'brightness(1.08)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            <span>⬇</span> 导出 HTML
          </button>
        </div>
      </header>

      <main style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '32px 32px 80px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr)',
        gap: 24
      }}>

        {/* Section 1: File Upload */}
        <section style={{
          background: '#fff',
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 20px', color: '#2c3e50' }}>
            <span style={{ color: '#4a90d9', marginRight: 8 }}>1.</span>
            导入数据集
          </h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? '#4a90d9' : '#cfd8e3'}`,
              borderRadius: 12,
              padding: dragActive ? '48px 24px' : '40px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive ? 'rgba(74,144,217,0.04)' : '#fafbfc',
              transition: 'all 0.25s ease'
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>
              {dragActive ? '📥' : '📂'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#2c3e50', marginBottom: 6 }}>
              {fileName ? `已选择：${fileName}` : '点击或拖拽文件到此处上传'}
            </div>
            <div style={{ fontSize: 12, color: '#8c96a1' }}>
              支持 CSV / JSON 格式 · 文件大小不超过 5MB
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,application/json,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>
          {errorMsg && (
            <div style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(208,2,27,0.06)',
              color: '#d0021b',
              fontSize: 13,
              border: '1px solid rgba(208,2,27,0.15)'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}
        </section>

        {/* Section 2: Data Preview & Summary */}
        {parsedData && (
          <section style={{
            background: '#fff',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 20px', color: '#2c3e50' }}>
              <span style={{ color: '#4a90d9', marginRight: 8 }}>2.</span>
              数据预览
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
              gap: 16,
              marginBottom: 24
            }}>
              <SummaryCard icon="📊" label="数据行数" value={parsedData.summary.totalRows.toLocaleString()} color="#4a90d9" />
              <SummaryCard icon="📋" label="字段数量" value={`${parsedData.summary.totalColumns} 列`} color="#50e3c2" />
              <SummaryCard icon="⚠️" label="缺失值比例" value={`${(parsedData.summary.nullRatio * 100).toFixed(2)}%`} color="#f5a623" />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))',
              gap: 10,
              marginBottom: 20,
              padding: 12,
              background: '#fafbfc',
              borderRadius: 8
            }}>
              {parsedData.summary.columns.map(c => (
                <div key={c.name} style={{
                  fontSize: 12,
                  padding: '6px 10px',
                  background: '#fff',
                  border: '1px solid #eef1f5',
                  borderRadius: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span style={{
                    color: '#2c3e50',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>{c.name}</span>
                  <span style={{
                    flexShrink: 0,
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 10,
                    background: c.type === 'number' ? 'rgba(74,144,217,0.1)'
                      : c.type === 'date' ? 'rgba(80,227,194,0.1)'
                      : c.type === 'string' ? 'rgba(245,166,35,0.1)'
                      : 'rgba(155,89,182,0.1)',
                    color: c.type === 'number' ? '#4a90d9'
                      : c.type === 'date' ? '#28b487'
                      : c.type === 'string' ? '#d48806'
                      : '#8e44ad'
                  }}>{columnTypeLabel[c.type]}</span>
                </div>
              ))}
            </div>

            <DataPreviewTable data={parsedData} />
          </section>
        )}

        {/* Section 3: Template Selection */}
        {parsedData && (
          <section style={{
            background: '#fff',
            borderRadius: 12,
            padding: 32,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 20px', color: '#2c3e50' }}>
              <span style={{ color: '#4a90d9', marginRight: 8 }}>3.</span>
              选择叙事模板
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))',
              gap: 20
            }}>
              {TEMPLATES.map(t => {
                const selected = selectedTemplate === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className="grid-transition"
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      padding: 24,
                      borderRadius: 14,
                      background: selected
                        ? 'linear-gradient(135deg, rgba(74,144,217,0.08), rgba(80,227,194,0.08))'
                        : '#fafbfc',
                      border: selected ? '2px solid #4a90d9' : '2px solid transparent',
                      backgroundImage: selected ? undefined : undefined,
                      boxShadow: selected
                        ? '0 6px 20px rgba(74,144,217,0.18), inset 0 0 0 1px #4a90d9'
                        : '0 0 0 1px #e1e8ee inset',
                      transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = '0 10px 28px rgba(74,144,217,0.18), 0 0 0 2px rgba(74,144,217,0.5) inset';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 0 0 1px #e1e8ee inset';
                      }
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 14,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: selected ? '#4a90d9' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: 14,
                      transition: 'all 0.3s ease',
                      opacity: selected ? 1 : 0
                    }}>✓</div>
                    <div style={{
                      width: 54, height: 54, borderRadius: 14,
                      background: t.id === 'trend' ? 'linear-gradient(135deg, #4a90d9, #357abd)'
                        : t.id === 'comparison' ? 'linear-gradient(135deg, #50e3c2, #28b487)'
                        : 'linear-gradient(135deg, #f5a623, #e67e22)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, marginBottom: 14
                    }}>{t.icon}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#2c3e50', marginBottom: 6 }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#5a6573', lineHeight: 1.6 }}>
                      {t.description}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleGenerate}
                disabled={!selectedTemplate || isGenerating}
                style={{
                  padding: '13px 44px',
                  borderRadius: 12,
                  border: 'none',
                  background: selectedTemplate && !isGenerating
                    ? 'linear-gradient(135deg, #50e3c2, #28b487)'
                    : 'linear-gradient(135deg, #c9d6e3, #b0bcc8)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: selectedTemplate && !isGenerating ? 'pointer' : 'not-allowed',
                  boxShadow: selectedTemplate && !isGenerating
                    ? '0 6px 18px rgba(80,227,194,0.35)' : 'none',
                  transition: 'all 0.25s ease',
                  letterSpacing: 2,
                  animation: selectedTemplate && !isGenerating ? 'pulseGlow 2s ease-in-out infinite' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (selectedTemplate && !isGenerating) e.currentTarget.style.filter = 'brightness(1.06)';
                }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
              >
                {isGenerating ? '正在生成故事...' : '✨ 生成数据故事'}
              </button>
            </div>

            {isGenerating && (
              <div style={{
                marginTop: 24,
                padding: 20,
                background: 'linear-gradient(135deg, rgba(74,144,217,0.05), rgba(80,227,194,0.05))',
                borderRadius: 12
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                  fontSize: 13,
                  color: '#5a6573',
                  fontWeight: 500
                }}>
                  <span>{GEN_STEPS.map((s, i) => (
                    <span key={s} style={{
                      color: currentStep === s ? '#4a90d9' : i < GEN_STEPS.indexOf(currentStep) ? '#28b487' : '#8c96a1',
                      marginRight: i < GEN_STEPS.length - 1 ? 16 : 0
                    }}>
                      {i < GEN_STEPS.indexOf(currentStep) ? '✓ ' : ''}{s}
                    </span>
                  ))}</span>
                  <span style={{ color: '#4a90d9', fontWeight: 600 }}>{Math.round(genProgress)}%</span>
                </div>
                <div style={{
                  height: 8,
                  background: '#eef1f5',
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${genProgress}%`,
                    background: 'linear-gradient(90deg, #4a90d9, #50e3c2)',
                    borderRadius: 4,
                    transition: 'width 0.08s linear'
                  }} />
                </div>
              </div>
            )}
          </section>
        )}

        {/* Section 4: Generated Story */}
        <div ref={storySectionRef}>
          {story && (
            <section>
              <StoryRenderer
                story={story}
                onEdit={handleEditChapter}
                onReset={resetChapter}
                editedChapters={editedChapters}
                showEdit={true}
              />
            </section>
          )}
        </div>

      </main>

      {/* Edit Chapter Overlay */}
      {editingId && editingChapter && (
        <>
          <div
            onClick={() => setEditingId(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 100,
              animation: 'fadeIn 0.25s ease'
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) scale(1)',
              width: 600,
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: '86vh',
              overflow: 'auto',
              zIndex: 101,
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              borderRadius: 16,
              padding: 28,
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              border: '1px solid rgba(255,255,255,0.6)',
              animation: 'fadeInUp 0.4s cubic-bezier(.34,1.56,.64,1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50' }}>编辑章节</div>
                <div style={{ fontSize: 12, color: '#8c96a1', marginTop: 4 }}>修改标题和正文，点击保存后实时生效</div>
              </div>
              <button
                onClick={() => setEditingId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 22,
                  cursor: 'pointer',
                  color: '#8c96a1',
                  padding: 4,
                  width: 32, height: 32,
                  borderRadius: 6,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                  e.currentTarget.style.color = '#2c3e50';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#8c96a1';
                }}
              >×</button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5a6573', marginBottom: 8 }}>
                章节标题
              </label>
              <input
                type="text"
                value={editDraft.title}
                onChange={(e) => setEditDraft(d => ({ ...d, title: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #e1e8ee',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: 'rgba(255,255,255,0.8)',
                  color: '#2c3e50',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#4a90d9';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74,144,217,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e1e8ee';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#5a6573', marginBottom: 8 }}>
                章节正文
              </label>
              <textarea
                value={editDraft.text}
                onChange={(e) => setEditDraft(d => ({ ...d, text: e.target.value }))}
                rows={10}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #e1e8ee',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  lineHeight: 1.8,
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: 'rgba(255,255,255,0.8)',
                  color: '#2c3e50',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#4a90d9';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74,144,217,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e1e8ee';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                onClick={() => setEditingId(null)}
                style={{
                  padding: '10px 22px',
                  borderRadius: 10,
                  border: '1px solid #e1e8ee',
                  background: 'rgba(255,255,255,0.6)',
                  color: '#5a6573',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.6)';
                }}
              >取消</button>
              <button
                onClick={saveEdit}
                style={{
                  padding: '10px 28px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #4a90d9, #357abd)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(74,144,217,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = 'brightness(1.08)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >保存修改</button>
            </div>
          </div>
        </>
      )}

      {/* Export Success Toast */}
      {exportToast && (
        <div style={{
          position: 'fixed',
          top: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          padding: '14px 28px',
          background: 'linear-gradient(135deg, #28b487, #27ae60)',
          color: '#fff',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 12px 28px rgba(40,180,135,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          animation: 'toastPop 2.5s ease forwards',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          导出成功！HTML 文件已下载
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ icon: string; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div style={{
    padding: 18,
    borderRadius: 12,
    background: `linear-gradient(135deg, ${color}10, ${color}03)`,
    border: `1px solid ${color}20`,
    display: 'flex',
    alignItems: 'center',
    gap: 14
  }}>
    <div style={{
      width: 44, height: 44,
      borderRadius: 10,
      background: `linear-gradient(135deg, ${color}, ${color}dd)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 22,
      boxShadow: `0 4px 10px ${color}30`
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: 12, color: '#8c96a1', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#2c3e50' }}>{value}</div>
    </div>
  </div>
);

const DataPreviewTable: React.FC<{ data: ParsedData }> = ({ data }) => {
  const rows = getPreviewRows(data.rows);
  return (
    <div style={{
      overflowX: 'auto',
      borderRadius: 10,
      border: '1px solid #eef1f5'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 13,
        minWidth: 600
      }}>
        <thead>
          <tr style={{ background: '#f0f4f8' }}>
            <th style={{
              padding: '10px 14px',
              textAlign: 'left',
              fontWeight: 600,
              color: '#4a90d9',
              borderBottom: '2px solid #e1e8ee',
              position: 'sticky',
              left: 0,
              background: '#f0f4f8',
              width: 50,
              fontSize: 12
            }}>#</th>
            {data.headers.map(h => (
              <th key={h} style={{
                padding: '10px 14px',
                textAlign: 'left',
                fontWeight: 600,
                color: '#2c3e50',
                borderBottom: '2px solid #e1e8ee',
                whiteSpace: 'nowrap',
                background: '#f0f4f8'
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{
              background: i % 2 === 0 ? '#fff' : '#fafbfc',
              transition: 'background 0.15s'
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(74,144,217,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? '#fff' : '#fafbfc'; }}
            >
              <td style={{
                padding: '9px 14px',
                borderBottom: '1px solid #f0f2f5',
                color: '#8c96a1',
                fontWeight: 600,
                position: 'sticky',
                left: 0,
                background: i % 2 === 0 ? '#fff' : '#fafbfc',
                fontSize: 12
              }}>{i + 1}</td>
              {data.headers.map(h => {
                const v = row[h];
                const display = v === null || v === undefined ? '—'
                  : v instanceof Date ? v.toLocaleDateString()
                  : typeof v === 'number' ? (Math.abs(v) >= 10000 ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v))
                  : String(v);
                return (
                  <td key={h} style={{
                    padding: '9px 14px',
                    borderBottom: '1px solid #f0f2f5',
                    color: v === null || v === undefined ? '#c3ccd5' : '#2c3e50',
                    fontStyle: v === null || v === undefined ? 'italic' : 'normal',
                    maxWidth: 240,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }} title={String(v ?? '')}>{display}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {data.rows.length > rows.length && (
        <div style={{
          padding: '10px 14px',
          fontSize: 12,
          color: '#8c96a1',
          textAlign: 'center',
          background: '#fafbfc',
          borderTop: '1px solid #eef1f5'
        }}>
          仅显示前 {rows.length} 行 · 共 {data.rows.length.toLocaleString()} 行数据
        </div>
      )}
    </div>
  );
};

export default App;
