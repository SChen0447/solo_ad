import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { ProcessedImageData } from './imageProcessor';
import { calculateStrokeAccuracy, getStrokeColorByAccuracy } from './imageProcessor';
import { Recorder, Player, type Stroke, type RecordingData } from './recorder';

export interface DrawingCanvasHandle {
  clear: () => void;
  getRecorder: () => Recorder;
  getPlayer: () => Player;
  startRecording: () => void;
  stopRecording: () => RecordingData | null;
  playRecording: (data: RecordingData) => void;
  pausePlayback: () => void;
  stopPlayback: () => void;
  setPlaybackSpeed: (speed: 0.5 | 1 | 2) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekPlayback: (time: number) => void;
  isPlaying: () => boolean;
}

interface DrawingCanvasProps {
  processedImage: ProcessedImageData | null;
  brushColor: string;
  brushSize: number;
  tool: 'brush' | 'eraser';
  onAccuracyChange: (accuracy: number) => void;
  onCursorMove?: (x: number, y: number) => void;
  onZoomChange?: (zoom: number) => void;
  isPlaybackMode?: boolean;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle, DrawingCanvasProps>((
  { processedImage, brushColor, brushSize, tool, onAccuracyChange, onCursorMove, onZoomChange, isPlaybackMode = false },
  ref
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const edgeCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const feedbackCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const allStrokesRef = useRef<{ points: { x: number; y: number }[]; color: string; width: number; feedbackColor: string }[]>([]);
  const totalAccuracyRef = useRef(0);
  const totalPixelsRef = useRef(0);
  const totalCoveredRef = useRef(0);
  
  const recorderRef = useRef<Recorder>(new Recorder());
  const playerRef = useRef<Player>(new Player());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPosRef = useRef({ x: 0, y: 0 });
  
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / zoom;
    const y = (clientY - rect.top - offset.y) / zoom;
    
    return { x, y };
  }, [zoom, offset]);

  const redrawAllStrokes = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !processedImage) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (const stroke of allStrokesRef.current) {
      if (stroke.points.length < 2) continue;
      
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [processedImage]);

  const redrawFeedback = useCallback(() => {
    const canvas = feedbackCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !processedImage) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (const stroke of allStrokesRef.current) {
      if (stroke.points.length < 2) continue;
      
      ctx.strokeStyle = stroke.feedbackColor;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [processedImage]);

  const updateAccuracy = useCallback(() => {
    const accuracy = totalPixelsRef.current > 0 ? totalCoveredRef.current / totalPixelsRef.current : 0;
    totalAccuracyRef.current = accuracy;
    onAccuracyChange(accuracy);
  }, [onAccuracyChange]);

  const startDrawing = useCallback((x: number, y: number) => {
    if (!processedImage || isPlaybackMode) return;
    
    isDrawingRef.current = true;
    currentStrokeRef.current = [{ x, y }];
    
    if (recorderRef.current.getIsRecording()) {
      recorderRef.current.beginStroke(brushColor, brushSize);
      recorderRef.current.addPoint(x, y);
    }
  }, [processedImage, brushColor, brushSize, isPlaybackMode]);

  const draw = useCallback((x: number, y: number) => {
    if (!isDrawingRef.current || !processedImage) return;
    
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    currentStrokeRef.current.push({ x, y });
    
    const points = currentStrokeRef.current;
    if (points.length < 2) return;
    
    ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    
    if (recorderRef.current.getIsRecording()) {
      recorderRef.current.addPoint(x, y);
    }
  }, [processedImage, brushColor, brushSize, tool]);

  const endDrawing = useCallback(() => {
    if (!isDrawingRef.current || !processedImage) return;
    
    isDrawingRef.current = false;
    
    if (currentStrokeRef.current.length < 2) {
      currentStrokeRef.current = [];
      return;
    }
    
    const { accuracy, coveredPixels, totalPixels } = calculateStrokeAccuracy(
      processedImage.edgeImageData,
      currentStrokeRef.current,
      brushSize,
      processedImage.width,
      processedImage.height
    );
    
    const feedbackColor = getStrokeColorByAccuracy(accuracy);
    
    allStrokesRef.current.push({
      points: [...currentStrokeRef.current],
      color: tool === 'eraser' ? '#FFFFFF' : brushColor,
      width: brushSize,
      feedbackColor
    });
    
    totalCoveredRef.current += coveredPixels;
    totalPixelsRef.current += totalPixels;
    
    redrawFeedback();
    updateAccuracy();
    
    if (recorderRef.current.getIsRecording()) {
      recorderRef.current.endStroke();
    }
    
    currentStrokeRef.current = [];
  }, [processedImage, brushColor, brushSize, tool, redrawFeedback, updateAccuracy]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    startDrawing(x, y);
  }, [getCanvasCoords, startDrawing]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCanvasCoords(e.clientX, e.clientY);
    onCursorMove?.(x, y);
    
    if (isPanning) {
      const dx = e.clientX - lastPanPosRef.current.x;
      const dy = e.clientY - lastPanPosRef.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    
    draw(x, y);
  }, [getCanvasCoords, draw, isPanning, onCursorMove]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    endDrawing();
  }, [endDrawing, isPanning]);

  const handleMouseLeave = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    endDrawing();
  }, [endDrawing, isPanning]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * delta));
    
    const rect = drawCanvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const scaleRatio = newZoom / zoom;
      const newOffsetX = mouseX - (mouseX - offset.x) * scaleRatio;
      const newOffsetY = mouseY - (mouseY - offset.y) * scaleRatio;
      
      setOffset({ x: newOffsetX, y: newOffsetY });
    }
    
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [zoom, offset, onZoomChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
      startDrawing(x, y);
    }
  }, [getCanvasCoords, startDrawing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
      onCursorMove?.(x, y);
      draw(x, y);
    }
  }, [getCanvasCoords, draw, onCursorMove]);

  const handleTouchEnd = useCallback(() => {
    endDrawing();
  }, [endDrawing]);

  useEffect(() => {
    if (!processedImage || !bgCanvasRef.current || !edgeCanvasRef.current) return;
    
    const { width, height } = processedImage;
    setCanvasSize({ width, height });
    
    [bgCanvasRef, edgeCanvasRef, drawCanvasRef, feedbackCanvasRef].forEach(ref => {
      if (ref.current) {
        ref.current.width = width;
        ref.current.height = height;
      }
    });
    
    const bgCtx = bgCanvasRef.current.getContext('2d')!;
    bgCtx.clearRect(0, 0, width, height);
    bgCtx.drawImage(processedImage.tracingPaperCanvas, 0, 0);
    
    const edgeCtx = edgeCanvasRef.current.getContext('2d')!;
    edgeCtx.clearRect(0, 0, width, height);
    edgeCtx.drawImage(processedImage.edgeCanvas, 0, 0);
    
    allStrokesRef.current = [];
    totalAccuracyRef.current = 0;
    totalPixelsRef.current = 0;
    totalCoveredRef.current = 0;
    onAccuracyChange(0);
    
    redrawAllStrokes();
    redrawFeedback();
    
    const container = containerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const scaleX = containerRect.width / width;
      const scaleY = containerRect.height / height;
      const fitScale = Math.min(scaleX, scaleY, 1);
      
      setZoom(fitScale);
      setOffset({
        x: (containerRect.width - width * fitScale) / 2,
        y: (containerRect.height - height * fitScale) / 2
      });
      onZoomChange?.(fitScale);
    }
  }, [processedImage, redrawAllStrokes, redrawFeedback, onAccuracyChange, onZoomChange]);

  useEffect(() => {
    const player = playerRef.current;
    
    player.setOnUpdate((time, strokes) => {
      setPlaybackTime(time);
      
      const canvas = drawCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      const feedbackCanvas = feedbackCanvasRef.current;
      const feedbackCtx = feedbackCanvas?.getContext('2d');
      
      if (!canvas || !ctx || !feedbackCanvas || !feedbackCtx || !processedImage) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      feedbackCtx.clearRect(0, 0, feedbackCanvas.width, feedbackCanvas.height);
      
      for (const stroke of strokes) {
        if (stroke.points.length < 2) continue;
        
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    });
    
    player.setOnEnd(() => {
      setIsPlaying(false);
    });
    
    return () => {
      player.destroy();
    };
  }, [processedImage]);

  useImperativeHandle(ref, () => ({
    clear: () => {
      allStrokesRef.current = [];
      totalAccuracyRef.current = 0;
      totalPixelsRef.current = 0;
      totalCoveredRef.current = 0;
      onAccuracyChange(0);
      redrawAllStrokes();
      redrawFeedback();
    },
    getRecorder: () => recorderRef.current,
    getPlayer: () => playerRef.current,
    startRecording: () => {
      recorderRef.current.startRecording();
    },
    stopRecording: () => {
      const data = recorderRef.current.stopRecording();
      return data.strokes.length > 0 ? data : null;
    },
    playRecording: (data: RecordingData) => {
      playerRef.current.setRecording(data);
      setPlaybackDuration(playerRef.current.getScaledDuration());
      playerRef.current.play();
      setIsPlaying(true);
    },
    pausePlayback: () => {
      playerRef.current.pause();
      setIsPlaying(false);
    },
    stopPlayback: () => {
      playerRef.current.stop();
      setIsPlaying(false);
      setPlaybackTime(0);
    },
    setPlaybackSpeed: (speed: 0.5 | 1 | 2) => {
      playerRef.current.setSpeed(speed);
    },
    getCurrentTime: () => playbackTime,
    getDuration: () => playbackDuration,
    seekPlayback: (time: number) => {
      playerRef.current.seek(time);
      setPlaybackTime(time);
    },
    isPlaying: () => isPlaying
  }));

  if (!processedImage) {
    return (
      <div ref={containerRef} style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB'
      }}>
        <p style={{ color: '#9CA3AF', fontSize: 14 }}>请上传一张建筑照片开始描摹练习</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#F3F4F6',
        cursor: isPanning ? 'grabbing' : (tool === 'eraser' ? 'cell' : 'crosshair')
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}
      >
        <canvas
          ref={bgCanvasRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            pointerEvents: 'none'
          }}
        />
        <canvas
          ref={edgeCanvasRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            pointerEvents: 'none',
            opacity: 0.9
          }}
        />
        <canvas
          ref={feedbackCanvasRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            pointerEvents: 'none'
          }}
        />
        <canvas
          ref={drawCanvasRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: canvasSize.width,
            height: canvasSize.height,
            pointerEvents: 'none'
          }}
        />
      </div>
    </div>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
