import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from './components/Canvas';
import { ToolPanel } from './components/ToolPanel';
import { MobileToolbar } from './components/MobileToolbar';
import { Leaderboard } from './components/Leaderboard';
import { TimeTravel } from './components/TimeTravel';
import { NotificationBanner } from './components/NotificationBanner';
import { useCanvasHistory } from './hooks/useCanvasHistory';
import { useToolState } from './hooks/useToolState';
import { canvasApi } from './api/canvasApi';
import type { LineData, SnapshotData } from './types';

interface Notification {
  id: string;
  message: string;
  userId: string;
  lineCount: number;
}

const App: React.FC = () => {
  const {
    history,
    addLine,
    undo,
    redo,
    canUndo,
    canRedo,
    isUndoing,
    isRedoing,
    publishToServer,
    getCurrentLines,
  } = useCanvasHistory();

  const { toolState, setColorFromHSL, setBrushSize } = useToolState();

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [serverLines, setServerLines] = useState<LineData[]>([]);
  const [firstPublishTime, setFirstPublishTime] = useState<number>(
    Math.floor(Date.now() / 1000) - 3600
  );
  const [isPublishing, setIsPublishing] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isTimeTravelMode, setIsTimeTravelMode] = useState(false);
  const [timeTravelLines, setTimeTravelLines] = useState<LineData[]>([]);
  const [_timeTravelStats, setTimeTravelStats] = useState<SnapshotData | null>(null);
  const lastCheckRef = useRef<number>(Math.floor(Date.now() / 1000));
  const notifIdRef = useRef(0);

  const localLines = getCurrentLines();

  useEffect(() => {
    const loadInitialLines = async () => {
      try {
        const result = await canvasApi.getLines(1000);
        setServerLines(result.lines);
        setFirstPublishTime(result.first_time);
        lastCheckRef.current = Math.floor(Date.now() / 1000);
      } catch (e) {
        console.error('Failed to load lines:', e);
      }
    };

    loadInitialLines();
  }, []);

  useEffect(() => {
    if (isTimeTravelMode) return;

    const interval = setInterval(async () => {
      try {
        const result = await canvasApi.getNewLines(lastCheckRef.current);
        if (result.count > 0) {
          setServerLines((prev) => [...prev, ...result.lines]);

          const userLines: { [key: string]: number } = {};
          result.lines.forEach((line) => {
            userLines[line.user_id] = (userLines[line.user_id] || 0) + 1;
          });

          Object.entries(userLines).forEach(([userId, count]) => {
            notifIdRef.current += 1;
            setNotifications((prev) => [
              ...prev,
              {
                id: `notif-${notifIdRef.current}`,
                message: '发布了新线条',
                userId,
                lineCount: count,
              },
            ]);
          });

          lastCheckRef.current = Math.floor(Date.now() / 1000);
        }
      } catch (e) {
        console.error('Failed to check new lines:', e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isTimeTravelMode]);

  const handleLineComplete = useCallback(
    (line: { points: any[]; color: string; size: number }) => {
      if (!isTimeTravelMode) {
        addLine(line);
      }
    },
    [addLine, isTimeTravelMode]
  );

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      const result = await publishToServer();
      if (result?.success) {
        setServerLines((prev) => [...prev, ...result.lines]);
        lastCheckRef.current = Math.floor(Date.now() / 1000);

        notifIdRef.current += 1;
        setNotifications((prev) => [
          ...prev,
          {
            id: `notif-${notifIdRef.current}`,
            message: '发布成功！',
            userId: result.user_id,
            lineCount: result.count,
          },
        ]);
      }
    } catch (e) {
      console.error('Publish failed:', e);
    } finally {
      setIsPublishing(false);
    }
  }, [publishToServer]);

  const handleLikeLine = useCallback(async (lineId: string) => {
    try {
      const result = await canvasApi.likeLine(lineId);
      if (result.success) {
        setServerLines((prev) =>
          prev.map((line) =>
            line.id === lineId ? { ...line, likes: result.likes } : line
          )
        );
      }
    } catch (e) {
      console.error('Like failed:', e);
    }
  }, []);

  const handleDismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleTimeChange = useCallback(
    (lines: LineData[] | null, stats: SnapshotData | null) => {
      if (lines !== null) {
        setIsTimeTravelMode(true);
        setTimeTravelLines(lines);
        setTimeTravelStats(stats);
      } else {
        setIsTimeTravelMode(false);
        setTimeTravelLines([]);
        setTimeTravelStats(null);
      }
    },
    []
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        color={toolState.color}
        brushSize={toolState.brushSize}
        localLines={localLines}
        onLineComplete={handleLineComplete}
        serverLines={serverLines}
        onLikeLine={handleLikeLine}
        isTimeTravelMode={isTimeTravelMode}
        timeTravelLines={timeTravelLines}
      />

      {!isMobile && (
        <ToolPanel
          color={toolState.color}
          hue={toolState.hue}
          saturation={toolState.saturation}
          lightness={toolState.lightness}
          brushSize={toolState.brushSize}
          canUndo={canUndo}
          canRedo={canRedo}
          isUndoing={isUndoing}
          isRedoing={isRedoing}
          onColorChange={setColorFromHSL}
          onBrushSizeChange={setBrushSize}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      )}

      {isMobile && (
        <MobileToolbar
          color={toolState.color}
          hue={toolState.hue}
          saturation={toolState.saturation}
          lightness={toolState.lightness}
          brushSize={toolState.brushSize}
          canUndo={canUndo}
          canRedo={canRedo}
          isUndoing={isUndoing}
          isRedoing={isRedoing}
          onColorChange={setColorFromHSL}
          onBrushSizeChange={setBrushSize}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onPublish={handlePublish}
          isPublishing={isPublishing}
        />
      )}

      <Leaderboard />

      <TimeTravel firstTime={firstPublishTime} onTimeChange={handleTimeChange} />

      <NotificationBanner
        notifications={notifications}
        onDismiss={handleDismissNotification}
      />

      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: 24,
            fontSize: 11,
            color: 'rgba(93, 78, 55, 0.6)',
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          <div>🖱️ 滚轮缩放 | 拖动平移 | 点击线条点赞</div>
          <div style={{ marginTop: 4 }}>本地绘制: {history.length} 条 | 公共: {serverLines.length} 条</div>
        </div>
      )}
    </div>
  );
};

export default App;
