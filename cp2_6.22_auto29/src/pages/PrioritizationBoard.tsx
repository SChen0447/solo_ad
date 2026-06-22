import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getRankedIdeas, updatePriority } from '../api/ideas';
import type { Idea } from '../api/ideas';
import { useAppContext } from '../App';

const COLUMNS: { key: 'high' | 'medium' | 'low'; label: string; bg: string; color: string }[] = [
  { key: 'high', label: '🔥 高优先级', bg: '#FEF2F2', color: '#EF4444' },
  { key: 'medium', label: '⚡ 中优先级', bg: '#FFFBEB', color: '#F59E0B' },
  { key: 'low', label: '💡 低优先级', bg: '#ECFDF5', color: '#10B981' },
];

export default function PrioritizationBoard() {
  const { showToast } = useAppContext();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIdea, setDraggedIdea] = useState<Idea | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState<'high' | 'medium' | 'low' | null>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const fetchIdeas = useCallback(async () => {
    try {
      const data = await getRankedIdeas();
      setIdeas(data);
    } catch {
      showToast('加载排序数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  const getIdeasByPriority = (priority: 'high' | 'medium' | 'low') =>
    ideas.filter((i) => i.priority === priority).sort((a, b) => b.voteCount - a.voteCount);

  const handleDragStart = (e: React.DragEvent, idea: Idea) => {
    setDraggedIdea(idea);
    setIsDragging(true);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDragPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idea.id);
    if ((e.target as HTMLElement).style) {
      (e.target as HTMLElement).style.opacity = '0.5';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX === 0 && e.clientY === 0) return;
    setDragPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    setDraggedIdea(null);
    setDropTarget(null);
    if ((e.target as HTMLElement).style) {
      (e.target as HTMLElement).style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, priority: 'high' | 'medium' | 'low') => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(priority);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPriority: 'high' | 'medium' | 'low') => {
    e.preventDefault();
    setDropTarget(null);
    if (!draggedIdea) {
      setIsDragging(false);
      setDraggedIdea(null);
      return;
    }
    if (draggedIdea.priority === targetPriority) {
      setIsDragging(false);
      setDraggedIdea(null);
      return;
    }
    try {
      const updatedIdea = await updatePriority(draggedIdea.id, targetPriority);
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === draggedIdea.id ? updatedIdea : idea))
      );
      showToast(`已移至${targetPriority === 'high' ? '高' : targetPriority === 'medium' ? '中' : '低'}优先级`, 'success');
    } catch {
      showToast('更新优先级失败', 'error');
    } finally {
      setIsDragging(false);
      setDraggedIdea(null);
    }
  };

  return (
    <div style={{ padding: '32px 24px', maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1F2937', marginBottom: 24 }}>
        📊 优先级排序看板
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: 48 }}>加载中...</div>
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {COLUMNS.map((col) => {
            const colIdeas = getIdeasByPriority(col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.key)}
                style={{
                  flex: 1,
                  minHeight: 400,
                  borderRadius: 16,
                  background: col.bg,
                  padding: 20,
                  border: dropTarget === col.key ? `3px dashed ${col.color}` : '3px solid transparent',
                  transition: 'border 0.2s ease',
                }}
              >
                <div style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: col.color,
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: `2px solid ${col.color}33`,
                }}>
                  {col.label} ({colIdeas.length})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {colIdeas.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: '#9CA3AF',
                      fontSize: 13,
                      padding: 24,
                      border: '2px dashed #D1D5DB',
                      borderRadius: 12,
                    }}>
                      拖拽创意到此处
                    </div>
                  )}
                  {colIdeas.map((idea, i) => (
                    <div
                      key={idea.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idea)}
                      onDrag={handleDrag}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: 16,
                        padding: 16,
                        border: '2px solid #E5E7EB',
                        boxShadow: '0px 2px 8px rgba(0,0,0,0.06)',
                        cursor: 'grab',
                        transition: 'box-shadow 0.25s ease, transform 0.2s',
                        animation: `slideIn 0.3s ease ${i * 80}ms both`,
                        userSelect: 'none',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0px 4px 16px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.boxShadow = '0px 2px 8px rgba(0,0,0,0.06)';
                      }}
                    >
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', marginBottom: 6 }}>
                        {idea.title}
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: '#6B7280',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        marginBottom: 8,
                      }}>
                        {idea.description}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{idea.author}</span>
                        <span style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: col.color,
                        }}>
                          {idea.voteCount} 票
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
