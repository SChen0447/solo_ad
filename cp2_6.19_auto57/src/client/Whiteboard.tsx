import React, { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Toolbar from './Toolbar';
import StickyNote from './StickyNote';
import type {
  DrawingPath,
  Point,
  StickyNote as StickyNoteType,
  StickyNoteColor,
  WSMessage,
  HistoryState
} from '../shared/types';

const MAX_HISTORY = 50;

const Whiteboard: React.FC = () => {
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [notes, setNotes] = useState<StickyNoteType[]>([]);
  const [currentColor, setCurrentColor] = useState('#212121');
  const [currentWidth, setCurrentWidth] = useState(3);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(60);
  const [offsetY, setOffsetY] = useState(44);
  const [onlineCount, setOnlineCount] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const [drawingPreview, setDrawingPreview] = useState<DrawingPath | null>(null);
  const [remotePreviews, setRemotePreviews] = useState<Map<string, DrawingPath>>(new Map());

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>('');
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, offX: 0, offY: 0 });
  const currentPathRef = useRef<DrawingPath | null>(null);
  const lastPointRef = useRef<Point | null>(null);

  const historyRef = useRef<HistoryState[]>([]);
  const historyIndexRef = useRef(-1);

  const saveToHistory = useCallback(() => {
    const state: HistoryState = {
      paths: JSON.parse(JSON.stringify(paths)),
      notes: JSON.parse(JSON.stringify(notes))
    };

    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    historyRef.current.push(state);

    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current++;
    }
  }, [paths, notes]);

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const x = (screenX - (rect?.left || 0) - offsetX) / scale;
      const y = (screenY - (rect?.top || 0) - offsetY) / scale;
      return { x, y };
    },
    [scale, offsetX, offsetY]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.sticky-note')) return;

      const isMiddle = e.button === 1;
      const isSpace = e.buttons === 4;

      if (isMiddle || isSpace || (e.shiftKey && e.button === 0)) {
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          offX: offsetX,
          offY: offsetY
        };
        return;
      }

      if (e.button !== 0) return;

      const point = screenToCanvas(e.clientX, e.clientY);
      const pathId = uuidv4();
      const newPath: DrawingPath = {
        id: pathId,
        points: [point],
        color: currentColor,
        width: currentWidth
      };

      isDrawingRef.current = true;
      currentPathRef.current = newPath;
      lastPointRef.current = point;
      setDrawingPreview(newPath);

      sendMessage({
        type: 'draw-start',
        payload: { path: newPath, clientId: clientIdRef.current },
        clientId: clientIdRef.current
      });
    },
    [currentColor, currentWidth, offsetX, offsetY, screenToCanvas, sendMessage]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setOffsetX(panStartRef.current.offX + dx);
        setOffsetY(panStartRef.current.offY + dy);
        return;
      }

      if (!isDrawingRef.current || !currentPathRef.current) return;

      const point = screenToCanvas(e.clientX, e.clientY);
      const lastPoint = lastPointRef.current;

      if (lastPoint) {
        const dist = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y);
        if (dist < 1) return;
      }

      const updatedPath = {
        ...currentPathRef.current,
        points: [...currentPathRef.current.points, point]
      };
      currentPathRef.current = updatedPath;
      lastPointRef.current = point;
      setDrawingPreview({ ...updatedPath });

      sendMessage({
        type: 'draw-continue',
        payload: {
          pathId: updatedPath.id,
          point,
          clientId: clientIdRef.current
        },
        clientId: clientIdRef.current
      });
    },
    [screenToCanvas, sendMessage]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isDrawingRef.current || !currentPathRef.current) return;

    const finishedPath = currentPathRef.current;
    isDrawingRef.current = false;
    currentPathRef.current = null;
    lastPointRef.current = null;
    setDrawingPreview(null);

    if (finishedPath.points.length >= 2) {
      setPaths((prev) => {
        const next = [...prev, finishedPath];
        return next;
      });
      saveToHistory();
      sendMessage({
        type: 'draw-end',
        payload: finishedPath,
        clientId: clientIdRef.current
      });
    }
  }, [saveToHistory, sendMessage]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.2, Math.min(5, scale * delta));

      const newOffsetX = mouseX - ((mouseX - offsetX) * newScale) / scale;
      const newOffsetY = mouseY - ((mouseY - offsetY) * newScale) / scale;

      setScale(newScale);
      setOffsetX(newOffsetX);
      setOffsetY(newOffsetY);
    },
    [scale, offsetX, offsetY]
  );

  const handleAddNote = useCallback(
    (color: StickyNoteColor) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      const centerX = rect
        ? ((rect.width - 60) / 2 - offsetX) / scale
        : 200;
      const centerY = rect
        ? ((rect.height - 44) / 2 - offsetY) / scale
        : 200;

      const newNote: StickyNoteType = {
        id: uuidv4(),
        x: centerX - 60,
        y: centerY - 40,
        content: '',
        color
      };

      setNotes((prev) => {
        const next = [...prev, newNote];
        return next;
      });
      saveToHistory();
      sendMessage({
        type: 'add-note',
        payload: newNote,
        clientId: clientIdRef.current
      });
    },
    [scale, offsetX, offsetY, saveToHistory, sendMessage]
  );

  const handleUpdateNote = useCallback(
    (note: StickyNoteType) => {
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    },
    []
  );

  const handleNoteDragEnd = useCallback(
    (note: StickyNoteType) => {
      saveToHistory();
      sendMessage({
        type: 'update-note',
        payload: note,
        clientId: clientIdRef.current
      });
    },
    [saveToHistory, sendMessage]
  );

  const handleDeleteNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      saveToHistory();
      sendMessage({
        type: 'delete-note',
        payload: id,
        clientId: clientIdRef.current
      });
    },
    [saveToHistory, sendMessage]
  );

  const handleChangeNoteColor = useCallback(
    (id: string, color: StickyNoteColor) => {
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, color } : n))
      );
      saveToHistory();
      const note = notes.find((n) => n.id === id);
      if (note) {
        sendMessage({
          type: 'update-note',
          payload: { ...note, color },
          clientId: clientIdRef.current
        });
      }
    },
    [notes, saveToHistory, sendMessage]
  );

  const handleClear = useCallback(() => {
    if (!window.confirm('确定要清空画布吗？此操作不可撤销。')) return;
    setIsFading(true);
    setTimeout(() => {
      setPaths([]);
      setNotes([]);
      saveToHistory();
      sendMessage({
        type: 'clear-canvas',
        clientId: clientIdRef.current
      });
      setIsFading(false);
    }, 200);
  }, [saveToHistory, sendMessage]);

  const restoreState = useCallback((state: HistoryState) => {
    setIsFading(true);
    setTimeout(() => {
      setPaths(JSON.parse(JSON.stringify(state.paths)));
      setNotes(JSON.parse(JSON.stringify(state.notes)));
      setIsFading(false);
    }, 100);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const state = historyRef.current[historyIndexRef.current];
      restoreState(state);
      sendMessage({ type: 'undo', clientId: clientIdRef.current });
    }
  }, [restoreState, sendMessage]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const state = historyRef.current[historyIndexRef.current];
      restoreState(state);
      sendMessage({ type: 'redo', clientId: clientIdRef.current });
    }
  }, [restoreState, sendMessage]);

  const buildPathD = useCallback((points: Point[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
    }

    let d = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
    }

    const last = points[points.length - 1];
    d += ` T ${last.x} ${last.y}`;

    return d;
  }, []);

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'snapshot': {
              const { paths: snapPaths, notes: snapNotes, clientId, historyIndex } =
                message.payload;
              if (clientId) clientIdRef.current = clientId;
              if (snapPaths) setPaths(snapPaths);
              if (snapNotes) setNotes(snapNotes);
              if (typeof historyIndex === 'number') {
                historyIndexRef.current = historyIndex;
              }
              if (historyRef.current.length === 0 && snapPaths && snapNotes) {
                historyRef.current.push({
                  paths: JSON.parse(JSON.stringify(snapPaths)),
                  notes: JSON.parse(JSON.stringify(snapNotes))
                });
                if (historyIndexRef.current < 0) historyIndexRef.current = 0;
              }
              break;
            }

            case 'draw-start': {
              const { path, clientId } = message.payload;
              if (clientId && clientId !== clientIdRef.current) {
                setRemotePreviews((prev) => {
                  const next = new Map(prev);
                  next.set(path.id, { ...path });
                  return next;
                });
              }
              break;
            }

            case 'draw-continue': {
              const { pathId, point, clientId } = message.payload;
              if (clientId && clientId !== clientIdRef.current) {
                setRemotePreviews((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(pathId);
                  if (existing) {
                    next.set(pathId, {
                      ...existing,
                      points: [...existing.points, point]
                    });
                  }
                  return next;
                });
              }
              break;
            }

            case 'draw-end': {
              const finishedPath = message.payload as DrawingPath;
              setRemotePreviews((prev) => {
                const next = new Map(prev);
                next.delete(finishedPath.id);
                return next;
              });
              setPaths((prev) => {
                const idx = prev.findIndex((p) => p.id === finishedPath.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = finishedPath;
                  return next;
                }
                return [...prev, finishedPath];
              });
              break;
            }

            case 'add-note': {
              const note = message.payload as StickyNoteType;
              setNotes((prev) => (prev.some((n) => n.id === note.id) ? prev : [...prev, note]));
              break;
            }

            case 'update-note': {
              const note = message.payload as StickyNoteType;
              setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
              break;
            }

            case 'delete-note': {
              const noteId = message.payload as string;
              setNotes((prev) => prev.filter((n) => n.id !== noteId));
              break;
            }

            case 'clear-canvas': {
              setPaths([]);
              setNotes([]);
              break;
            }

            case 'online-count': {
              setOnlineCount(message.payload.count);
              break;
            }
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setRemotePreviews(new Map());
        reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#f0f0f0'
      }}
    >
      <Toolbar
        currentColor={currentColor}
        currentWidth={currentWidth}
        onColorChange={setCurrentColor}
        onWidthChange={setCurrentWidth}
        onAddNote={handleAddNote}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        canUndo={canUndo}
        canRedo={canRedo}
        onlineCount={onlineCount}
        isConnected={isConnected}
      />

      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: isPanningRef.current
            ? 'grabbing'
            : 'crosshair',
          overflow: 'hidden',
          opacity: isFading ? 0.3 : 1,
          transition: 'opacity 0.2s ease'
        }}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <defs>
            <pattern id="grid" width={5 * scale} height={5 * scale} patternUnits="userSpaceOnUse" x={offsetX % (5 * scale)} y={offsetY % (5 * scale)}>
              <path d={`M ${5 * scale} 0 L 0 0 0 ${5 * scale}`} fill="none" stroke="#B3E5FC" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <svg
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
        >
          <g transform={`translate(${offsetX}, ${offsetY}) scale(${scale})`}>
            {paths.map((path) => (
              <path
                key={path.id}
                d={buildPathD(path.points)}
                stroke={path.color}
                strokeWidth={path.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}

            {Array.from(remotePreviews.values()).map((path) => (
              <path
                key={`remote-${path.id}`}
                d={buildPathD(path.points)}
                stroke={path.color}
                strokeWidth={path.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.7}
              />
            ))}

            {drawingPreview && (
              <path
                d={buildPathD(drawingPreview.points)}
                stroke={drawingPreview.color}
                strokeWidth={drawingPreview.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
          </g>
        </svg>

        {notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            scale={scale}
            offsetX={offsetX}
            offsetY={offsetY}
            onUpdate={handleUpdateNote}
            onDragEnd={handleNoteDragEnd}
            onDelete={handleDeleteNote}
            onChangeColor={handleChangeNoteColor}
          />
        ))}
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          backgroundColor: 'white',
          borderRadius: '10px',
          padding: '8px 14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: '#555',
          zIndex: 90
        }}
      >
        <button
          onClick={() => setScale((s) => Math.max(0.2, s * 0.8))}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F5F5F5';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          −
        </button>
        <span style={{ minWidth: '48px', textAlign: 'center', fontWeight: 500 }}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(5, s * 1.25))}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F5F5F5';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white';
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          +
        </button>
        <button
          onClick={() => {
            setScale(1);
            setOffsetX(60);
            setOffsetY(44);
          }}
          style={{
            marginLeft: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E3F2FD';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#2196F3';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'white';
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#ddd';
          }}
        >
          重置
        </button>
      </div>
    </div>
  );
};

export default Whiteboard;
