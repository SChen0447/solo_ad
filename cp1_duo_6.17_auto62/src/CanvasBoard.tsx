import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { StoryCard, SwimLane, UserCursor, StoryType } from './types';
import { CARD_COLORS, STORY_TYPE_LABELS } from './types';

interface CanvasBoardProps {
  swimlanes: SwimLane[];
  cards: StoryCard[];
  remoteCursors: Record<string, UserCursor>;
  currentUserId: string;
  onCardMove: (cardId: string, swimlaneId: string, position: number, newSwimlaneTitle?: string) => void;
  onCursorMove: (x: number, y: number, draggingId: string | null) => void;
  onDraggingChange: (cardId: string | null) => void;
  onAddCard: (swimlaneId: string) => void;
}

const SWIMLANE_HEADER_WIDTH = 180;
const SWIMLANE_CONTENT_PADDING = 24;
const CARD_WIDTH = 180;
const CARD_GAP = 12;
const CARD_VERTICAL_GAP = 12;
const CARD_VERTICAL_PADDING = 80;
const TOP_PADDING = 80;
const GRID_SIZE_MM = 3;
const GRID_SIZE_PX = Math.round(GRID_SIZE_MM * 3.78);

interface DragState {
  cardId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  originalSwimlaneId: string;
  originalPosition: number;
}

const StoryCardComponent: React.FC<{
  card: StoryCard;
  isDragging: boolean;
  dragStyle?: React.CSSProperties;
  onMouseDown: (e: React.MouseEvent) => void;
  estimatedHeight: number;
}> = ({ card, isDragging, dragStyle, onMouseDown, estimatedHeight }) => {
  const color = CARD_COLORS[card.type];

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        width: CARD_WIDTH,
        minHeight: estimatedHeight,
        background: '#ffffff',
        borderRadius: 12,
        borderLeft: `4px solid ${color}`,
        boxShadow: isDragging
          ? '0 16px 40px rgba(0, 0, 0, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.06)',
        padding: 12,
        cursor: isDragging ? 'grabbing' : 'grab',
        position: dragStyle ? 'fixed' : 'relative',
        zIndex: isDragging ? 1000 : 1,
        userSelect: 'none',
        transition: isDragging
          ? 'none'
          : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...dragStyle,
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 6,
          background: `${color}15`,
          color,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {STORY_TYPE_LABELS[card.type]}
        </span>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 24,
          height: 24,
          padding: '0 6px',
          borderRadius: 6,
          background: '#f3f4f6',
          color: '#6b7280',
          fontSize: 11,
          fontWeight: 600,
        }}>
          {card.storyPoints}pts
        </span>
      </div>

      <div style={{
        fontSize: 14,
        fontWeight: 600,
        color: '#1f2937',
        lineHeight: 1.4,
      }}>
        {card.title}
      </div>

      <div style={{
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 1.5,
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
      }}>
        {card.description}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 6,
        borderTop: '1px solid #f3f4f6',
        marginTop: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: `${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            color,
            fontWeight: 700,
          }}>
            {card.createdBy.slice(0, 2).toUpperCase()}
          </div>
        </div>
        <span style={{ fontSize: 10, color: '#9ca3af' }}>
          {new Date(card.updatedAt).toLocaleDateString('zh-CN')}
        </span>
      </div>
    </div>
  );
};

const CanvasBoard: React.FC<CanvasBoardProps> = ({
  swimlanes,
  cards,
  remoteCursors,
  currentUserId,
  onCardMove,
  onCursorMove,
  onDraggingChange,
  onAddCard,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [smoothedDrag, setSmoothedDrag] = useState<{ x: number; y: number } | null>(null);
  const [hoveredDropZone, setHoveredDropZone] = useState<{ swimlaneId: string; position: number } | null>(null);
  const [newSwimlanePreview, setNewSwimlanePreview] = useState<string | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastCursorEmitRef = useRef<number>(0);

  const sortedSwimlanes = useMemo(
    () => [...swimlanes].sort((a, b) => a.position - b.position),
    [swimlanes]
  );

  const sortedCardsByLane = useMemo(() => {
    const map: Record<string, StoryCard[]> = {};
    swimlanes.forEach((lane) => {
      map[lane.id] = [];
    });
    cards.forEach((card) => {
      if (map[card.swimlaneId]) {
        map[card.swimlaneId].push(card);
      }
    });
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return map;
  }, [swimlanes, cards]);

  const swimlaneLayouts = useMemo(() => {
    let currentX = 0;
    return sortedSwimlanes.map((lane) => {
      const laneCards = sortedCardsByLane[lane.id] || [];
      const columns = Math.max(1, Math.ceil((laneCards.length || 1)));
      const contentWidth = columns * CARD_WIDTH + (columns + 1) * CARD_GAP + SWIMLANE_CONTENT_PADDING * 2;
      const layout = {
        lane,
        x: currentX,
        width: SWIMLANE_HEADER_WIDTH + contentWidth,
        cardCount: laneCards.length,
        columns,
      };
      currentX += layout.width;
      return layout;
    });
  }, [sortedSwimlanes, sortedCardsByLane]);

  const totalContentWidth = useMemo(() => {
    const last = swimlaneLayouts[swimlaneLayouts.length - 1];
    return last ? last.x + last.width + 400 : 2000;
  }, [swimlaneLayouts]);

  const totalContentHeight = useMemo(() => {
    let maxHeight = 0;
    swimlaneLayouts.forEach((layout) => {
      const laneCards = sortedCardsByLane[layout.lane.id] || [];
      const rows = Math.ceil(laneCards.length / Math.max(1, layout.columns));
      const estimatedRowHeight = 160;
      const height = rows * (estimatedRowHeight + CARD_VERTICAL_GAP) + CARD_VERTICAL_GAP * 2 + TOP_PADDING + CARD_VERTICAL_PADDING;
      maxHeight = Math.max(maxHeight, height);
    });
    return Math.max(maxHeight, window.innerHeight + 200);
  }, [swimlaneLayouts, sortedCardsByLane]);

  const estimateCardHeight = useCallback((card: StoryCard) => {
    const baseHeight = 120;
    const descLines = Math.ceil(card.description.length / 30);
    const titleLines = Math.ceil(card.title.length / 12);
    return baseHeight + Math.min(descLines * 16, 48) + (titleLines > 1 ? titleLines * 8 : 0);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollLeft(target.scrollLeft);
    setScrollTop(target.scrollTop);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now();
    if (now - lastCursorEmitRef.current > 50) {
      lastCursorEmitRef.current = now;
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const x = e.clientX - containerRect.left + (containerRef.current?.scrollLeft || 0);
        const y = e.clientY - containerRect.top + (containerRef.current?.scrollTop || 0);
        onCursorMove(x, y, dragState?.cardId || null);
      }
    }

    if (dragState) {
      const newX = e.clientX - dragState.offsetX;
      const newY = e.clientY - dragState.offsetY;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        setSmoothedDrag((prev) => {
          if (!prev) return { x: newX, y: newY };
          const ease = 0.35;
          return {
            x: prev.x + (newX - prev.x) * ease,
            y: prev.y + (newY - prev.y) * ease,
          };
        });
      });

      setDragState((prev) => (prev ? { ...prev, currentX: newX, currentY: newY } : null));

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const dropX = e.clientX - containerRect.left + (containerRef.current?.scrollLeft || 0) - SWIMLANE_HEADER_WIDTH;
        const dropY = e.clientY - containerRect.top + (containerRef.current?.scrollTop || 0) - TOP_PADDING;

        let foundLane: SwimLane | null = null;
        let foundPosition = 0;
        let inEmptyZone = true;

        for (const layout of swimlaneLayouts) {
          const laneContentX = layout.x + SWIMLANE_HEADER_WIDTH;
          const laneContentWidth = layout.width - SWIMLANE_HEADER_WIDTH;

          if (dropX >= laneContentX - 20 && dropX <= laneContentX + laneContentWidth + 20) {
            foundLane = layout.lane;
            inEmptyZone = false;

            if (dropY > 0) {
              const estimatedRowHeight = 172;
              const columnWidth = CARD_WIDTH + CARD_GAP;
              const colIdx = Math.max(0, Math.min(layout.columns - 1, Math.floor((dropX - laneContentX - SWIMLANE_CONTENT_PADDING + CARD_GAP) / columnWidth)));
              const rowIdx = Math.max(0, Math.floor((dropY - CARD_VERTICAL_GAP - 20) / (estimatedRowHeight + CARD_VERTICAL_GAP)));
              const laneCards = sortedCardsByLane[layout.lane.id] || [];
              const maxColCards = Math.ceil(laneCards.length / Math.max(1, layout.columns));
              const estPosition = rowIdx * layout.columns + colIdx;
              foundPosition = Math.min(estPosition, laneCards.length);
            }
            break;
          }
        }

        if (inEmptyZone && dropX > 0) {
          const nextLaneNum = sortedSwimlanes.length + 1;
          setNewSwimlanePreview(`第${nextLaneNum}周冲刺`);
          setHoveredDropZone({ swimlaneId: '__new__', position: 0 });
        } else {
          setNewSwimlanePreview(null);
          if (foundLane) {
            setHoveredDropZone({ swimlaneId: foundLane.id, position: foundPosition });
          } else {
            setHoveredDropZone(null);
          }
        }
      }
    }
  }, [dragState, onCursorMove, swimlaneLayouts, sortedCardsByLane, sortedSwimlanes]);

  const handleMouseUp = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (dragState) {
      if (hoveredDropZone) {
        if (hoveredDropZone.swimlaneId === '__new__') {
          const newLaneId = `new_lane_${Date.now()}`;
          onCardMove(dragState.cardId, newLaneId, 0, newSwimlanePreview || '新泳道');
        } else {
          onCardMove(dragState.cardId, hoveredDropZone.swimlaneId, hoveredDropZone.position);
        }
      }

      setDragState(null);
      setSmoothedDrag(null);
      setHoveredDropZone(null);
      setNewSwimlanePreview(null);
      onDraggingChange(null);
    }
  }, [dragState, hoveredDropZone, newSwimlanePreview, onCardMove, onDraggingChange]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  const createCardDragHandler = useCallback((card: StoryCard) => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      setDragState({
        cardId: card.id,
        startX: e.clientX,
        startY: e.clientY,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
        currentX: rect.left,
        currentY: rect.top,
        originalSwimlaneId: card.swimlaneId,
        originalPosition: card.position,
      });
      setSmoothedDrag({ x: rect.left, y: rect.top });
      onDraggingChange(card.id);
    };
  }, [onDraggingChange]);

  const draggingCard = dragState ? cards.find((c) => c.id === dragState.cardId) : null;

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'auto',
        background: '#f0f0f0',
        backgroundImage: `
          linear-gradient(to right, rgba(180, 180, 180, 0.25) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(180, 180, 180, 0.25) 1px, transparent 1px)
        `,
        backgroundSize: `${GRID_SIZE_PX}px ${GRID_SIZE_PX}px`,
        backgroundPosition: `${scrollLeft % GRID_SIZE_PX}px ${scrollTop % GRID_SIZE_PX}px`,
        backgroundAttachment: 'local',
      }}
    >
      <div style={{
        position: 'relative',
        width: totalContentWidth,
        minWidth: '100%',
        height: totalContentHeight,
        minHeight: '100%',
        paddingTop: TOP_PADDING,
        paddingBottom: 80,
      }}>
        {swimlaneLayouts.map(({ lane, x, width, columns }) => {
          const laneCards = sortedCardsByLane[lane.id] || [];
          const isDropTarget = hoveredDropZone?.swimlaneId === lane.id;

          return (
            <div
              key={lane.id}
              style={{
                position: 'absolute',
                left: x,
                top: 0,
                width,
                height: '100%',
                display: 'flex',
              }}
            >
              <div style={{
                width: SWIMLANE_HEADER_WIDTH,
                flexShrink: 0,
                position: 'sticky',
                left: x,
                top: 0,
                zIndex: 10,
                paddingTop: TOP_PADDING,
                paddingLeft: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                  minWidth: 148,
                }}>
                  <div style={{
                    fontSize: 11,
                    color: '#9ca3af',
                    marginBottom: 4,
                    fontWeight: 500,
                    letterSpacing: 0.5,
                  }}>
                    SWIMLANE #{lane.position + 1}
                  </div>
                  <div style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#1f2937',
                  }}>
                    {lane.title}
                  </div>
                  <div style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                      {laneCards.length} 个故事
                    </span>
                    <button
                      onClick={() => onAddCard(lane.id)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        background: '#3b82f6',
                        color: '#fff',
                        fontSize: 16,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(59, 130, 246, 0.35)',
                        transition: 'transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div style={{
                flex: 1,
                minWidth: CARD_WIDTH + SWIMLANE_CONTENT_PADDING * 2,
                padding: `20px ${SWIMLANE_CONTENT_PADDING}px`,
                position: 'relative',
                borderRadius: 16,
                margin: '0 12px 0 0',
                background: isDropTarget ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                border: isDropTarget ? '2px dashed rgba(59, 130, 246, 0.3)' : '2px dashed transparent',
                transition: 'background 0.2s ease, border-color 0.2s ease',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.max(columns, 1)}, ${CARD_WIDTH}px)`,
                  gap: `${CARD_VERTICAL_GAP}px ${CARD_GAP}px`,
                  gridAutoFlow: 'dense',
                }}>
                  {laneCards.map((card, idx) => {
                    const isDragging = dragState?.cardId === card.id;
                    const showDropBefore = isDropTarget && hoveredDropZone?.position === idx && !isDragging;
                    const estHeight = estimateCardHeight(card);

                    return (
                      <React.Fragment key={card.id}>
                        {showDropBefore && (
                          <div style={{
                            width: CARD_WIDTH,
                            height: estHeight,
                            borderRadius: 12,
                            border: '2px dashed #3b82f6',
                            background: 'rgba(59, 130, 246, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3b82f6',
                            fontSize: 13,
                            fontWeight: 600,
                            order: idx * 2,
                          }}>
                            ← 放置卡片
                          </div>
                        )}
                        <div style={{ order: isDragging ? 9999 : idx * 2 + (showDropBefore ? 1 : 0) }}>
                          {!isDragging && (
                            <StoryCardComponent
                              card={card}
                              isDragging={false}
                              onMouseDown={createCardDragHandler(card)}
                              estimatedHeight={estHeight}
                            />
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}

                  {isDropTarget && hoveredDropZone && hoveredDropZone.position >= laneCards.length && (
                    <div style={{
                      width: CARD_WIDTH,
                      height: 160,
                      borderRadius: 12,
                      border: '2px dashed #3b82f6',
                      background: 'rgba(59, 130, 246, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#3b82f6',
                      fontSize: 13,
                      fontWeight: 600,
                      order: 9998,
                    }}>
                      ↓ 放置卡片
                    </div>
                  )}

                  {laneCards.length === 0 && !isDropTarget && (
                    <div style={{
                      gridColumn: '1 / -1',
                      width: CARD_WIDTH,
                      padding: '24px 12px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: 13,
                      border: '2px dashed #d1d5db',
                      borderRadius: 12,
                    }}>
                      拖拽卡片到此<br/>或点击 + 添加
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {newSwimlanePreview && (
          <div style={{
            position: 'absolute',
            left: swimlaneLayouts.length > 0 ? swimlaneLayouts[swimlaneLayouts.length - 1].x + swimlaneLayouts[swimlaneLayouts.length - 1].width + 40 : 40,
            top: TOP_PADDING,
            padding: '20px 24px',
            background: 'rgba(59, 130, 246, 0.12)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 14,
            border: '2px dashed #3b82f6',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            minWidth: 180,
          }}>
            <div style={{ fontSize: 28 }}>🆕</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3b82f6' }}>
              创建新泳道
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {newSwimlanePreview}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
              松开鼠标放置卡片并创建泳道
            </div>
          </div>
        )}

        {Object.entries(remoteCursors).map(([userId, cursor]) => {
          if (userId === currentUserId) return null;
          return (
            <div
              key={userId}
              style={{
                position: 'absolute',
                left: cursor.x - 1,
                top: cursor.y - 1,
                zIndex: 500,
                pointerEvents: 'none',
                transition: 'left 0.15s cubic-bezier(0.16, 1, 0.3, 1), top 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 22 22" style={{ filter: `drop-shadow(0 2px 4px ${cursor.color}60)` }}>
                <path
                  d="M2 2 L2 18 L7 13 L11 20 L14 19 L10 12 L17 12 Z"
                  fill={cursor.color}
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
              <div style={{
                position: 'absolute',
                left: 18,
                top: 18,
                padding: '3px 8px',
                background: cursor.color,
                color: '#fff',
                fontSize: 10,
                fontWeight: 600,
                borderRadius: 6,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
              }}>
                {cursor.userName}
                {cursor.draggingCardId && ' 🔄'}
              </div>
            </div>
          );
        })}

        {dragState && draggingCard && smoothedDrag && (
          <div style={{
            position: 'fixed',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.92,
            transform: 'rotate(2deg)',
            willChange: 'transform',
          }}>
            <div style={{
              position: 'absolute',
              left: smoothedDrag.x,
              top: smoothedDrag.y,
            }}>
              <StoryCardComponent
                card={draggingCard}
                isDragging={true}
                dragStyle={{}}
                onMouseDown={() => {}}
                estimatedHeight={estimateCardHeight(draggingCard)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasBoard;
