import React, { useState, useCallback, useRef } from 'react';
import { Subtitle, IN_EFFECTS, OUT_EFFECTS, InEffectType, OutEffectType } from '../types';
import { eventBus } from '../utils/eventBus';
import { Timeline } from './Timeline';

const MAX_SUBTITLES = 20;

interface SubtitleEditorProps {
  subtitles: Subtitle[];
  onSubtitlesChange: (subtitles: Subtitle[]) => void;
  selectedSubtitleId: string | null;
  onSelectSubtitle: (id: string | null) => void;
  currentPlayTime: number;
}

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  subtitles,
  onSubtitlesChange,
  selectedSubtitleId,
  onSelectSubtitle,
  currentPlayTime,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const generateId = () => `subtitle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAdd = useCallback(() => {
    if (subtitles.length >= MAX_SUBTITLES) return;
    const lastSubtitle = subtitles[subtitles.length - 1];
    const startTime = lastSubtitle ? lastSubtitle.startTime + lastSubtitle.duration + 0.5 : 0;
    
    const newSubtitle: Subtitle = {
      id: generateId(),
      text: '请输入字幕文字',
      startTime,
      duration: 2,
      fontSize: 48,
      color: '#ffffff',
      inEffect: 'fadeIn',
      outEffect: 'fadeOut',
    };
    
    const updated = [...subtitles, newSubtitle];
    onSubtitlesChange(updated);
    eventBus.emit('subtitle:add', newSubtitle);
    onSelectSubtitle(newSubtitle.id);

    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 50);
  }, [subtitles, onSubtitlesChange, onSelectSubtitle]);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = subtitles.filter(s => s.id !== id);
    onSubtitlesChange(updated);
    eventBus.emit('subtitle:delete', id);
    if (selectedSubtitleId === id) {
      onSelectSubtitle(updated.length > 0 ? updated[0].id : null);
    }
  }, [subtitles, onSubtitlesChange, selectedSubtitleId, onSelectSubtitle]);

  const handleUpdate = useCallback((id: string, updates: Partial<Subtitle>) => {
    const updated = subtitles.map(s => s.id === id ? { ...s, ...updates } : s);
    onSubtitlesChange(updated);
    eventBus.emit('subtitle:update', { id, updates });
  }, [subtitles, onSubtitlesChange]);

  const handleTimelineUpdate = useCallback((id: string, updates: Partial<Subtitle>) => {
    handleUpdate(id, updates);
  }, [handleUpdate]);

  const handleUseCurrentTime = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const rounded = Math.round(currentPlayTime * 10) / 10;
    handleUpdate(id, { startTime: rounded });
  }, [currentPlayTime, handleUpdate]);

  const getDropIndex = (e: React.DragEvent): number => {
    if (!listRef.current) return 0;
    const cards = listRef.current.querySelectorAll('.subtitle-card');
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        return i;
      }
    }
    return cards.length;
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    setDropTargetIndex(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.45';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null) return;
    const targetIndex = getDropIndex(e);
    if (targetIndex !== dropTargetIndex) {
      setDropTargetIndex(targetIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!listRef.current?.contains(e.relatedTarget as Node)) {
      setDropTargetIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIndex === null || dropTargetIndex === null) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      return;
    }

    let toIndex = dropTargetIndex;
    if (draggedIndex < dropTargetIndex) {
      toIndex = dropTargetIndex - 1;
    }
    if (draggedIndex === toIndex) {
      setDraggedIndex(null);
      setDropTargetIndex(null);
      return;
    }

    const updated = [...subtitles];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(toIndex, 0, removed);
    
    onSubtitlesChange(updated);
    eventBus.emit('subtitle:reorder', { fromIndex: draggedIndex, toIndex });
    
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const renderDropIndicator = (index: number) => {
    if (dropTargetIndex === null || draggedIndex === null) return null;
    if (index === dropTargetIndex && dropTargetIndex !== draggedIndex && dropTargetIndex !== draggedIndex + 1) {
      return <div className="drop-indicator" />;
    }
    return null;
  };

  return (
    <div className="section">
      <Timeline
        subtitles={subtitles}
        onSubtitleUpdate={handleTimelineUpdate}
        selectedSubtitleId={selectedSubtitleId}
        onSelectSubtitle={onSelectSubtitle}
      />

      <h2 className="section-title">
        <span>📝</span>
        字幕列表
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 'auto' }}>
          {subtitles.length}/{MAX_SUBTITLES}
        </span>
      </h2>
      
      {subtitles.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <p>暂无字幕，点击下方按钮添加</p>
        </div>
      ) : (
        <div
          className="subtitle-list"
          ref={listRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {subtitles.map((subtitle, index) => (
            <React.Fragment key={subtitle.id}>
              {renderDropIndicator(index)}
              <div
                className={`subtitle-card ${draggedIndex === index ? 'dragging' : ''} ${selectedSubtitleId === subtitle.id ? 'is-selected' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onClick={() => onSelectSubtitle(subtitle.id)}
                style={{
                  borderColor: selectedSubtitleId === subtitle.id ? 'var(--accent-primary)' : undefined,
                }}
              >
                <div className="subtitle-header">
                  <span className="drag-handle">⋮⋮</span>
                  <span className="subtitle-index">{index + 1}</span>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(subtitle.id, e)}
                    title="删除字幕"
                  >
                    ×
                  </button>
                </div>
                
                <div className="subtitle-inputs">
                  <div className="input-group">
                    <label>字幕文字</label>
                    <input
                      type="text"
                      value={subtitle.text}
                      onChange={(e) => handleUpdate(subtitle.id, { text: e.target.value })}
                      placeholder="输入字幕内容"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div className="input-row">
                    <div className="input-group-with-btn">
                      <div className="input-label-row">
                        <label>出现时间 (秒)</label>
                        <button
                          className="current-time-btn"
                          onClick={(e) => handleUseCurrentTime(subtitle.id, e)}
                          title={`填入当前播放时间 (${currentPlayTime.toFixed(1)}s)`}
                        >
                          ⏱ 当前
                        </button>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={subtitle.startTime}
                        onChange={(e) => handleUpdate(subtitle.id, { startTime: parseFloat(e.target.value) || 0 })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="input-group">
                      <label>持续时长 (秒)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={subtitle.duration}
                        onChange={(e) => handleUpdate(subtitle.id, { duration: parseFloat(e.target.value) || 1 })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  
                  <div className="input-row">
                    <div className="input-group">
                      <label>字体大小 (px)</label>
                      <input
                        type="number"
                        min="12"
                        max="120"
                        value={subtitle.fontSize}
                        onChange={(e) => handleUpdate(subtitle.id, { fontSize: parseInt(e.target.value) || 48 })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="input-group">
                      <label>字体颜色</label>
                      <input
                        type="color"
                        value={subtitle.color}
                        onChange={(e) => handleUpdate(subtitle.id, { color: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  
                  <div className="input-row">
                    <div className="input-group">
                      <label>入场特效</label>
                      <div className="select-control">
                        <select
                          value={subtitle.inEffect}
                          onChange={(e) => handleUpdate(subtitle.id, { inEffect: e.target.value as InEffectType })}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {IN_EFFECTS.map(effect => (
                            <option key={effect.value} value={effect.value}>
                              {effect.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="input-group">
                      <label>出场特效</label>
                      <div className="select-control">
                        <select
                          value={subtitle.outEffect}
                          onChange={(e) => handleUpdate(subtitle.id, { outEffect: e.target.value as OutEffectType })}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {OUT_EFFECTS.map(effect => (
                            <option key={effect.value} value={effect.value}>
                              {effect.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
          {renderDropIndicator(subtitles.length)}
        </div>
      )}
      
      <button
        className="add-btn"
        onClick={handleAdd}
        disabled={subtitles.length >= MAX_SUBTITLES}
        style={subtitles.length >= MAX_SUBTITLES ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
      >
        {subtitles.length >= MAX_SUBTITLES ? `已达到上限 (${MAX_SUBTITLES}条)` : '+ 添加字幕'}
      </button>
    </div>
  );
};
