import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PixelFrame,
  CharacterAction,
  Track,
  CharacterType,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  STAGE_WIDTH,
  STAGE_HEIGHT,
  THUMBNAIL_SIZE,
  TRACK_HEIGHT,
  DEFAULT_FPS,
  BRUSH_COLORS,
  CHARACTER_COLORS,
  COLORS,
} from './types';
import {
  createFrame,
  cloneFrame,
  createAction,
  createTrack,
  createTrackClip,
  reorderFrames,
  deleteFrame,
  drawFrameToCanvas,
  frameToDataURL,
  exportProjectJSON,
  loadProjectJSON,
  createEmptyProject,
} from './frameEngine';
import { createPlayer, AnimationPlayer, PlayerState } from './player';
import { downloadGif, ExportOptions } from './exportGif';

const PIXEL_SCALE = 8;
const CANVAS_DISPLAY_WIDTH = CANVAS_WIDTH * PIXEL_SCALE;
const CANVAS_DISPLAY_HEIGHT = CANVAS_HEIGHT * PIXEL_SCALE;
const STAGE_SCALE = 4;

const Editor: React.FC = () => {
  const [projectName, setProjectName] = useState('像素剧本');
  const [currentPixels, setCurrentPixels] = useState<number[][]>(() =>
    Array(CANVAS_HEIGHT)
      .fill(null)
      .map(() => Array(CANVAS_WIDTH).fill(0))
  );
  const [selectedColor, setSelectedColor] = useState(1);
  const [currentActionId, setCurrentActionId] = useState<string>('');
  const [actions, setActions] = useState<CharacterAction[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [fps, setFps] = useState(DEFAULT_FPS);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentFrame: 0,
    isPlaying: false,
    progress: 0,
    totalFrames: 60,
  });
  const [stageFrames, setStageFrames] = useState<PixelFrame[]>([]);
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null);
  const [draggedAction, setDraggedAction] = useState<CharacterAction | null>(null);
  const [resizingClip, setResizingClip] = useState<{
    trackId: string;
    clipId: string;
    edge: 'left' | 'right';
    startX: number;
    originalDuration: number;
    originalStart: number;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFps, setExportFps] = useState<8 | 12 | 24>(12);
  const [exportLoop, setExportLoop] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageCanvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<AnimationPlayer | null>(null);
  const isDrawingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const empty = createEmptyProject();
    setActions(empty.actions);
    setTracks(empty.tracks);
    setFps(empty.fps);
    if (empty.actions.length > 0) {
      setCurrentActionId(empty.actions[0].id);
    }
  }, []);

  useEffect(() => {
    if (actions.length === 0 || tracks.length === 0) return;

    playerRef.current = createPlayer(actions, tracks, fps, {
      onFrameChange: (_, frames) => {
        setStageFrames(frames);
      },
      onStateChange: (state) => {
        setPlayerState(state);
      },
    });

    return () => {
      playerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setData(actions, tracks);
      playerRef.current.setFps(fps);
    }
  }, [actions, tracks, fps]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < CANVAS_HEIGHT; y++) {
      for (let x = 0; x < CANVAS_WIDTH; x++) {
        const colorIndex = currentPixels[y][x];
        if (colorIndex !== 0) {
          ctx.fillStyle = COLORS[colorIndex];
          ctx.fillRect(
            x * PIXEL_SCALE,
            y * PIXEL_SCALE,
            PIXEL_SCALE,
            PIXEL_SCALE
          );
        }
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * PIXEL_SCALE, 0);
      ctx.lineTo(x * PIXEL_SCALE, CANVAS_DISPLAY_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * PIXEL_SCALE);
      ctx.lineTo(CANVAS_DISPLAY_WIDTH, y * PIXEL_SCALE);
      ctx.stroke();
    }
  }, [currentPixels]);

  const renderStage = useCallback(() => {
    const canvas = stageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const spacing = 150;
    const totalWidth =
      stageFrames.length * CANVAS_WIDTH * STAGE_SCALE +
      (stageFrames.length - 1) * spacing;
    const startX = (STAGE_WIDTH - totalWidth) / 2;
    const startY = (STAGE_HEIGHT - CANVAS_HEIGHT * STAGE_SCALE) / 2;

    stageFrames.forEach((frame, index) => {
      drawFrameToCanvas(
        ctx,
        frame,
        startX + index * (CANVAS_WIDTH * STAGE_SCALE + spacing),
        startY,
        STAGE_SCALE
      );
    });
  }, [stageFrames]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    renderStage();
  }, [renderStage]);

  const getPixelPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / PIXEL_SCALE);
    const y = Math.floor((e.clientY - rect.top) / PIXEL_SCALE);
    if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) return null;
    return { x, y };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPixelPosition(e);
    if (!pos) return;
    isDrawingRef.current = true;
    paintPixel(pos.x, pos.y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pos = getPixelPosition(e);
    if (!pos) return;
    paintPixel(pos.x, pos.y);
  };

  const handleCanvasMouseUp = () => {
    isDrawingRef.current = false;
  };

  const paintPixel = (x: number, y: number) => {
    setCurrentPixels((prev) => {
      const newPixels = prev.map((row) => [...row]);
      newPixels[y][x] = selectedColor;
      return newPixels;
    });
  };

  const clearCanvas = () => {
    setCurrentPixels(
      Array(CANVAS_HEIGHT)
        .fill(null)
        .map(() => Array(CANVAS_WIDTH).fill(0))
    );
  };

  const addFrame = () => {
    const newFrame = createFrame(
      currentPixels.map((row) => [...row])
    );
    setActions((prev) =>
      prev.map((a) =>
        a.id === currentActionId
          ? { ...a, frames: [...a.frames, newFrame] }
          : a
      )
    );
  };

  const handleFrameDragStart = (index: number) => {
    setDraggedFrameIndex(index);
  };

  const handleFrameDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedFrameIndex === null || draggedFrameIndex === targetIndex) return;

    setActions((prev) =>
      prev.map((a) =>
        a.id === currentActionId
          ? { ...a, frames: reorderFrames(a.frames, draggedFrameIndex, targetIndex) }
          : a
      )
    );
    setDraggedFrameIndex(targetIndex);
  };

  const handleFrameDragEnd = () => {
    setDraggedFrameIndex(null);
  };

  const handleDeleteFrame = (frameId: string) => {
    setActions((prev) =>
      prev.map((a) =>
        a.id === currentActionId
          ? { ...a, frames: deleteFrame(a.frames, frameId) }
          : a
      )
    );
  };

  const handleDuplicateFrame = (frame: PixelFrame) => {
    const newFrame = cloneFrame(frame);
    setActions((prev) =>
      prev.map((a) =>
        a.id === currentActionId
          ? {
              ...a,
              frames: [
                ...a.frames.slice(0, a.frames.indexOf(frame) + 1),
                newFrame,
                ...a.frames.slice(a.frames.indexOf(frame) + 1),
              ],
            }
          : a
      )
    );
  };

  const addNewAction = () => {
    const newAction = createAction('新动作', 'player', [createFrame()]);
    setActions((prev) => [...prev, newAction]);
    setCurrentActionId(newAction.id);
  };

  const handleActionTypeChange = (actionId: string, type: CharacterType) => {
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, characterType: type } : a))
    );
  };

  const handleActionNameChange = (actionId: string, name: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === actionId ? { ...a, name } : a))
    );
  };

  const handleActionDragStart = (action: CharacterAction) => {
    setDraggedAction(action);
  };

  const handleTrackDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    if (!draggedAction) return;

    const newClip = createTrackClip(draggedAction.id, 0, draggedAction.frames.length * 2);
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
      )
    );
    setDraggedAction(null);
  };

  const handleClipResizeStart = (
    e: React.MouseEvent,
    trackId: string,
    clipId: string,
    edge: 'left' | 'right'
  ) => {
    e.stopPropagation();
    const track = tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);
    if (!clip) return;

    setResizingClip({
      trackId,
      clipId,
      edge,
      startX: e.clientX,
      originalDuration: clip.duration,
      originalStart: clip.startFrame,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingClip) return;

      const deltaX = e.clientX - resizingClip.startX;
      const deltaFrames = Math.round(deltaX / 20);

      setTracks((prev) =>
        prev.map((t) =>
          t.id === resizingClip.trackId
            ? {
                ...t,
                clips: t.clips.map((c) => {
                  if (c.id !== resizingClip.clipId) return c;
                  if (resizingClip.edge === 'right') {
                    return {
                      ...c,
                      duration: Math.max(1, resizingClip.originalDuration + deltaFrames),
                    };
                  } else {
                    const newStart = Math.max(
                      0,
                      resizingClip.originalStart + deltaFrames
                    );
                    const newDuration =
                      resizingClip.originalDuration +
                      (resizingClip.originalStart - newStart);
                    return {
                      ...c,
                      startFrame: newStart,
                      duration: Math.max(1, newDuration),
                    };
                  }
                }),
              }
            : t
        )
      );
    },
    [resizingClip]
  );

  const handleMouseUp = useCallback(() => {
    setResizingClip(null);
  }, []);

  useEffect(() => {
    if (resizingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [resizingClip, handleMouseMove, handleMouseUp]);

  const handleDeleteClip = (trackId: string, clipId: string) => {
    setTracks((prev) =>
      prev.map((t) =>
        t.id === trackId
          ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
          : t
      )
    );
  };

  const addTrack = (type: CharacterType) => {
    const typeNames = { player: '玩家轨道', enemy: '敌人轨道', item: '道具轨道' };
    const newTrack = createTrack(type, typeNames[type]);
    setTracks((prev) => [...prev, newTrack]);
  };

  const handlePlay = () => {
    playerRef.current?.play();
  };

  const handlePause = () => {
    playerRef.current?.pause();
  };

  const handleStop = () => {
    playerRef.current?.stop();
  };

  const handleSeek = (frame: number) => {
    playerRef.current?.seekTo(frame);
  };

  const handleFpsChange = (newFps: number) => {
    setFps(newFps);
  };

  const handleExportJSON = () => {
    exportProjectJSON(projectName, actions, tracks, fps);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await loadProjectJSON(file);
    if (data) {
      setProjectName(data.name);
      setActions(data.actions);
      setTracks(data.tracks);
      setFps(data.fps);
      if (data.actions.length > 0) {
        setCurrentActionId(data.actions[0].id);
      }
    }
    e.target.value = '';
  };

  const handleExportGIF = async () => {
    setShowExportModal(false);
    setIsExporting(true);
    setExportProgress(0);

    const options: ExportOptions = {
      fps: exportFps,
      loop: exportLoop,
      onProgress: (p) => setExportProgress(p),
    };

    await downloadGif(actions, tracks, projectName, options);
    setIsExporting(false);
  };

  const currentAction = actions.find((a) => a.id === currentActionId);

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#EAEAEA] font-bold select-none overflow-hidden">
      <header className="h-14 bg-[#252525] border-b-4 border-[#4A90D9] flex items-center px-6 gap-6">
        <h1 className="text-xl tracking-wider text-[#4A90D9]">🎮 像素剧本工坊</h1>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-[#1A1A1A] border-2 border-[#444] px-3 py-1 text-sm focus:border-[#4A90D9] outline-none transition-colors duration-200"
        />
        <div className="flex-1" />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-[#333] border-2 border-[#555] hover:border-[#4A90D9] transition-all duration-200 text-sm"
        >
          📂 加载JSON
        </motion.button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          className="hidden"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleExportJSON}
          className="px-4 py-2 bg-[#4A90D9] border-2 border-[#6AB0F9] hover:bg-[#3A80C9] transition-all duration-200 text-sm"
        >
          💾 导出JSON
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowExportModal(true)}
          className="px-4 py-2 bg-[#FFCC00] text-[#1A1A1A] border-2 border-[#FFDD44] hover:bg-[#FFBB00] transition-all duration-200 text-sm"
        >
          🎬 导出GIF
        </motion.button>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        <div className="w-96 bg-[#252525] border-r-4 border-[#333] flex flex-col">
          <div className="p-4 border-b-2 border-[#333]">
            <h2 className="text-sm mb-3 text-[#4A90D9]">🎨 画笔颜色</h2>
            <div className="flex gap-2">
              {BRUSH_COLORS.map((c) => (
                <motion.button
                  key={c.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedColor(c.id)}
                  className={`w-10 h-10 border-4 transition-all duration-200 ${
                    selectedColor === c.id
                      ? 'border-white scale-110'
                      : 'border-[#555]'
                  }`}
                  style={{ backgroundColor: c.color }}
                />
              ))}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedColor(0)}
                className={`w-10 h-10 border-4 bg-[#1A1A1A] transition-all duration-200 ${
                  selectedColor === 0
                    ? 'border-white scale-110'
                    : 'border-[#555]'
                }`}
              >
                🗑️
              </motion.button>
            </div>
          </div>

          <div className="p-4 border-b-2 border-[#333] flex flex-col items-center">
            <h2 className="text-sm mb-3 text-[#4A90D9] self-start">✏️ 绘图画布</h2>
            <div
              className="border-4 border-[#444] cursor-crosshair"
              style={{
                width: CANVAS_DISPLAY_WIDTH,
                height: CANVAS_DISPLAY_HEIGHT,
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_DISPLAY_WIDTH}
                height={CANVAS_DISPLAY_HEIGHT}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                className="block"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={clearCanvas}
                className="px-4 py-2 bg-[#555] border-2 border-[#777] hover:bg-[#666] transition-all duration-200 text-sm"
              >
                清空
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addFrame}
                className="px-4 py-2 bg-[#6DBF6B] border-2 border-[#8DDF8B] hover:bg-[#5DAF5B] transition-all duration-200 text-sm"
              >
                ➕ 添加帧
              </motion.button>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm text-[#4A90D9]">📚 动作库</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={addNewAction}
                className="w-8 h-8 bg-[#4A90D9] border-2 border-[#6AB0F9] text-sm"
              >
                +
              </motion.button>
            </div>
            <div className="space-y-2">
              {actions.map((action) => (
                <motion.div
                  key={action.id}
                  draggable
                  onDragStart={() => handleActionDragStart(action)}
                  onClick={() => setCurrentActionId(action.id)}
                  className={`p-3 border-2 cursor-grab transition-all duration-200 ${
                    currentActionId === action.id
                      ? 'border-[#4A90D9] bg-[#2A2A4A]'
                      : 'border-[#444] bg-[#2A2A2A] hover:border-[#666]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={action.name}
                      onChange={(e) => handleActionNameChange(action.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-transparent border-b border-[#555] focus:border-[#4A90D9] outline-none text-sm"
                    />
                    <select
                      value={action.characterType}
                      onChange={(e) =>
                        handleActionTypeChange(
                          action.id,
                          e.target.value as CharacterType
                        )
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#1A1A1A] border border-[#555] text-xs px-2 py-1"
                    >
                      <option value="player">玩家</option>
                      <option value="enemy">敌人</option>
                      <option value="item">道具</option>
                    </select>
                  </div>
                  {currentActionId === action.id && (
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-[#1A1A1A] border border-[#333]">
                      {action.frames.map((frame, index) => (
                        <motion.div
                          key={frame.id}
                          draggable
                          onDragStart={() => handleFrameDragStart(index)}
                          onDragOver={(e) => handleFrameDragOver(e, index)}
                          onDragEnd={handleFrameDragEnd}
                          whileHover={{ scale: 1.1 }}
                          className="relative group cursor-grab"
                          style={{
                            width: THUMBNAIL_SIZE,
                            height: THUMBNAIL_SIZE,
                            borderRadius: 4,
                            overflow: 'hidden',
                            transition: 'transform 0.2s',
                          }}
                        >
                          <img
                            src={frameToDataURL(frame, 1)}
                            alt={`帧 ${index + 1}`}
                            className="w-full h-full object-contain bg-[#1A1A1A]"
                            style={{ imageRendering: 'pixelated' }}
                          />
                          <div className="absolute top-1 left-1 bg-black/70 text-xs px-1 rounded">
                            {index + 1}
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateFrame(frame);
                              }}
                              className="w-6 h-6 bg-[#4A90D9] text-xs"
                            >
                              📋
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFrame(frame.id);
                              }}
                              className="w-6 h-6 bg-[#D94A4A] text-xs"
                            >
                              🗑️
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-[#888] mt-2">
                    {action.frames.length} 帧 · 拖拽到时间轴
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b-2 border-[#333] flex justify-center">
            <div
              className="border-4 border-[#444]"
              style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT }}
            >
              <canvas
                ref={stageCanvasRef}
                width={STAGE_WIDTH}
                height={STAGE_HEIGHT}
                className="block"
              />
            </div>
          </div>

          <div className="px-4 py-3 border-b-2 border-[#333] flex items-center gap-4">
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={playerState.isPlaying ? handlePause : handlePlay}
                className="px-4 py-2 bg-[#4A90D9] border-2 border-[#6AB0F9] hover:bg-[#3A80C9] transition-all duration-200"
              >
                {playerState.isPlaying ? '⏸️ 暂停' : '▶️ 播放'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStop}
                className="px-4 py-2 bg-[#555] border-2 border-[#777] hover:bg-[#666] transition-all duration-200"
              >
                ⏹️ 停止
              </motion.button>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-[#888]">帧: {playerState.currentFrame + 1}/{playerState.totalFrames}</span>
              <input
                type="range"
                min={0}
                max={Math.max(playerState.totalFrames - 1, 0)}
                value={playerState.currentFrame}
                onChange={(e) => handleSeek(parseInt(e.target.value))}
                className="flex-1 h-2 bg-[#333] appearance-none cursor-pointer"
                style={{
                  accentColor: '#4A90D9',
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#888]">FPS:</span>
              <select
                value={fps}
                onChange={(e) => handleFpsChange(parseInt(e.target.value))}
                className="bg-[#1A1A1A] border-2 border-[#444] px-2 py-1 text-sm focus:border-[#4A90D9] outline-none"
              >
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
              </select>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b-2 border-[#333] flex items-center gap-2">
              <h2 className="text-sm text-[#4A90D9]">⏱️ 时间轴</h2>
              <div className="flex gap-2 ml-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addTrack('player')}
                  className="px-3 py-1 text-xs border-2 transition-all duration-200"
                  style={{
                    backgroundColor: CHARACTER_COLORS.player + '33',
                    borderColor: CHARACTER_COLORS.player,
                  }}
                >
                  + 玩家轨道
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addTrack('enemy')}
                  className="px-3 py-1 text-xs border-2 transition-all duration-200"
                  style={{
                    backgroundColor: CHARACTER_COLORS.enemy + '33',
                    borderColor: CHARACTER_COLORS.enemy,
                  }}
                >
                  + 敌人轨道
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => addTrack('item')}
                  className="px-3 py-1 text-xs border-2 transition-all duration-200"
                  style={{
                    backgroundColor: CHARACTER_COLORS.item + '33',
                    borderColor: CHARACTER_COLORS.item,
                  }}
                >
                  + 道具轨道
                </motion.button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="min-w-[1200px]">
                <div className="flex border-b-2 border-[#333] sticky top-0 bg-[#252525] z-10">
                  <div className="w-32 flex-shrink-0 border-r-2 border-[#333]" />
                  <div className="flex-1 relative h-6">
                    {Array.from({ length: 60 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 text-[10px] text-[#666]"
                        style={{ left: i * 20 }}
                      >
                        {i % 5 === 0 ? i : ''}
                      </div>
                    ))}
                  </div>
                </div>
                {tracks.map((track) => (
                  <div
                    key={track.id}
                    className="flex border-b border-[#333]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleTrackDrop(e, track.id)}
                  >
                    <div
                      className="w-32 flex-shrink-0 border-r-2 border-[#333] flex items-center px-3"
                      style={{
                        height: TRACK_HEIGHT,
                        backgroundColor: CHARACTER_COLORS[track.characterType] + '22',
                      }}
                    >
                      <span className="text-xs truncate" style={{ color: CHARACTER_COLORS[track.characterType] }}>
                        {track.name}
                      </span>
                    </div>
                    <div
                      className="flex-1 relative"
                      style={{ height: TRACK_HEIGHT, minWidth: 1200 }}
                    >
                      {track.clips.map((clip) => {
                        const action = actions.find((a) => a.id === clip.actionId);
                        if (!action) return null;
                        return (
                          <motion.div
                            key={clip.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute top-1 bottom-1 flex items-center px-2 cursor-move group"
                            style={{
                              left: clip.startFrame * 20,
                              width: clip.duration * 20,
                              backgroundColor: CHARACTER_COLORS[action.characterType],
                              borderRadius: 2,
                            }}
                          >
                            <span className="text-xs truncate text-[#1A1A1A]">
                              {action.name}
                            </span>
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 transition-colors duration-200"
                              onMouseDown={(e) =>
                                handleClipResizeStart(e, track.id, clip.id, 'left')
                              }
                            />
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/30 transition-colors duration-200"
                              onMouseDown={(e) =>
                                handleClipResizeStart(e, track.id, clip.id, 'right')
                              }
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClip(track.id, clip.id);
                              }}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-[#D94A4A] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full"
                            >
                              ×
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 border-4 border-[#4A90D9] border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-lg mb-2">正在生成GIF...</p>
              <div className="w-64 h-2 bg-[#333] overflow-hidden">
                <motion.div
                  className="h-full bg-[#4A90D9]"
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-sm text-[#888] mt-2">{Math.round(exportProgress * 100)}%</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#252525] border-4 border-[#4A90D9] p-6 w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg mb-4 text-[#4A90D9]">🎬 导出GIF</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2 text-[#888]">帧率</label>
                  <select
                    value={exportFps}
                    onChange={(e) => setExportFps(parseInt(e.target.value) as 8 | 12 | 24)}
                    className="w-full bg-[#1A1A1A] border-2 border-[#444] px-3 py-2 focus:border-[#4A90D9] outline-none"
                  >
                    <option value={8}>8 fps</option>
                    <option value={12}>12 fps</option>
                    <option value={24}>24 fps</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2 text-[#888]">循环次数</label>
                  <select
                    value={exportLoop}
                    onChange={(e) => setExportLoop(parseInt(e.target.value))}
                    className="w-full bg-[#1A1A1A] border-2 border-[#444] px-3 py-2 focus:border-[#4A90D9] outline-none"
                  >
                    <option value={0}>∞ 无限循环</option>
                    <option value={1}>1 次</option>
                    <option value={2}>2 次</option>
                    <option value={3}>3 次</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowExportModal(false)}
                    className="flex-1 px-4 py-2 bg-[#555] border-2 border-[#777] hover:bg-[#666] transition-all duration-200"
                  >
                    取消
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExportGIF}
                    className="flex-1 px-4 py-2 bg-[#FFCC00] text-[#1A1A1A] border-2 border-[#FFDD44] hover:bg-[#FFBB00] transition-all duration-200"
                  >
                    导出
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Editor;
