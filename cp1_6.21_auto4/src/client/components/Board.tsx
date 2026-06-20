import React, { useState, useRef } from 'react';
import { CardData, Participant, COLUMNS, ColumnId } from '../types';
import { Card } from './Card';

interface BoardProps {
  cards: CardData[];
  participants: Participant[];
  clientId: string;
  onAddCard: (columnId: string, title: string) => void;
  onMoveCard: (cardId: string, toColumnId: string, toIndex: number) => void;
  onEditCard: (cardId: string, updates: Partial<CardData>) => void;
  onDeleteCard: (cardId: string) => void;
  onLockCard: (cardId: string) => void;
  onUnlockCard: (cardId: string) => void;
}

export const Board: React.FC<BoardProps> = ({
  cards,
  participants,
  clientId,
  onAddCard,
  onMoveCard,
  onEditCard,
  onDeleteCard,
  onLockCard,
  onUnlockCard
}) => {
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number>(-1);
  const [addingColumn, setAddingColumn] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const getCardsByColumn = (columnId: string): CardData[] => {
    return cards
      .filter(card => card.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  };

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggingCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDragEnd = () => {
    setDraggingCardId(null);
    setDragOverColumn(null);
    setDragOverIndex(-1);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
    setDragOverIndex(index);
  };

  const handleDragOverColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    const columnCards = getCardsByColumn(columnId);
    setDragOverColumn(columnId);
    setDragOverIndex(columnCards.length);
  };

  const handleDrop = (e: React.DragEvent, columnId: string, index: number) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      onMoveCard(cardId, columnId, index);
    }
    handleDragEnd();
  };

  const handleAddClick = (columnId: string) => {
    setAddingColumn(columnId);
    setNewCardTitle('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleAddSubmit = (columnId: string) => {
    if (newCardTitle.trim()) {
      onAddCard(columnId, newCardTitle.trim());
      setNewCardTitle('');
      setAddingColumn(null);
    }
  };

  const handleAddCancel = () => {
    setAddingColumn(null);
    setNewCardTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, columnId: string) => {
    if (e.key === 'Enter') {
      handleAddSubmit(columnId);
    } else if (e.key === 'Escape') {
      handleAddCancel();
    }
  };

  return (
    <div className="kanban-board">
      {COLUMNS.map(column => {
        const columnCards = getCardsByColumn(column.id);
        const isDragOver = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            className={`kanban-column ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOverColumn(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id, columnCards.length)}
          >
            <div className="column-header">
              <h3>{column.title}</h3>
              <span className="column-count">{columnCards.length}</span>
              <button
                className="add-card-btn"
                onClick={() => handleAddClick(column.id)}
                title="添加卡片"
              >
                +
              </button>
            </div>

            <div className="column-cards">
              {columnCards.map((card, index) => (
                <React.Fragment key={card.id}>
                  {isDragOver && dragOverIndex === index && draggingCardId !== card.id && (
                    <div className="drop-placeholder" />
                  )}
                  <div
                    onDragOver={(e) => handleDragOver(e, column.id, index)}
                    onDrop={(e) => handleDrop(e, column.id, index)}
                  >
                    <Card
                      card={card}
                      participants={participants}
                      clientId={clientId}
                      isDragging={draggingCardId === card.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onEdit={onEditCard}
                      onDelete={onDeleteCard}
                      onLock={onLockCard}
                      onUnlock={onUnlockCard}
                    />
                  </div>
                </React.Fragment>
              ))}
              {isDragOver && dragOverIndex >= columnCards.length && (
                <div className="drop-placeholder" />
              )}

              {addingColumn === column.id && (
                <div className="add-card-form">
                  <input
                    ref={inputRef}
                    type="text"
                    className="add-card-input"
                    placeholder="输入卡片标题..."
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, column.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="add-card-actions">
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => handleAddSubmit(column.id)}
                    >
                      添加
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={handleAddCancel}
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
