import React, { useRef, useCallback, useMemo } from 'react';
import { useBoard } from '../hooks/useBoard';
import { useCollection } from '../hooks/useCollection';
import { ExcerptCard } from './ExcerptCard';
import type { ColumnType } from '../types';

export function Board() {
  const {
    activeWorkbench,
    draggedCardId,
    dragOverColumn,
    dragOverIndex,
    justDroppedCardId,
    moveCard,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    findCardColumn,
  } = useBoard();

  const { getExcerptById } = useCollection();

  const handleDragStartCard = useCallback((e: React.DragEvent, cardId: string) => {
    handleDragStart(cardId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
  }, [handleDragStart]);

  const handleDragEndCard = useCallback((_e: React.DragEvent, cardId: string) => {
    handleDragEnd(cardId);
  }, [handleDragEnd]);

  const handleDragOverColumn = useCallback((e: React.DragEvent, columnId: ColumnType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const column = e.currentTarget;
    const cards = column.querySelectorAll<HTMLElement>('.board-card-item');
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

    handleDragOver(columnId, newIndex);
  }, [handleDragOver]);

  const handleDropColumn = useCallback((e: React.DragEvent, columnId: ColumnType) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    const fromColumn = findCardColumn(cardId);

    if (fromColumn && cardId) {
      const targetIndex = dragOverColumn === columnId ? dragOverIndex : 0;
      moveCard(cardId, fromColumn, columnId, targetIndex);
    }

    handleDragEnd(cardId);
  }, [findCardColumn, moveCard, dragOverColumn, dragOverIndex, handleDragEnd]);

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

  const renderCardWithEffects = (cardId: string, index: number, columnId: ColumnType) => {
    const excerpt = getExcerptById(cardId);
    if (!excerpt) return null;

    const isDragging = draggedCardId === cardId;
    const isJustDropped = justDroppedCardId === cardId;
    const showInsertLine = dragOverColumn === columnId && dragOverIndex === index && !isDragging;

    return (
      <React.Fragment key={cardId}>
        {showInsertLine && <InsertIndicator />}
        {isDragging && <CardPlaceholder />}
        <div
          className="board-card-item"
          draggable
          onDragStart={(e) => handleDragStartCard(e, cardId)}
          onDragEnd={(e) => handleDragEndCard(e, cardId)}
          style={{
            display: isDragging ? 'none' : 'block',
            cursor: 'grab',
            transition: 'transform 0.2s ease-out',
            transform: isJustDropped ? 'scale(0.95)' : 'scale(1)',
            animation: isJustDropped ? 'dropBounce 0.2s ease-out' : undefined,
          }}
        >
          <ExcerptCard
            excerpt={excerpt}
            draggable={true}
            isDragging={false}
          />
        </div>
      </React.Fragment>
    );
  };

  return (
    <>
      <style>{`
        @keyframes dropBounce {
          0% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        gap: '20px',
        width: '100%',
        overflowX: 'auto',
        paddingBottom: '20px',
      }}>
        {activeWorkbench.columns.map(column => {
          const isHighlighted = dragOverColumn === column.id;
          const isEmpty = column.cardIds.length === 0;
          const showInsertAtEnd = dragOverColumn === column.id && dragOverIndex >= column.cardIds.length;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOverColumn(e, column.id)}
              onDrop={(e) => handleDropColumn(e, column.id)}
              style={{
                flex: 1,
                minWidth: '320px',
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
                {isEmpty && isHighlighted && showInsertAtEnd && <InsertIndicator />}

                {column.cardIds.map((cardId, index) =>
                  renderCardWithEffects(cardId, index, column.id)
                )}

                {!isEmpty && showInsertAtEnd && <InsertIndicator />}

                {isEmpty && !isHighlighted && (
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
    </>
  );
}

function CardPlaceholder() {
  return (
    <div
      style={{
        width: '320px',
        height: '180px',
        border: '2px dashed #d1d5db',
        borderRadius: '16px',
        boxSizing: 'border-box',
        flexShrink: 0,
        transition: 'all 0.2s ease',
      }}
    />
  );
}

function InsertIndicator() {
  return (
    <div
      style={{
        height: '2px',
        backgroundColor: '#1e3a5f',
        borderRadius: '1px',
        margin: '-5px 0',
        zIndex: 10,
        flexShrink: 0,
      }}
    />
  );
}
