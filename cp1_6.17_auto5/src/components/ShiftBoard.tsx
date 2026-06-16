import React, { useState, useRef, useEffect } from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Person, RosterData, ShiftCell, ShiftType, ContextMenuPosition, SwapState } from '../types';
import { validateAssignment, validateSwap } from '../utils/validator';

interface ShiftBoardProps {
  roster: RosterData;
  people: Person[];
  onRosterChange: (roster: RosterData) => void;
  onShowToast: (message: string, type: 'error' | 'success' | 'info') => void;
  swapState: SwapState;
  setSwapState: (state: SwapState) => void;
  shakeCell: string | null;
  setShakeCell: (cell: string | null) => void;
}

const DAYS_OF_WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const SHIFT_TYPES: { type: ShiftType; label: string; color: string; bgColor: string }[] = [
  { type: 'morning', label: '早班', color: '#38a169', bgColor: 'linear-gradient(135deg, #68d391, #38a169)' },
  { type: 'afternoon', label: '中班', color: '#3182ce', bgColor: 'linear-gradient(135deg, #63b3ed, #3182ce)' },
  { type: 'night', label: '晚班', color: '#805ad5', bgColor: 'linear-gradient(135deg, #b794f4, #805ad5)' },
];

const ShiftBoard: React.FC<ShiftBoardProps> = ({
  roster,
  people,
  onRosterChange,
  onShowToast,
  swapState,
  setSwapState,
  shakeCell,
  setShakeCell,
}) => {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    position: ContextMenuPosition;
    dayIndex: number;
    shiftKey: string;
  } | null>(null);

  const [editingNote, setEditingNote] = useState<{
    dayIndex: number;
    shiftKey: string;
    value: string;
  } | null>(null);

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingNote && noteInputRef.current) {
      noteInputRef.current.focus();
      noteInputRef.current.select();
    }
  }, [editingNote]);

  const getPersonById = (id: string | null): Person | undefined => {
    if (!id) return undefined;
    return people.find(p => p.id === id);
  };

  const handleContextMenu = (e: React.MouseEvent, dayIndex: number, shiftKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (swapState.active) {
      setSwapState({ active: false, sourceDay: null, sourceShift: null });
      return;
    }

    setContextMenu({
      visible: true,
      position: { x: e.clientX, y: e.clientY },
      dayIndex,
      shiftKey,
    });
  };

  const handleCellClick = (dayIndex: number, shiftKey: string) => {
    if (swapState.active && swapState.sourceDay !== null && swapState.sourceShift !== null) {
      if (swapState.sourceDay === dayIndex && swapState.sourceShift === shiftKey) {
        setSwapState({ active: false, sourceDay: null, sourceShift: null });
        return;
      }

      const result = validateSwap(
        swapState.sourceDay,
        swapState.sourceShift,
        dayIndex,
        shiftKey,
        roster,
        people
      );

      if (result.valid) {
        const newRoster = JSON.parse(JSON.stringify(roster));
        const temp = newRoster[swapState.sourceDay][swapState.sourceShift];
        newRoster[swapState.sourceDay][swapState.sourceShift] = newRoster[dayIndex][shiftKey];
        newRoster[dayIndex][shiftKey] = temp;

        onRosterChange(newRoster);
        onShowToast('调换成功', 'success');
      } else {
        onShowToast(result.message, 'error');
        triggerShake(`${dayIndex}-${shiftKey}`);
      }

      setSwapState({ active: false, sourceDay: null, sourceShift: null });
      setContextMenu(null);
    }
  };

  const triggerShake = (cellKey: string) => {
    setShakeCell(cellKey);
    setTimeout(() => setShakeCell(null), 500);
  };

  const handleSwap = () => {
    if (!contextMenu) return;
    setSwapState({
      active: true,
      sourceDay: contextMenu.dayIndex,
      sourceShift: contextMenu.shiftKey,
    });
    setContextMenu(null);
    onShowToast('请点击要调换的目标格子', 'info');
  };

  const handleClear = () => {
    if (!contextMenu) return;
    const { dayIndex, shiftKey } = contextMenu;

    const newRoster = JSON.parse(JSON.stringify(roster));
    if (newRoster[dayIndex] && newRoster[dayIndex][shiftKey]) {
      newRoster[dayIndex][shiftKey] = {
        ...newRoster[dayIndex][shiftKey],
        personId: null,
        note: '',
      };
    }

    onRosterChange(newRoster);
    setContextMenu(null);
    onShowToast('已清空该班次', 'success');
  };

  const handleNote = () => {
    if (!contextMenu) return;
    const { dayIndex, shiftKey } = contextMenu;
    const cell = roster[dayIndex]?.[shiftKey];

    setEditingNote({
      dayIndex,
      shiftKey,
      value: cell?.note || '',
    });
    setContextMenu(null);
  };

  const handleNoteSubmit = () => {
    if (!editingNote) return;

    const newRoster = JSON.parse(JSON.stringify(roster));
    if (newRoster[editingNote.dayIndex] && newRoster[editingNote.dayIndex][editingNote.shiftKey]) {
      newRoster[editingNote.dayIndex][editingNote.shiftKey].note = editingNote.value;
    }

    onRosterChange(newRoster);
    setEditingNote(null);
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNoteSubmit();
    } else if (e.key === 'Escape') {
      setEditingNote(null);
    }
  };

  const handleDrop = (dayIndex: number, shiftKey: string, personId: string, isFromPool: boolean) => {
    const shiftType = shiftKey.split('-')[0] as ShiftType;

    if (isFromPool) {
      const result = validateAssignment(personId, dayIndex, shiftType, roster, people);

      if (!result.valid) {
        onShowToast(result.message, 'error');
        triggerShake(`${dayIndex}-${shiftKey}`);
        return false;
      }

      const newRoster = JSON.parse(JSON.stringify(roster));
      if (newRoster[dayIndex] && newRoster[dayIndex][shiftKey]) {
        newRoster[dayIndex][shiftKey].personId = personId;
      }

      onRosterChange(newRoster);
      return true;
    }

    return false;
  };

  const renderShiftCard = (cell: ShiftCell, dayIndex: number, shiftKey: string) => {
    const person = getPersonById(cell.personId);
    const shiftInfo = SHIFT_TYPES.find(s => s.type === cell.shiftType);
    const cellKey = `${dayIndex}-${shiftKey}`;
    const isShaking = shakeCell === cellKey;
    const isSwapSource = swapState.active && swapState.sourceDay === dayIndex && swapState.sourceShift === shiftKey;
    const isEditing = editingNote?.dayIndex === dayIndex && editingNote?.shiftKey === shiftKey;

    return (
      <div
        style={{
          ...styles.shiftCard,
          background: shiftInfo?.bgColor || '#e2e8f0',
          border: isSwapSource ? '2px solid #f6e05e' : 'none',
          transform: isSwapSource ? 'scale(1.02)' : 'scale(1)',
        }}
        className={isShaking ? 'shake-animation' : ''}
      >
        {person ? (
          <>
            <div style={styles.shiftPersonName}>{person.name}</div>
            <div style={styles.shiftTypeLabel}>{shiftInfo?.label}</div>
            {cell.note && !isEditing && (
              <div style={styles.noteText}>{cell.note}</div>
            )}
            {isEditing && (
              <input
                ref={noteInputRef}
                type="text"
                value={editingNote.value}
                onChange={(e) => setEditingNote({ ...editingNote, value: e.target.value })}
                onBlur={handleNoteSubmit}
                onKeyDown={handleNoteKeyDown}
                style={styles.noteInput}
                placeholder="输入备注..."
              />
            )}
          </>
        ) : (
          <div style={styles.emptySlot}>
            <span style={styles.emptyText}>空位</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>本周排班表</h2>
        <div style={styles.legend}>
          {SHIFT_TYPES.map(shift => (
            <div key={shift.type} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: shift.bgColor }} />
              <span style={styles.legendText}>{shift.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.boardContainer}>
        <div style={styles.board}>
          <div style={styles.headerRow}>
            <div style={styles.cornerCell} />
            {DAYS_OF_WEEK.map((day, index) => (
              <div key={index} style={styles.dayHeader}>
                {day}
              </div>
            ))}
          </div>

          {SHIFT_TYPES.map(shift => (
            <div key={shift.type} style={styles.shiftRow}>
              <div style={styles.shiftLabelCell}>
                <div style={{ ...styles.shiftLabelDot, background: shift.bgColor }} />
                <span style={styles.shiftLabelText}>{shift.label}</span>
              </div>

              {DAYS_OF_WEEK.map((_, dayIndex) => {
                const shiftKey = `${shift.type}-${dayIndex}`;
                const cell = roster[dayIndex]?.[shiftKey] || {
                  personId: null,
                  shiftType: shift.type,
                };

                return (
                  <Droppable key={shiftKey} droppableId={`slot-${dayIndex}-${shift.type}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          ...styles.cell,
                          background: snapshot.isDraggingOver ? 'rgba(66, 153, 225, 0.1)' : '#ffffff',
                          borderColor: snapshot.isDraggingOver ? '#4299e1' : '#e2e8f0',
                        }}
                        onContextMenu={(e) => handleContextMenu(e, dayIndex, shiftKey)}
                        onClick={() => handleCellClick(dayIndex, shiftKey)}
                      >
                        {cell.personId ? (
                          <Draggable
                            draggableId={`assigned-${dayIndex}-${shift.type}`}
                            index={0}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  opacity: snapshot.isDragging ? 0.8 : 1,
                                }}
                              >
                                {renderShiftCard(cell, dayIndex, shiftKey)}
                              </div>
                            )}
                          </Draggable>
                        ) : (
                          renderShiftCard(cell, dayIndex, shiftKey)
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {contextMenu?.visible && (
        <div
          ref={contextMenuRef}
          style={{
            ...styles.contextMenu,
            left: contextMenu.position.x,
            top: contextMenu.position.y,
          }}
          className="fade-in"
        >
          <div style={styles.contextMenuItem} onClick={handleSwap}>
            <span style={styles.contextMenuIcon}>🔄</span>
            调换
          </div>
          <div style={styles.contextMenuItem} onClick={handleClear}>
            <span style={styles.contextMenuIcon}>🗑️</span>
            清空
          </div>
          <div style={styles.contextMenuItem} onClick={handleNote}>
            <span style={styles.contextMenuIcon}>📝</span>
            备注
          </div>
        </div>
      )}

      {swapState.active && (
        <div style={styles.swapHint} className="fade-in">
          点击目标格子完成调换，或按 ESC 取消
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    flex: 1,
    background: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    padding: '24px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1a365d',
    margin: 0,
  },
  legend: {
    display: 'flex',
    gap: '16px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
  },
  legendText: {
    fontSize: '13px',
    color: '#4a5568',
  },
  boardContainer: {
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  board: {
    display: 'flex',
    flexDirection: 'column' as const,
    minWidth: '700px',
  },
  headerRow: {
    display: 'flex',
    borderBottom: '2px solid #e2e8f0',
  },
  cornerCell: {
    width: '100px',
    flexShrink: 0,
  },
  dayHeader: {
    flex: 1,
    minWidth: '90px',
    padding: '12px',
    textAlign: 'center' as const,
    fontWeight: 600,
    color: '#2d3748',
    fontSize: '14px',
  },
  shiftRow: {
    display: 'flex',
    borderBottom: '1px solid #edf2f7',
    minHeight: '90px',
  },
  shiftLabelCell: {
    width: '100px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    borderRight: '1px solid #edf2f7',
  },
  shiftLabelDot: {
    width: '10px',
    height: '10px',
    borderRadius: '3px',
  },
  shiftLabelText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#4a5568',
  },
  cell: {
    flex: 1,
    minWidth: '90px',
    padding: '8px',
    borderRight: '1px solid #edf2f7',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'stretch',
  },
  shiftCard: {
    flex: 1,
    borderRadius: '8px',
    padding: '8px 10px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s ease',
    cursor: 'grab',
    minHeight: '50px',
  },
  shiftPersonName: {
    fontSize: '13px',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  shiftTypeLabel: {
    fontSize: '11px',
    opacity: 0.9,
  },
  noteText: {
    fontSize: '10px',
    opacity: 0.85,
    marginTop: '4px',
    fontStyle: 'italic' as const,
  },
  noteInput: {
    fontSize: '10px',
    padding: '2px 4px',
    borderRadius: '3px',
    border: 'none',
    outline: 'none',
    background: 'rgba(255, 255, 255, 0.9)',
    color: '#2d3748',
    marginTop: '4px',
    width: '100%',
  },
  emptySlot: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #cbd5e0',
    borderRadius: '8px',
    background: '#f7fafc',
  },
  emptyText: {
    fontSize: '12px',
    color: '#a0aec0',
  },
  contextMenu: {
    position: 'fixed' as const,
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
    padding: '6px',
    zIndex: 1000,
    minWidth: '120px',
  },
  contextMenuItem: {
    padding: '10px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#2d3748',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'background 0.15s ease',
  },
  contextMenuIcon: {
    fontSize: '14px',
  },
  swapHint: {
    position: 'fixed' as const,
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#4299e1',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    boxShadow: '0 4px 15px rgba(66, 153, 225, 0.4)',
    zIndex: 100,
  },
};

export default ShiftBoard;
