import React, { useState, useCallback } from 'react';
import MusicCard from '../components/MusicCard';
import { apiService, type SummaryItem, type MusicTrack } from '../services/apiService';
import type { Mood } from '../services/apiService';

const moodGradients: Record<Mood, { from: string; to: string }> = {
  轻松: { from: '#84fab0', to: '#8fd3f4' },
  激昂: { from: '#f093fb', to: '#f5576c' },
  悬疑: { from: '#4facfe', to: '#00f2fe' },
  忧郁: { from: '#667eea', to: '#764ba2' },
  温暖: { from: '#ffecd2', to: '#fcb69f' },
  科技: { from: '#0ba360', to: '#3cba92' },
};

const MAX_TEXT_LENGTH = 5000;

const SAMPLE_TEXT = `欢迎收听本期播客节目，我是主持人小A。今天我们要聊一个非常有趣的话题——人工智能如何改变我们的日常生活。

在过去的十年里，技术的发展速度超乎想象。从智能手机到智能家居，我们已经习惯了各种便利的科技产品。但是，真正的革命才刚刚开始。

我还记得第一次使用语音助手时的那种兴奋感。虽然当时它只能回答一些简单的问题，但现在已经可以帮我们安排日程、播放音乐、甚至控制家里的电器了。

然而，这种快速的发展也带来了一些隐忧。隐私问题、就业冲击、伦理困境，这些都是我们不得不面对的挑战。更重要的是，我们需要思考：在AI时代，人类的价值究竟是什么？

不过，我依然对未来充满希望。因为技术本身是中立的，关键在于我们如何使用它。就像火一样，它可以温暖我们的家，也可以烧毁一切，决定权永远在我们手中。

说到温暖，我想起去年冬天和家人一起度过的时光。那时候外面下着大雪，我们围坐在壁炉旁，喝着热巧克力，聊着天。那种幸福的感觉，是任何技术都无法替代的。

最后，希望每位听众都能在这个快速变化的世界里，找到属于自己的节奏。感谢大家的收听，我们下期再见！`;

const HomePage: React.FC = () => {
  const [inputText, setInputText] = useState(SAMPLE_TEXT);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [musicMatches, setMusicMatches] = useState<Record<string, MusicTrack[]>>({});
  const [selectedMusic, setSelectedMusic] = useState<Record<string, MusicTrack | null>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleAnalyze = useCallback(async () => {
    setError(null);
    if (!inputText.trim()) {
      setError('请输入文稿内容');
      return;
    }
    if (inputText.length > MAX_TEXT_LENGTH) {
      setError(`文稿内容不能超过${MAX_TEXT_LENGTH}字，当前${inputText.length}字`);
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await apiService.generateSummary(inputText);
      setSummaries(result.summaries);
      setMusicMatches({});
      setSelectedMusic({});
      setIsMatching(true);
      const musicResult = await apiService.matchMusic(result.summaries);
      setMusicMatches(musicResult.matches);
      const initial: Record<string, MusicTrack | null> = {};
      for (const s of result.summaries) {
        initial[s.id] = musicResult.matches[s.id]?.[0] ?? null;
      }
      setSelectedMusic(initial);
    } catch (err) {
      setError('分析失败，请重试');
    } finally {
      setIsAnalyzing(false);
      setIsMatching(false);
    }
  }, [inputText]);

  const handleSummaryChange = (id: string, newText: string) => {
    setSummaries(prev => prev.map(s => s.id === id ? { ...s, text: newText } : s));
  };

  const handleMusicSelect = (summaryId: string, track: MusicTrack) => {
    setSelectedMusic(prev => ({ ...prev, [summaryId]: prev[summaryId]?.id === track.id ? null : track }));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) return;
    setSummaries(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const handleExport = async () => {
    if (summaries.length === 0) {
      setError('请先生成摘要后再导出');
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      const payload = {
        summaries: summaries.map((s, idx) => ({
          id: s.id,
          text: s.text,
          music: selectedMusic[s.id] ?? null,
          order: idx,
        })),
      };
      const result = await apiService.exportReport(payload);
      const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
      }
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = url;
        a.download = `播客文稿报告_${Date.now()}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }, 300);
    } catch (err) {
      setError('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1a1a2e', color: '#e8e8f0' }}>
      <header style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
            🎙️
          </div>
          <div>
            <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 700 }}>播客文稿摘要与音乐匹配</h1>
            <p style={{ fontSize: '12px', margin: '2px 0 0', color: '#8888a0' }}>快速生成摘要 · 智能匹配音乐</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || summaries.length === 0}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            border: 'none',
            cursor: isExporting || summaries.length === 0 ? 'not-allowed' : 'pointer',
            background: summaries.length === 0 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #667eea, #764ba2)',
            color: summaries.length === 0 ? '#666' : '#fff',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isExporting ? 0.7 : 1,
          }}
        >
          {isExporting ? '导出中...' : '📄 导出HTML报告'}
        </button>
      </header>

      <main style={{ padding: '24px 32px' }}>
        {error && (
          <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(245,87,108,0.15)', border: '1px solid rgba(245,87,108,0.3)', color: '#f5576c', fontSize: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '24px', flexDirection: 'row', flexWrap: 'wrap' }}>
          <section style={{ flex: '0 0 55%', minWidth: 0, boxSizing: 'border-box' }} className="editor-section">
            <div style={{ background: '#2d2d44', borderRadius: '16px', padding: '24px', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)', height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>📝 文稿编辑区</h2>
                <span style={{ fontSize: '12px', color: inputText.length > MAX_TEXT_LENGTH ? '#f5576c' : '#8888a0' }}>
                  {inputText.length}/{MAX_TEXT_LENGTH}
                </span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                placeholder="在此输入或粘贴播客脚本内容..."
                style={{
                  flex: 1,
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(10px)',
                  color: '#e8e8f0',
                  fontSize: '14px',
                  lineHeight: 1.8,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(100,200,255,0.5)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
              />
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !inputText.trim()}
                style={{
                  marginTop: '16px',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: isAnalyzing || !inputText.trim() ? 'not-allowed' : 'pointer',
                  background: !inputText.trim() ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #84fab0, #8fd3f4)',
                  color: !inputText.trim() ? '#666' : '#1a1a2e',
                  fontSize: '15px',
                  fontWeight: 700,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: isAnalyzing ? 0.7 : 1,
                }}
              >
                {isAnalyzing ? '🔍 分析中...' : isMatching ? '🎵 匹配音乐中...' : '✨ 分析文稿 & 匹配音乐'}
              </button>
            </div>
          </section>

          <section style={{ flex: '1 1 40%', minWidth: 0, boxSizing: 'border-box' }} className="preview-section">
            <div style={{ height: 'calc(100vh - 180px)', overflowY: 'auto', paddingRight: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 600 }}>
                  🎯 摘要预览区 {summaries.length > 0 && <span style={{ color: '#8888a0', fontWeight: 400, fontSize: '13px' }}>(拖拽排序)</span>}
                </h2>
                {summaries.length > 0 && (
                  <span style={{ fontSize: '12px', color: '#8888a0' }}>共 {summaries.length} 条</span>
                )}
              </div>

              {summaries.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#555', textAlign: 'center', gap: '12px' }}>
                  <div style={{ fontSize: '56px', opacity: 0.4 }}>✨</div>
                  <div style={{ fontSize: '14px' }}>点击左侧「分析文稿」按钮开始</div>
                  <div style={{ fontSize: '12px', color: '#444' }}>系统将自动提取核心摘要并匹配音乐</div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {summaries.map((summary, index) => {
                  const g = moodGradients[summary.mood];
                  const tracks = musicMatches[summary.id] || [];
                  const selMusic = selectedMusic[summary.id];
                  const isDragging = dragIndex === index;
                  return (
                    <div
                      key={summary.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      style={{
                        opacity: isDragging ? 0.4 : 1,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <div
                        style={{
                          background: '#2d2d44',
                          borderRadius: '16px',
                          padding: '16px',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          borderLeft: `4px solid ${g.from}`,
                        }}
                        className="summary-card"
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.transform = 'translateY(-4px)';
                          el.style.boxShadow = '0 12px 32px rgba(100,200,255,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLDivElement;
                          el.style.transform = 'translateY(0)';
                          el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'grab', color: '#555', paddingTop: '4px', userSelect: 'none' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
                              <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                              <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                              <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                            </svg>
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: `linear-gradient(135deg, ${g.from}, ${g.to})`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 700, color: '#1a1a2e',
                            }}>
                              {index + 1}
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ marginBottom: '8px' }}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 10px',
                                borderRadius: '12px',
                                background: `linear-gradient(135deg, ${g.from}40, ${g.to}40)`,
                                color: g.from,
                                fontSize: '11px',
                                fontWeight: 600,
                                marginRight: '8px',
                              }}>
                                {summary.mood}
                              </span>
                            </div>
                            <textarea
                              value={summary.text}
                              onChange={(e) => handleSummaryChange(summary.id, e.target.value)}
                              style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.06)',
                                background: 'rgba(255,255,255,0.03)',
                                color: '#e8e8f0',
                                fontSize: '14px',
                                lineHeight: 1.7,
                                resize: 'vertical',
                                minHeight: '60px',
                                outline: 'none',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              }}
                              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(100,200,255,0.4)'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                            />
                          </div>
                        </div>

                        {tracks.length > 0 && (
                          <div style={{ marginTop: '16px' }}>
                            <div style={{ fontSize: '12px', color: '#8888a0', marginBottom: '10px' }}>
                              🎵 匹配音乐 (点击卡片选择，{selMusic ? `已选: ${selMusic.title}` : '未选择'})
                            </div>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                              gap: '12px',
                            }}>
                              {tracks.map(track => (
                                <MusicCard
                                  key={track.id}
                                  track={track}
                                  selected={selectedMusic[summary.id]?.id === track.id}
                                  onSelect={(t) => handleMusicSelect(summary.id, t)}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .editor-section, .preview-section {
            flex: 1 1 100% !important;
          }
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
};

export default HomePage;
