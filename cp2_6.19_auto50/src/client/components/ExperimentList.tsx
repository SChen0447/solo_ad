import React, { useState, useRef } from 'react';
import type { Experiment } from '../../types';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
}

function ProgressRing({ progress, size = 44, strokeWidth = 4 }: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedProgress / 100) * circumference;

  React.useEffect(() => {
    const rAF = requestAnimationFrame(() => {
      setTimeout(() => setAnimatedProgress(progress), 50);
    });
    return () => cancelAnimationFrame(rAF);
  }, [progress]);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#3D3572"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#FFB300"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#E0E0E0"
        fontSize="11"
        fontWeight="600"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontFamily: "'JetBrains Mono', monospace" }}
      >
        {animatedProgress}%
      </text>
    </svg>
  );
}

interface ExperimentListProps {
  experiments: Experiment[];
  selectedId: string | null;
  highlightedId: string | null;
  getProgress: (id: string) => number;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
}

export default function ExperimentList({
  experiments,
  selectedId,
  highlightedId,
  getProgress,
  onSelect,
  onDelete,
  onReorder
}: ExperimentListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    const newExperiments = [...experiments];
    const [draggedItem] = newExperiments.splice(draggedIndex, 1);
    newExperiments.splice(index, 0, draggedItem);
    onReorder(newExperiments.map(exp => exp.id));
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div ref={listRef} style={{ flex: '1', overflowY: 'auto', padding: '8px' }}>
      {experiments.length === 0 ? (
        <div style={{
          padding: '32px 16px',
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '13px'
        }}>
          暂无实验项目，点击上方"新建"按钮创建
        </div>
      ) : (
        experiments.map((exp, index) => (
          <div
            key={exp.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(exp.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 12px',
              marginBottom: '8px',
              borderRadius: '8px',
              cursor: 'pointer',
              position: 'relative',
              background: highlightedId === exp.id ? 'rgba(255, 179, 0, 0.3)' : 'transparent',
              borderLeft: selectedId === exp.id ? '3px solid var(--color-secondary)' : '3px solid transparent',
              boxShadow: selectedId === exp.id ? '0 0 15px rgba(255, 179, 0, 0.3)' : 'none',
              transition: 'background-color 0.15s, box-shadow 0.15s, transform 0.2s',
              transform: draggedIndex === index ? 'scale(0.98); opacity: 0.5;' : dragOverIndex === index ? 'translateY(4px)' : 'none',
              animation: highlightedId === exp.id ? 'highlightFlash 1s ease-in-out' : undefined
            }}
            onMouseEnter={(e) => {
              if (draggedIndex === null) {
                e.currentTarget.style.background = 'rgba(255, 179, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = highlightedId === exp.id ? 'rgba(255, 179, 0, 0.3)' : 'transparent';
            }}
          >
            <ProgressRing progress={getProgress(exp.id)} />
            <div style={{ flex: '1', minWidth: 0 }}>
              <div style={{
                fontWeight: '600',
                fontSize: '13px',
                color: 'var(--color-text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {exp.name}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                marginTop: '2px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <span>{exp.date}</span>
                <span>·</span>
                <span>{exp.leader}</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(exp.id);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: '4px',
                opacity: 0,
                background: 'rgba(229, 57, 53, 0.1)',
                color: 'var(--color-danger)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.background = 'var(--color-danger)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0';
                e.currentTarget.style.background = 'rgba(229, 57, 53, 0.1)';
                e.currentTarget.style.color = 'var(--color-danger)';
              }}
            >
              删除
            </button>
          </div>
        ))
      )}
    </div>
  );
}
