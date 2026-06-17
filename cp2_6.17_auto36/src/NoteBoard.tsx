import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { Note, Group, Poll, NoteColor } from './types';

interface NoteBoardProps {
  notes: Note[];
  groups: Group[];
  polls: Poll[];
  votedPollIds: string[];
  getNotesByGroup: (groupId: string | null) => Note[];
  onCreateNote: (x: number, y: number, color?: NoteColor, content?: string, groupId?: string | null) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  onDeleteNote: (id: string) => void;
  onVote: (pollId: string, optionId: string) => void;
  onShowResults: (pollId: string) => void;
  onResetPoll: (pollId: string) => void;
  onCreatePoll: (question: string, options: string[]) => void;
}

const GRID_SIZE = 50;
const NOTE_WIDTH = 180;
const NOTE_EST_HEIGHT = 80;
const GROUP_HEADER_HEIGHT = 40;
const PROXIMITY_THRESHOLD = 30;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function rectEdgeDistance(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): number {
  const dx = Math.max(0, Math.max(ax - (bx + bw), bx - (ax + aw)));
  const dy = Math.max(0, Math.max(ay - (by + bh), by - (ay + ah)));
  return Math.sqrt(dx * dx + dy * dy);
}

function NoteBoard({
  notes,
  groups,
  polls,
  votedPollIds,
  getNotesByGroup,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  onVote,
  onShowResults,
  onResetPoll,
  onCreatePoll,
}: NoteBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const svgRef = useRef<SVGSVGElement | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragPosRef = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);
  const dragOverGroupRef = useRef<string | null>(null);

  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingNote, setDeletingNote] = useState<string | null>(null);
  const [snappingNote, setSnappingNote] = useState<string | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const calculateGroupHeight = useCallback(
    (groupId: string) => {
      const groupNotes = getNotesByGroup(groupId);
      if (groupNotes.length === 0) {
        return 120;
      }
      const columns = 2;
      const rows = Math.ceil(groupNotes.length / columns);
      return GROUP_HEADER_HEIGHT + rows * 140 + 30;
    },
    [getNotesByGroup]
  );

  const updateDragPosition = useCallback(() => {
    if (!draggingNote) return;

    const noteEl = noteRefs.current.get(draggingNote);
    if (noteEl) {
      noteEl.style.left = `${dragPosRef.current.x}px`;
      noteEl.style.top = `${dragPosRef.current.y}px`;
    }

    const curX = dragPosRef.current.x;
    const curY = dragPosRef.current.y;

    let overGroupId: string | null = null;
    for (const group of groupsRef.current) {
      const groupEl = groupRefs.current.get(group.id);
      const groupHeight = groupEl ? groupEl.offsetHeight : 120;
      if (
        curX >= group.x &&
        curX <= group.x + group.width &&
        curY >= group.y &&
        curY <= group.y + groupHeight
      ) {
        overGroupId = group.id;
        break;
      }
    }

    if (overGroupId !== dragOverGroupRef.current) {
      if (dragOverGroupRef.current) {
        const prevEl = groupRefs.current.get(dragOverGroupRef.current);
        if (prevEl) {
          prevEl.classList.remove('drag-hover');
        }
      }
      if (overGroupId) {
        const newEl = groupRefs.current.get(overGroupId);
        if (newEl) {
          newEl.classList.remove('drag-hover');
          void newEl.offsetWidth;
          newEl.classList.add('drag-hover');
        }
      }
      dragOverGroupRef.current = overGroupId;
    }

    if (svgRef.current) {
      const lines: string[] = [];
      const dragCx = curX + NOTE_WIDTH / 2;
      const dragCy = curY + NOTE_EST_HEIGHT / 2;

      for (const otherNote of notesRef.current) {
        if (otherNote.id === draggingNote) continue;
        const dist = rectEdgeDistance(
          curX, curY, NOTE_WIDTH, NOTE_EST_HEIGHT,
          otherNote.x, otherNote.y, NOTE_WIDTH, NOTE_EST_HEIGHT
        );
        if (dist < PROXIMITY_THRESHOLD) {
          const otherCx = otherNote.x + NOTE_WIDTH / 2;
          const otherCy = otherNote.y + NOTE_EST_HEIGHT / 2;
          lines.push(
            `<line x1="${dragCx}" y1="${dragCy}" x2="${otherCx}" y2="${otherCy}" stroke="rgba(74, 144, 217, 0.5)" stroke-width="2" stroke-dasharray="6,4"/>`
          );
        }
      }
      svgRef.current.innerHTML = lines.join('');
    }

    rafIdRef.current = requestAnimationFrame(updateDragPosition);
  }, [draggingNote]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      if (editingNote) return;
      if (deletingNote === noteId) return;
      e.preventDefault();
      e.stopPropagation();

      const note = notes.find((n) => n.id === noteId);
      if (!note) return;

      const boardRect = boardRef.current?.getBoundingClientRect();
      if (!boardRect) return;

      const noteEl = noteRefs.current.get(noteId);
      if (noteEl) {
        noteEl.classList.add('dragging');
        noteEl.classList.remove('snapping');
      }

      dragOffsetRef.current = {
        x: e.clientX - boardRect.left - note.x,
        y: e.clientY - boardRect.top - note.y,
      };
      dragPosRef.current = { x: note.x, y: note.y };

      setDraggingNote(noteId);
      setSnappingNote(null);
    },
    [notes, editingNote, deletingNote]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingNote || !boardRef.current) return;

      const boardRect = boardRef.current.getBoundingClientRect();
      const newX = e.clientX - boardRect.left - dragOffsetRef.current.x;
      const newY = e.clientY - boardRect.top - dragOffsetRef.current.y;

      dragPosRef.current = { x: newX, y: newY };
    },
    [draggingNote]
  );

  const cleanupDragVisuals = useCallback(() => {
    if (dragOverGroupRef.current) {
      const el = groupRefs.current.get(dragOverGroupRef.current);
      if (el) {
        el.classList.remove('drag-hover');
      }
      dragOverGroupRef.current = null;
    }
    if (svgRef.current) {
      svgRef.current.innerHTML = '';
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!draggingNote) return;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    cleanupDragVisuals();

    const note = notes.find((n) => n.id === draggingNote);
    if (!note) {
      setDraggingNote(null);
      return;
    }

    const currentX = dragPosRef.current.x;
    const currentY = dragPosRef.current.y;

    let targetGroupId: string | null = null;
    let targetX: number;
    let targetY: number;

    for (const group of groups) {
      const groupHeight = calculateGroupHeight(group.id);
      if (
        currentX >= group.x &&
        currentX <= group.x + group.width &&
        currentY >= group.y &&
        currentY <= group.y + groupHeight
      ) {
        targetGroupId = group.id;
        break;
      }
    }

    if (targetGroupId) {
      const groupNotes = getNotesByGroup(targetGroupId).filter((n) => n.id !== draggingNote);
      const group = groups.find((g) => g.id === targetGroupId);
      if (group) {
        const index = groupNotes.length;
        const columns = 2;
        const col = index % columns;
        const row = Math.floor(index / columns);
        targetX = group.x + 20 + col * (NOTE_WIDTH + 15);
        targetY = group.y + GROUP_HEADER_HEIGHT + 15 + row * 140;
      } else {
        targetX = snapToGrid(currentX);
        targetY = snapToGrid(currentY);
      }
    } else {
      targetX = snapToGrid(currentX);
      targetY = snapToGrid(currentY);
    }

    const noteEl = noteRefs.current.get(draggingNote);
    if (noteEl) {
      noteEl.classList.remove('dragging');
      noteEl.classList.add('snapping');
      noteEl.style.left = `${targetX}px`;
      noteEl.style.top = `${targetY}px`;
    }

    setSnappingNote(draggingNote);

    setTimeout(() => {
      onUpdateNote(draggingNote, {
        x: targetX,
        y: targetY,
        groupId: targetGroupId,
      });
      setSnappingNote(null);
      const el = noteRefs.current.get(draggingNote);
      if (el) {
        el.classList.remove('snapping');
      }
    }, 200);

    setDraggingNote(null);
  }, [draggingNote, notes, groups, calculateGroupHeight, getNotesByGroup, onUpdateNote, cleanupDragVisuals]);

  useEffect(() => {
    if (draggingNote) {
      rafIdRef.current = requestAnimationFrame(updateDragPosition);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNote, updateDragPosition, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = useCallback(
    (note: Note) => {
      setEditingNote(note.id);
      setEditContent(note.content);
    },
    []
  );

  const handleEditBlur = useCallback(
    (noteId: string) => {
      onUpdateNote(noteId, { content: editContent });
      setEditingNote(null);
    },
    [editContent, onUpdateNote]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      e.stopPropagation();
      e.preventDefault();

      const noteEl = noteRefs.current.get(noteId);
      if (noteEl) {
        noteEl.classList.add('deleting');
      }
      setDeletingNote(noteId);

      setTimeout(() => {
        onDeleteNote(noteId);
        setDeletingNote(null);
        noteRefs.current.delete(noteId);
      }, 300);
    },
    [onDeleteNote]
  );

  const handleBoardDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (editingNote) return;
      if ((e.target as HTMLElement).closest('.note-item')) return;

      const boardRect = boardRef.current?.getBoundingClientRect();
      if (!boardRect) return;

      const x = e.clientX - boardRect.left - NOTE_WIDTH / 2;
      const y = e.clientY - boardRect.top - 50;

      const snappedX = snapToGrid(x);
      const snappedY = snapToGrid(y);

      let targetGroupId: string | null = null;
      for (const group of groups) {
        const groupHeight = calculateGroupHeight(group.id);
        if (
          snappedX >= group.x &&
          snappedX <= group.x + group.width &&
          snappedY >= group.y &&
          snappedY <= group.y + groupHeight
        ) {
          targetGroupId = group.id;
          break;
        }
      }

      onCreateNote(snappedX, snappedY, '#4A90D9', '', targetGroupId);
    },
    [editingNote, groups, calculateGroupHeight, onCreateNote]
  );

  const handleCreatePoll = () => {
    const trimmedQuestion = pollQuestion.trim();
    const trimmedOptions = pollOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (trimmedQuestion && trimmedOptions.length >= 2 && trimmedOptions.length <= 4) {
      onCreatePoll(trimmedQuestion, trimmedOptions);
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPollCreator(false);
    }
  };

  const addOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removeOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const maxVotes = useMemo(() => {
    return polls.reduce((max, poll) => {
      const pollMax = Math.max(...poll.options.map((o) => o.votes), 1);
      return Math.max(max, pollMax);
    }, 1);
  }, [polls]);

  const getWinningOption = (poll: Poll) => {
    if (poll.options.length === 0) return null;
    return poll.options.reduce((max, opt) => (opt.votes > max.votes ? opt : max), poll.options[0]);
  };

  const setNoteRef = useCallback((noteId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      noteRefs.current.set(noteId, el);
    } else {
      noteRefs.current.delete(noteId);
    }
  }, []);

  const setGroupRef = useCallback((groupId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      groupRefs.current.set(groupId, el);
    } else {
      groupRefs.current.delete(groupId);
    }
  }, []);

  const renderNote = (note: Note) => {
    const isEditing = editingNote === note.id;
    const isDeleting = deletingNote === note.id;
    const isDragging = draggingNote === note.id;
    const isSnapping = snappingNote === note.id;

    const noteClasses = ['note-item'];
    if (isDragging) noteClasses.push('dragging');
    if (isSnapping) noteClasses.push('snapping');
    if (isDeleting) noteClasses.push('deleting');

    return (
      <div
        key={note.id}
        ref={setNoteRef(note.id)}
        className={noteClasses.join(' ')}
        style={{
          left: note.x,
          top: note.y,
          width: NOTE_WIDTH,
          backgroundColor: note.color,
          borderRadius: '12px',
          padding: '12px',
          paddingRight: '32px',
          boxShadow: isDragging
            ? '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.15)'
            : '0 4px 12px rgba(0, 0, 0, 0.2)',
          cursor: isEditing ? 'text' : 'grab',
          zIndex: isDragging ? 1000 : isSnapping ? 500 : 1,
          minHeight: '80px',
          userSelect: 'none',
        }}
        onMouseDown={(e) => handleMouseDown(e, note.id)}
        onDoubleClick={() => handleDoubleClick(note)}
      >
        <button
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#E53935',
            border: 'none',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.8,
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            lineHeight: 1,
          }}
          onClick={(e) => handleDeleteClick(e, note.id)}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.opacity = '1';
            (e.target as HTMLButtonElement).style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.opacity = '0.8';
            (e.target as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          ×
        </button>

        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={() => handleEditBlur(note.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEditBlur(note.id);
              }
              if (e.key === 'Escape') {
                setEditingNote(null);
              }
            }}
            autoFocus
            style={{
              width: '100%',
              minHeight: '60px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              lineHeight: '1.4',
              padding: '8px',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        ) : (
          <div
            style={{
              color: '#fff',
              fontSize: '14px',
              lineHeight: '1.4',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {note.content || <span style={{ opacity: 0.6 }}>双击编辑...</span>}
          </div>
        )}
      </div>
    );
  };

  const renderGroups = () => {
    return groups.map((group) => {
      const groupHeight = calculateGroupHeight(group.id);

      return (
        <div
          key={group.id}
          ref={setGroupRef(group.id)}
          className="group-area"
          style={{
            position: 'absolute',
            left: group.x,
            top: group.y,
            width: group.width,
            height: groupHeight,
            backgroundColor: `${group.color}15`,
            borderRadius: '12px',
            border: `2px solid ${group.color}`,
            padding: '10px',
            overflow: 'visible',
            ['--group-color' as any]: group.color,
          }}
        >
          <div
            style={{
              height: GROUP_HEADER_HEIGHT - 10,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              borderBottom: `1px dashed ${group.color}40`,
              marginBottom: '10px',
            }}
          >
            <h3
              style={{
                color: group.color,
                fontSize: '15px',
                fontWeight: 600,
              }}
            >
              {group.title}
            </h3>
            <span
              style={{
                marginLeft: 'auto',
                color: '#999',
                fontSize: '13px',
              }}
            >
              {getNotesByGroup(group.id).length} 张
            </span>
          </div>
        </div>
      );
    });
  };

  const renderPollPanel = () => {
    if (polls.length === 0 && !showPollCreator) return null;

    return (
      <div
        style={{
          width: isMobile ? '100%' : '320px',
          maxHeight: isMobile ? 'none' : 'calc(100vh - 200px)',
          backgroundColor: 'rgba(40, 40, 60, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: isMobile ? '0' : '16px',
          padding: '20px',
          boxShadow: isMobile ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          overflowY: 'auto',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        <h3
          style={{
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          投票面板
        </h3>

        {polls.map((poll) => {
          const hasVoted = votedPollIds.includes(poll.id);
          const winningOption = poll.showResults ? getWinningOption(poll) : null;

          return (
            <div
              key={poll.id}
              style={{
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: poll === polls[polls.length - 1] ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div
                style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 500,
                  marginBottom: '12px',
                  lineHeight: '1.4',
                }}
              >
                {poll.question}
              </div>

              {!poll.showResults ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {poll.options.map((option) => {
                      const percentage = poll.totalVotes > 0 ? (option.votes / poll.totalVotes) * 100 : 0;
                      return (
                        <button
                          key={option.id}
                          onClick={() => !hasVoted && poll.isActive && onVote(poll.id, option.id)}
                          disabled={hasVoted || !poll.isActive}
                          style={{
                            position: 'relative',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            backgroundColor: hasVoted
                              ? 'rgba(74, 144, 217, 0.3)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            fontSize: '13px',
                            cursor: hasVoted || !poll.isActive ? 'not-allowed' : 'pointer',
                            textAlign: 'left',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease',
                            width: '100%',
                          }}
                          onMouseEnter={(e) => {
                            if (!hasVoted && poll.isActive) {
                              (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                              (e.target as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.4)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLButtonElement).style.backgroundColor = hasVoted
                              ? 'rgba(74, 144, 217, 0.3)'
                              : 'rgba(255, 255, 255, 0.05)';
                            (e.target as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          }}
                        >
                          <div
                            className="vote-progress-fill"
                            style={{ width: `${percentage}%` }}
                          />
                          <span style={{ position: 'relative', zIndex: 1, display: 'block' }}>{option.text}</span>
                          {hasVoted && (
                            <span
                              style={{
                                position: 'relative',
                                zIndex: 1,
                                float: 'right',
                                fontSize: '12px',
                                color: '#50C878',
                                marginTop: '-18px',
                              }}
                            >
                              {option.votes}票 ({percentage.toFixed(0)}%)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => onShowResults(poll.id)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#50C878',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#45B068';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = '#50C878';
                      }}
                    >
                      显示结果
                    </button>
                    <button
                      onClick={() => onResetPoll(poll.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        backgroundColor: 'transparent',
                        color: '#fff',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                      }}
                    >
                      重置
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-around',
                      height: '150px',
                      padding: '20px 10px',
                      gap: '10px',
                    }}
                  >
                    {poll.options.map((option) => {
                      const height = maxVotes > 0 ? (option.votes / maxVotes) * 100 : 0;
                      const isWinner = winningOption?.id === option.id;
                      return (
                        <div
                          key={option.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#FFD700',
                              fontWeight: 'bold',
                              marginBottom: '4px',
                            }}
                          >
                            {option.votes}
                          </div>
                          <div
                            className={isWinner ? 'winner-bar' : ''}
                            style={{
                              width: '100%',
                              maxWidth: '40px',
                              height: `${height}%`,
                              minHeight: '4px',
                              background: isWinner
                                ? 'linear-gradient(180deg, #FFD700, #FFA500)'
                                : 'linear-gradient(180deg, #4A90D9, #50C878)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              ['--final-height' as any]: `${height}%`,
                            }}
                          />
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#999',
                              marginTop: '6px',
                              textAlign: 'center',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%',
                            }}
                            title={option.text}
                          >
                            {option.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => onResetPoll(poll.id)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#4A90D9',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#3A7BC0';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = '#4A90D9';
                    }}
                  >
                    重新投票
                  </button>
                </div>
              )}

              <div
                style={{
                  marginTop: '10px',
                  fontSize: '11px',
                  color: '#666',
                }}
              >
                共 {poll.totalVotes} 票
                {hasVoted && <span style={{ color: '#50C878', marginLeft: '8px' }}>✓ 已投票</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderPollCreator = () => {
    if (!showPollCreator) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease',
        }}
        onClick={() => setShowPollCreator(false)}
      >
        <div
          style={{
            backgroundColor: '#2A2A3E',
            borderRadius: '16px',
            padding: '24px',
            width: '90%',
            maxWidth: '450px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            animation: 'fadeIn 0.3s ease',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            style={{
              color: '#fff',
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            创建新投票
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                color: '#aaa',
                fontSize: '13px',
                marginBottom: '6px',
                display: 'block',
              }}
            >
              投票议题 (最多100字)
            </label>
            <textarea
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value.slice(0, 100))}
              placeholder="请输入投票议题..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#fff',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '60px',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div
              style={{
                textAlign: 'right',
                fontSize: '11px',
                color: '#666',
                marginTop: '4px',
              }}
            >
              {pollQuestion.length}/100
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                color: '#aaa',
                fontSize: '13px',
                marginBottom: '8px',
                display: 'block',
              }}
            >
              选项 ({pollOptions.length}/4)
            </label>
            {pollOptions.map((option, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...pollOptions];
                    newOptions[index] = e.target.value;
                    setPollOptions(newOptions);
                  }}
                  placeholder={`选项 ${index + 1}`}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    style={{
                      width: '40px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'rgba(229, 57, 53, 0.2)',
                      color: '#E53935',
                      fontSize: '18px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(229, 57, 53, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(229, 57, 53, 0.2)';
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <button
                onClick={addOption}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px dashed rgba(255, 255, 255, 0.3)',
                  backgroundColor: 'transparent',
                  color: '#888',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  (e.target as HTMLButtonElement).style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.borderColor = 'rgba(255, 255, 255, 0.3)';
                  (e.target as HTMLButtonElement).style.color = '#888';
                }}
              >
                + 添加选项
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowPollCreator(false)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: 'transparent',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              取消
            </button>
            <button
              onClick={handleCreatePoll}
              disabled={
                !pollQuestion.trim() ||
                pollOptions.filter((o) => o.trim()).length < 2
              }
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor:
                  !pollQuestion.trim() ||
                  pollOptions.filter((o) => o.trim()).length < 2
                    ? 'rgba(80, 200, 120, 0.5)'
                    : '#50C878',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                cursor:
                  !pollQuestion.trim() ||
                  pollOptions.filter((o) => o.trim()).length < 2
                    ? 'not-allowed'
                    : 'pointer',
                transition: 'background-color 0.2s ease',
              }}
            >
              创建投票
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ungroupedNotes = getNotesByGroup(null);

  return (
    <>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          minHeight: 0,
        }}
      >
        <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: 0 }}>
          <div
            ref={boardRef}
            onDoubleClick={handleBoardDoubleClick}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'auto',
              backgroundImage: `
                radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
              cursor: editingNote ? 'text' : 'crosshair',
            }}
          >
            {renderGroups()}

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: calculateGroupHeight('group-1') + 40,
                height: '1px',
                borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
                pointerEvents: 'none',
              }}
            />

            <svg ref={svgRef} className="proximity-svg" />

            {notes.map(renderNote)}

            {ungroupedNotes.length === 0 && !editingNote && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontSize: '16px',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                双击空白处创建便签
                <div style={{ fontSize: '13px', marginTop: '8px' }}>
                  或点击顶部色球快速创建
                </div>
              </div>
            )}
          </div>

          {!isMobile && polls.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                zIndex: 50,
              }}
            >
              {renderPollPanel()}
            </div>
          )}
        </div>

        {isMobile && polls.length > 0 && (
          <div className="mobile-poll-container">{renderPollPanel()}</div>
        )}

        <div
          style={{
            height: '60px',
            backgroundColor: 'rgba(30, 30, 46, 0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            flexShrink: 0,
            gap: '12px',
          }}
        >
          <button
            onClick={() => setShowPollCreator(true)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#4A90D9',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease, transform 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#3A7BC0';
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#4A90D9';
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            }}
          >
            <span>📊</span>
            发起投票
          </button>

          <div
            style={{
              color: '#666',
              fontSize: '13px',
              marginLeft: 'auto',
            }}
          >
            便签: {notes.length} 张 | 投票: {polls.length} 个
          </div>
        </div>
      </div>

      {renderPollCreator()}
    </>
  );
}

export default NoteBoard;
