import { useState, useRef } from 'react';
import type { Storyboard } from '../services/api';

interface PanelLeftProps {
  storyboards: Storyboard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export default function PanelLeft({
  storyboards,
  selectedId,
  onSelect,
  onReorder,
}: PanelLeftProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    dragItemRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    const target = e.currentTarget as HTMLElement;
    target.style.transform = 'scale(0.96) rotate(-1deg)';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.transform = '';
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = dragItemRef.current;
    if (fromIndex !== null && fromIndex !== toIndex) {
      onReorder(fromIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  return (
    <section className="panel panel-left">
      <header className="panel-header">
        <h2 className="panel-title">
          <span>📚</span> 分镜列表
        </h2>
        <span className="panel-count" style={{
          fontSize: 12,
          color: '#7A7A7A',
          fontWeight: 600,
        }}>
          {storyboards.length} 页
        </span>
      </header>
      <div className="panel-body">
        {storyboards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <div className="empty-text">
              暂无分镜
              <br />
              请在上方输入故事并点击"生成分镜"
            </div>
          </div>
        ) : (
          storyboards.map((panel, index) => (
            <div
              key={panel.id}
              className={`thumbnail-card ${selectedId === panel.id ? 'selected' : ''} ${
                draggedIndex === index ? 'dragging' : ''
              } ${dragOverIndex === index && draggedIndex !== index ? 'drag-over' : ''}`}
              draggable
              onClick={() => onSelect(panel.id)}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="thumbnail-number">{panel.pageNumber}</div>
              <div className="thumbnail-preview">
                <span className="thumbnail-shot">{panel.shotAngle}</span>
                <div style={{ display: 'flex', gap: 6, fontSize: 22, marginBottom: 4 }}>
                  {panel.characters.slice(0, 3).map((_, ci) => (
                    <span key={ci}>🧑</span>
                  ))}
                </div>
                <div className="thumbnail-scene">
                  {panel.sceneDescription}
                </div>
              </div>
              <div style={{
                marginTop: 8,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
              }}>
                {panel.characters.map((c) => (
                  <span key={c.name} className="thumbnail-char">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
