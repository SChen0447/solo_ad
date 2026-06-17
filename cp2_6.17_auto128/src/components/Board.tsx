import React, { useRef } from 'react';
import { useBoard } from '../hooks/useBoard';
import { useCollection } from '../hooks/useCollection';
import { ExcerptCard } from './ExcerptCard';
import type { ColumnType } from '../types';

export function Board() {
  const {
    activeWorkbench,
    draggedCardId,
    dragOverColumn,
    moveCard,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    findCardColumn,
  } = useBoard();

  const { getExcerptById } = useCollection();
  const dragOverIndexRef = useRef<number>(0);

  if (!activeWorkbench) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: '#9ca3af',
      }}>
        请先创建一个工作台
      </div>
    );
  }

  const handleDragStartCard = (e: React.DragEvent, cardId: string) => {
    handleDragStart(cardId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDragEndCard = () => {
    handleDragEnd();
  };

  const handleDragOverColumn = (e: React.DragEvent, columnId: ColumnType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    handleDragOver(columnId);

    const column = e.currentTarget;
    const cards = column.querySelectorAll('.board-card-item');
    const mouseY = e.clientY;

    let newIndex = cards.length;
    cards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const cardMidY = rect.top + rect.height / 2;
      if (mouseY < cardMidY) {
        newIndex = index;
        return;
      }
    });
    dragOverIndexRef.current = newIndex;
  };

  const handleDropColumn = (e: React.DragEvent, columnId: ColumnType) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    const fromColumn = findCardColumn(cardId);

    if (fromColumn && cardId && fromColumn !== columnId) {
      moveCard(cardId, fromColumn, columnId, dragOverIndexRef.current);
    } else if (fromColumn === columnId) {
      moveCard(cardId, fromColumn, columnId, dragOverIndexRef.current);
    }

    handleDragEnd();
  };

  return (
    <div style={{
      display: 'flex',
      gap: '20px',
      width: '100%',
      overflowX: 'auto',
      paddingBottom: '20px',
    }}>
      {activeWorkbench.columns.map(column => {
        const isHighlighted = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOverColumn(e, column.id)}
            onDrop={(e) => handleDropColumn(e, column.id)}
            style={{
              flex: 1,
              minWidth: '300px',
              backgroundColor: isHighlighted ? '#eff6ff' : '#f5f5f4',
              borderRadius: '12px',
              padding: '16px',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#1e3a5f',
              }}>
                {column.title}
              </span>
              <span style={{
                fontSize: '12px',
                color: '#9ca3af',
                backgroundColor: '#fff',
                padding: '2px 10px',
                borderRadius: '10px',
              }}>
                {column.cardIds.length}
              </span>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flex: 1,
            }}>
              {column.cardIds.map(cardId => {
                const excerpt = getExcerptById(cardId);
                if (!excerpt) return null;

                return (
                  <div
                    key={cardId}
                    className="board-card-item"
                    draggable
                    onDragStart={(e) => handleDragStartCard(e, cardId)}
                    onDragEnd={handleDragEndCard}
                    style={{
                      opacity: draggedCardId === cardId ? 0.5 : 1,
                      cursor: 'grab',
                      transition: 'opacity 0.2s ease, transform 0.2s ease',
                    }}
                  >
                    <ExcerptCard
                      excerpt={excerpt}
                      draggable={true}
                      isDragging={draggedCardId === cardId}
                    />
                  </div>
                );
              })}

              {column.cardIds.length === 0 && (
                <div style={{
                  padding: '30px',
                  textAlign: 'center',
                  color: '#d1d5db',
                  fontSize: '13px',
                  border: '2px dashed #e5e7eb',
                  borderRadius: '8px',
                }}>
                  拖拽卡片到此处
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
