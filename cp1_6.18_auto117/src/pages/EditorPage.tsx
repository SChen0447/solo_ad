import { useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { generateScript, getAvailableStyles } from '../modules/scriptEngine';
import { analyzeSentiment, getMusicSuggestions } from '../modules/sentimentAnalyzer';
import { playSuggestion } from '../modules/audioSynth';
import type { Storyboard } from '../modules/scriptEngine';

export default function EditorPage() {
  const topic = useAppStore(s => s.topic);
  const setTopic = useAppStore(s => s.setTopic);
  const keywords = useAppStore(s => s.keywords);
  const setKeywords = useAppStore(s => s.setKeywords);
  const scriptSections = useAppStore(s => s.scriptSections);
  const setScriptSections = useAppStore(s => s.setScriptSections);
  const expandedSectionId = useAppStore(s => s.expandedSectionId);
  const setExpandedSectionId = useAppStore(s => s.setExpandedSectionId);
  const editingStoryboardId = useAppStore(s => s.editingStoryboardId);
  const editingSectionId = useAppStore(s => s.editingSectionId);
  const setEditingStoryboard = useAppStore(s => s.setEditingStoryboard);
  const updateStoryboard = useAppStore(s => s.updateStoryboard);
  const reorderStoryboards = useAppStore(s => s.reorderStoryboards);
  const selectedSentiment = useAppStore(s => s.selectedSentiment);
  const selectedText = useAppStore(s => s.selectedText);
  const setSelectedSentiment = useAppStore(s => s.setSelectedSentiment);
  const musicSuggestions = useAppStore(s => s.musicSuggestions);
  const setMusicSuggestions = useAppStore(s => s.setMusicSuggestions);
  const currentlyPlayingId = useAppStore(s => s.currentlyPlayingId);
  const setCurrentlyPlayingId = useAppStore(s => s.setCurrentlyPlayingId);
  const addNotification = useAppStore(s => s.addNotification);
  const readOnlyMode = useAppStore(s => s.readOnlyMode);

  const [isGenerating, setIsGenerating] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const availableStyles = useMemo(() => getAvailableStyles(), []);
  const playbackStopRef = useRef<(() => void) | null>(null);

  const handleGenerate = () => {
    if (!topic.trim() && !keywords.trim()) {
      addNotification('请至少输入主题或风格关键词', 'error');
      return;
    }
    setIsGenerating(true);
    const start = performance.now();
    setTimeout(() => {
      const sections = generateScript(topic, keywords);
      setScriptSections(sections);
      const elapsed = performance.now() - start;
      const remaining = Math.max(0, 400 - elapsed);
      setTimeout(() => {
        setIsGenerating(false);
        addNotification(`脚本大纲已生成，共 ${sections.length} 个段落`, 'success');
      }, remaining);
    }, 50);
  };

  const handleStyleChip = (name: string) => {
    const current = keywords ? `${keywords} ${name}` : name;
    setKeywords(current);
  };

  const toggleSection = (id: string) => {
    setExpandedSectionId(expandedSectionId === id ? null : id);
  };

  const handleDoubleClick = (sectionId: string, storyboardId: string) => {
    if (readOnlyMode) return;
    setEditingStoryboard(sectionId, storyboardId);
  };

  const handleSaveEdit = (data: Partial<Storyboard>) => {
    if (editingSectionId && editingStoryboardId) {
      updateStoryboard(editingSectionId, editingStoryboardId, data);
      addNotification('分镜内容已更新', 'success');
    }
    setEditingStoryboard(null, null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (readOnlyMode) return;
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', id);
    } catch { /* ignore */ }
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverId.current = id;
  };

  const handleDragLeave = () => {
    dragOverId.current = null;
  };

  const handleDrop = (e: React.DragEvent, sectionId: string, targetId: string) => {
    e.preventDefault();
    if (readOnlyMode) { setDraggingId(null); return; }
    const sourceId = draggingId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId || !expandedSectionId) {
      setDraggingId(null);
      return;
    }
    const section = scriptSections.find(s => s.id === sectionId);
    if (!section) { setDraggingId(null); return; }
    const fromIndex = section.storyboards.findIndex(sb => sb.id === sourceId);
    const toIndex = section.storyboards.findIndex(sb => sb.id === targetId);
    if (fromIndex >= 0 && toIndex >= 0) {
      reorderStoryboards(sectionId, fromIndex, toIndex);
    }
    setDraggingId(null);
    dragOverId.current = null;
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    dragOverId.current = null;
  };

  const handleAnalyzeSentiment = (sectionId: string) => {
    const section = scriptSections.find(s => s.id === sectionId);
    if (!section) return;
    const text = section.description.join(' ') + ' ' +
      section.storyboards.map(sb => sb.scene + ' ' + sb.dialogue).join(' ');
    const result = analyzeSentiment(text);
    setSelectedSentiment(result.sentiment, text);
    const suggestions = getMusicSuggestions(result.sentiment);
    setMusicSuggestions(suggestions);
    addNotification(`情感分析完成：${
      result.sentiment === 'positive' ? '积极 😊' :
      result.sentiment === 'negative' ? '消极 😢' : '中性 😐'
    } (置信度 ${Math.round(result.confidence * 100)}%)`, 'info');
  };

  const handlePlaySuggestion = (suggestionId: string) => {
    if (playbackStopRef.current) {
      playbackStopRef.current();
      playbackStopRef.current = null;
    }
    if (currentlyPlayingId === suggestionId) {
      setCurrentlyPlayingId(null);
      return;
    }
    const suggestion = musicSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;
    const { stop } = playSuggestion(suggestion, 5);
    playbackStopRef.current = stop;
    setCurrentlyPlayingId(suggestionId);
    setTimeout(() => {
      setCurrentlyPlayingId(cur => cur === suggestionId ? null : cur);
      playbackStopRef.current = null;
    }, 5100);
  };

  const editingStoryboard = useMemo(() => {
    if (!editingSectionId || !editingStoryboardId) return null;
    const sec = scriptSections.find(s => s.id === editingSectionId);
    return sec?.storyboards.find(sb => sb.id === editingStoryboardId) || null;
  }, [editingSectionId, editingStoryboardId, scriptSections]);

  const sentimentLabel = selectedSentiment === 'positive' ? '积极 😊'
    : selectedSentiment === 'negative' ? '消极 😢' : '中性 😐';

  return (
    <div>
      <header className="editor-header">
        <h1 className="editor-title">脚本编辑器</h1>
        <p className="editor-subtitle">输入主题和风格，快速生成短视频脚本大纲、分镜和配乐建议</p>
      </header>

      <section className="input-panel">
        <div className="input-row">
          <div className="input-group">
            <label>视频主题</label>
            <input
              type="text"
              className="input-field"
              placeholder="例如：周末咖啡探店、深夜emo独白、校园搞笑日常..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              disabled={readOnlyMode || isGenerating}
            />
          </div>
          <div className="input-group">
            <label>风格关键词</label>
            <input
              type="text"
              className="input-field"
              placeholder="例如：治愈、搞笑、悬疑、热血、浪漫..."
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              disabled={readOnlyMode || isGenerating}
            />
            <div className="style-chips">
              {availableStyles.map(s => (
                <span
                  key={s.key}
                  className="style-chip"
                  onClick={() => !readOnlyMode && handleStyleChip(s.name)}
                >
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={readOnlyMode || isGenerating}
        >
          {isGenerating ? (
            <><span>✨ 正在生成脚本</span><span className="loading-dots"></span></>
          ) : (
            <><span>✨</span><span>一键生成脚本大纲</span></>
          )}
        </button>
      </section>

      {scriptSections.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎬</div>
          <div className="empty-state-text">
            还没有脚本内容<br />
            输入主题和关键词后点击「一键生成脚本大纲」开始创作吧！
          </div>
        </div>
      ) : (
        <section className="script-list">
          {scriptSections.map((section, idx) => {
            const isExpanded = expandedSectionId === section.id;
            return (
              <article
                key={section.id}
                className="script-card"
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                <header
                  className="script-card-header"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="script-card-icon">{section.icon}</div>
                  <div className="script-card-title">
                    <h3>{section.title}</h3>
                    <div className="script-card-meta">
                      第 {idx + 1} 段 · {section.storyboards.length} 个镜头
                    </div>
                  </div>
                  <span className={`expand-arrow ${isExpanded ? 'open' : ''}`}>▼</span>
                </header>

                {isExpanded && (
                  <div className="script-card-body">
                    <div className="script-description">
                      {section.description.map((d, i) => (
                        <p key={i}>{d}</p>
                      ))}
                    </div>

                    <div className="script-section-label">
                      <span>🎞 分镜时间轴 {!readOnlyMode && '（拖拽排序 · 双击编辑）'}</span>
                      <button
                        className="sentiment-btn"
                        onClick={() => handleAnalyzeSentiment(section.id)}
                      >
                        <span>🎵</span>分析情感·推荐配乐
                      </button>
                    </div>

                    <div className="storyboard-timeline">
                      {section.storyboards.map((sb) => {
                        const isDragging = draggingId === sb.id;
                        const isDropTarget = dragOverId.current === sb.id && draggingId && draggingId !== sb.id;
                        return (
                          <div
                            key={sb.id}
                            className={`storyboard-block ${isDragging ? 'dragging' : ''} ${isDropTarget ? 'drop-target' : ''}`}
                            draggable={!readOnlyMode}
                            onDragStart={(e) => handleDragStart(e, sb.id)}
                            onDragOver={(e) => handleDragOver(e, sb.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, section.id, sb.id)}
                            onDragEnd={handleDragEnd}
                            onDoubleClick={() => handleDoubleClick(section.id, sb.id)}
                            title={readOnlyMode ? '' : '双击编辑 / 拖拽排序'}
                          >
                            {!readOnlyMode && (
                              <span className="storyboard-edit-hint">✎ 双击编辑</span>
                            )}
                            <span className="storyboard-time">{sb.timestamp}</span>
                            <div className="storyboard-scene">🎬 {sb.scene || <em style={{ color: 'var(--text-muted)' }}>（无画面描述）</em>}</div>
                            <div className="storyboard-dialogue">
                              {sb.dialogue || <em>（无对话）</em>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      {musicSuggestions.length > 0 && (
        <section className="music-section">
          <div className="music-section-header">
            <h3>🎵 配乐建议</h3>
            <span className={`sentiment-tag ${selectedSentiment || 'neutral'}`}>
              情感倾向：{sentimentLabel}
            </span>
          </div>
          <div className="music-cards">
            {musicSuggestions.map(s => {
              const isPlaying = currentlyPlayingId === s.id;
              return (
                <div key={s.id} className="music-card">
                  <div className="music-card-header">
                    <span className="music-card-name">{s.name}</span>
                    <button
                      className={`music-speaker-btn ${isPlaying ? 'playing' : ''}`}
                      onClick={() => handlePlaySuggestion(s.id)}
                      aria-label={isPlaying ? '停止' : '播放'}
                    >
                      🔊
                      <span className={`sound-wave ${isPlaying ? 'playing' : ''}`} />
                    </button>
                  </div>
                  <div className="music-card-desc">{s.description}</div>
                  <div className="music-card-meta">
                    <span>🎼 {s.bpm} BPM</span>
                    <span>🎹 {s.instruments.join(' + ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {selectedText && (
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)' }}>
              分析文本样本："{selectedText.slice(0, 80)}{selectedText.length > 80 ? '...' : ''}"
            </div>
          )}
        </section>
      )}

      {editingStoryboard && (
        <div
          className="glass-editor"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingStoryboard(null, null);
          }}
        >
          <div className="glass-editor-content">
            <h4>✎ 编辑分镜</h4>
            <EditStoryboardForm
              initial={editingStoryboard}
              onSave={handleSaveEdit}
              onCancel={() => setEditingStoryboard(null, null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EditStoryboardForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Storyboard;
  onSave: (data: Partial<Storyboard>) => void;
  onCancel: () => void;
}) {
  const [timestamp, setTimestamp] = useState(initial.timestamp);
  const [scene, setScene] = useState(initial.scene);
  const [dialogue, setDialogue] = useState(initial.dialogue);

  return (
    <>
      <div className="input-group">
        <label>时间戳</label>
        <input
          type="text"
          className="input-field"
          value={timestamp}
          onChange={e => setTimestamp(e.target.value)}
          placeholder="例如 0:15-0:22"
        />
      </div>
      <div className="input-group">
        <label>画面描述</label>
        <textarea
          className="input-field"
          value={scene}
          onChange={e => setScene(e.target.value)}
          placeholder="描述镜头画面、景别、运镜等"
        />
      </div>
      <div className="input-group">
        <label>对话文本</label>
        <textarea
          className="input-field"
          value={dialogue}
          onChange={e => setDialogue(e.target.value)}
          placeholder="角色对话或音效提示"
        />
      </div>
      <div className="glass-editor-actions">
        <button className="btn-secondary" onClick={onCancel}>取消</button>
        <button
          className="btn-primary"
          onClick={() => onSave({ timestamp, scene, dialogue })}
        >
          保存修改
        </button>
      </div>
    </>
  );
}
