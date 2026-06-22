import React, { useState, useCallback } from 'react';
import { Subtitle, IN_EFFECTS, OUT_EFFECTS, InEffectType, OutEffectType } from '../types';
import { eventBus } from '../utils/eventBus';

interface SubtitleEditorProps {
  subtitles: Subtitle[];
  onSubtitlesChange: (subtitles: Subtitle[]) => void;
  selectedSubtitleId: string | null;
  onSelectSubtitle: (id: string | null) => void;
}

export const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  subtitles,
  onSubtitlesChange,
  selectedSubtitleId,
  onSelectSubtitle,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const generateId = () => `subtitle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const handleAdd = useCallback(() => {
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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === toIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...subtitles];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(toIndex, 0, removed);
    
    onSubtitlesChange(updated);
    eventBus.emit('subtitle:reorder', { fromIndex: draggedIndex, toIndex });
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="section">
      <h2 className="section-title">
        <span>📝</span>
        字幕列表
      </h2>
      
      {subtitles.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <p>暂无字幕，点击下方按钮添加</p>
        </div>
      ) : (
        <div className="subtitle-list">
          {subtitles.map((subtitle, index) => (
            <div
              key={subtitle.id}
              className={`subtitle-card ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelectSubtitle(subtitle.id)}
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
                  <div className="input-group">
                    <label>出现时间 (秒)</label>
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
          ))}
        </div>
      )}
      
      <button className="add-btn" onClick={handleAdd}>
        + 添加字幕
      </button>
    </div>
  );
};
