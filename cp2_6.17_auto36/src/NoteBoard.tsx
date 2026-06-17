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
const GROUP_HEADER_HEIGHT = 40;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function easeOutElastic(t: number): number {
  const p = 0.3;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
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
  const [draggingNote, setDraggingNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deletingNote, setDeletingNote] = useState<string | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isMobile, setIsMobile] = useState(false);
  const [animatingNote, setAnimatingNote] = useState<string | null>(null);

  const animationRefs = useRef<Map<string, { rafId: number; startTime: number; startX: number; startY: number; targetX: number; targetY: number }>>(new Map());

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, noteId: string) => {
      if (editingNote) return;
      e.preventDefault();
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;

      const boardRect = boardRef.current?.getBoundingClientRect();
      if (!boardRect) return;

      setDraggingNote(noteId);
      setDragOffset({
        x: e.clientX - boardRect.left - note.x,
        y: e.clientY - boardRect.top - note.y,
      });

      const anim = animationRefs.current.get(noteId);
      if (anim) {
        cancelAnimationFrame(anim.rafId);
        animationRefs.current.delete(noteId);
      }
    },
    [notes, editingNote]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingNote || !boardRef.current) return;

      const boardRect = boardRef.current.getBoundingClientRect();
      const newX = e.clientX - boardRect.left - dragOffset.x;
      const newY = e.clientY - boardRect.top - dragOffset.y;

      onUpdateNote(draggingNote, { x: newX, y: newY, groupId: null });
    },
    [draggingNote, dragOffset, onUpdateNote]
  );

  const handleMouseUp = useCallback(() => {
    if (!draggingNote) return;

    const note = notes.find((n) => n.id === draggingNote);
    if (!note) {
      setDraggingNote(null);
      return;
    }

    let targetGroupId: string | null = null;
    for (const group of groups) {
      const groupHeight = calculateGroupHeight(group.id);
      if (
        note.x >= group.x &&
        note.x <= group.x + group.width &&
        note.y >= group.y &&
        note.y <= group.y + groupHeight
      ) {
        targetGroupId = group.id;
        break;
      }
    }

    if (targetGroupId) {
      const groupNotes = getNotesByGroup(targetGroupId);
      const group = groups.find((g) => g.id === targetGroupId);
      if (group) {
        const index = groupNotes.length;
        const columns = 2;
        const col = index % columns;
        const row = Math.floor(index / columns);
        const targetX = group.x + 20 + col * (NOTE_WIDTH + 15);
        const targetY = group.y + GROUP_HEADER_HEIGHT + 15 + row * 140;

        animateNoteTo(draggingNote, note.x, note.y, targetX, targetY, () => {
          onUpdateNote(draggingNote, {
            x: targetX,
            y: targetY,
            groupId: targetGroupId,
          });
        });
      }
    } else {
      const snappedX = snapToGrid(note.x);
      const snappedY = snapToGrid(note.y);

      if (snappedX !== note.x || snappedY !== note.y) {
        animateNoteTo(draggingNote, note.x, note.y, snappedX, snappedY, () => {
          onUpdateNote(draggingNote, { x: snappedX, y: snappedY, groupId: null });
        });
      }
    }

    setDraggingNote(null);
    setHoveredGroup(null);
  }, [draggingNote, notes, groups, calculateGroupHeight, getNotesByGroup, onUpdateNote]);

  const animateNoteTo = (
    noteId: string,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    onComplete?: () => void
  ) => {
    const existing = animationRefs.current.get(noteId);
    if (existing) {
      cancelAnimationFrame(existing.rafId);
    }

    setAnimatingNote(noteId);
    const startTime = performance.now();
    const duration = 200;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easedT = easeOutElastic(t);

      const currentX = startX + (targetX - startX) * easedT;
      const currentY = startY + (targetY - startY) * easedT;

      onUpdateNote(noteId, { x: currentX, y: currentY });

      if (t < 1) {
        const rafId = requestAnimationFrame(animate);
        animationRefs.current.set(noteId, { rafId, startTime, startX, startY, targetX, targetY });
      } else {
        animationRefs.current.delete(noteId);
        setAnimatingNote(null);
        if (onComplete) onComplete();
      }
    };

    const rafId = requestAnimationFrame(animate);
    animationRefs.current.set(noteId, { rafId, startTime, startX, startY, targetX, targetY });
  };

  useEffect(() => {
    if (draggingNote) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingNote, handleMouseMove, handleMouseUp]);

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
      setDeletingNote(noteId);
      setTimeout(() => {
        onDeleteNote(noteId);
        setDeletingNote(null);
      }, 300);
    },
    [onDeleteNote]
  );

  const handleBoardDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (editingNote) return;
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

  const renderNote = (note: Note) => {
    const isEditing = editingNote === note.id;
    const isDeleting = deletingNote === note.id;
    const isDragging = draggingNote === note.id;
    const isAnimating = animatingNote === note.id;

    return (
      <div
        key={note.id}
        style={{
          position: 'absolute',
          left: note.x,
          top: note.y,
          width: NOTE_WIDTH,
          backgroundColor: note.color,
          borderRadius: '12px',
          padding: '12px',
          paddingRight: '32px',
          boxShadow: isDragging
            ? '0 12px 32px rgba(0, 0, 0, 0.4)'
            : '0 4px 12px rgba(0, 0, 0, 0.2)',
          cursor: isEditing ? 'text' : 'grab',
          zIndex: isDragging ? 1000 : isAnimating ? 500 : 1,
          minHeight: '80px',
          animation: isDeleting ? 'shrinkRotate 0.3s ease forwards' : 'none',
          transition: !isDragging && !isAnimating ? 'box-shadow 0.2s ease' : 'none',
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
      const isHovered = hoveredGroup === group.id;

      return (
        <div
          key={group.id}
          style={{
            position: 'absolute',
            left: group.x,
            top: group.y,
            width: group.width,
            height: groupHeight,
            backgroundColor: `${group.color}15`,
            borderRadius: '12px',
            border: `2px solid ${group.color}`,
            borderColor: isHovered ? '#ffffff' : group.color,
            transition: 'border-color 0.2s ease, background-color 0.2s ease',
            padding: '10px',
            overflow: 'visible',
          }}
          onMouseEnter={() => setHoveredGroup(group.id)}
          onMouseLeave={() => setHoveredGroup(null)}
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
          position: isMobile ? 'relative' : 'absolute',
          [isMobile ? 'bottom' : 'top']: isMobile ? '70px' : '70px',
          [isMobile ? 'left' : 'right']: isMobile ? '20px' : '20px',
          [isMobile ? 'right' : 'width']: isMobile ? '20px' : '320px',
          maxHeight: isMobile ? '40vh' : 'calc(100vh - 200px)',
          backgroundColor: 'rgba(40, 40, 60, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflowY: 'auto',
          zIndex: 100,
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
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${percentage}%`,
                              background: 'linear-gradient(90deg, #4A90D9, #50C878)',
                              transition: 'width 0.5s ease',
                              opacity: 0.3,
                            }}
                          />
                          <span style={{ position: 'relative', zIndex: 1 }}>{option.text}</span>
                          {hasVoted && (
                            <span style={{ position: 'relative', zIndex: 1, float: 'right', fontSize: '12px', color: '#50C878' }}>
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
                                : `linear-gradient(180deg, #4A90D9, #50C878)`,
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              animation: `barGrow 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
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
        }}
      >
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

        {!isMobile && renderPollPanel()}

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

        {isMobile && renderPollPanel()}
      </div>

      {renderPollCreator()}
    </>
  );
}

export default NoteBoard;
