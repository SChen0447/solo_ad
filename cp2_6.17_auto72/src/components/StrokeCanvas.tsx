import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { HanziData, Point } from '../data/hanziData';

interface StrokeCanvasProps {
  hanziData: HanziData;
  currentStrokeIndex: number;
  strokeProgress: number;
}

export interface StrokeCanvasRef {
  redraw: () => void;
}

const CANVAS_SIZE = 500;
const COORD_RANGE = 100;
const SCALE = CANVAS_SIZE / COORD_RANGE;
const BG_COLOR = '#f5e6c8';
const STROKE_COLOR = '#000000';
const FINISHED_OPACITY = 0.4;
const CURRENT_OPACITY = 1.0;
const STROKE_WIDTH = 4;
const START_DOT_COLOR = '#e53935';
const END_DOT_COLOR = '#43a047';
const DOT_RADIUS = 3;
const NUMBER_COLOR = '#8B4513';

const coordToCanvas = (p: Point): Point => ({
  x: p.x * SCALE,
  y: p.y * SCALE,
});

const lerpPoint = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const getPointOnPath = (points: Point[], progress: number): Point => {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  if (progress <= 0) return points[0];
  if (progress >= 1) return points[points.length - 1];

  const totalSegments = points.length - 1;
  const segmentProgress = progress * totalSegments;
  const segmentIndex = Math.floor(segmentProgress);
  const localT = segmentProgress - segmentIndex;

  const clampedIndex = Math.min(segmentIndex, totalSegments - 1);
  return lerpPoint(points[clampedIndex], points[clampedIndex + 1], localT);
};

const StrokeCanvas = forwardRef<StrokeCanvasRef, StrokeCanvasProps>(({ hanziData, currentStrokeIndex, strokeProgress }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const drawCompletedStrokes = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.globalAlpha = FINISHED_OPACITY;
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < currentStrokeIndex; i++) {
      const stroke = hanziData.strokes[i];
      if (!stroke || stroke.points.length < 2) continue;

      const canvasPoints = stroke.points.map(coordToCanvas);
      ctx.beginPath();
      ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
      for (let j = 1; j < canvasPoints.length; j++) {
        ctx.lineTo(canvasPoints[j].x, canvasPoints[j].y);
      }
      ctx.stroke();

      const startPt = canvasPoints[0];
      ctx.fillStyle = START_DOT_COLOR;
      ctx.globalAlpha = FINISHED_OPACITY * 0.7;
      ctx.beginPath();
      ctx.arc(startPt.x, startPt.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = FINISHED_OPACITY;
      ctx.fillStyle = STROKE_COLOR;
    }
    ctx.restore();
  }, [hanziData, currentStrokeIndex]);

  const drawCurrentStroke = useCallback((ctx: CanvasRenderingContext2D) => {
    const stroke = hanziData.strokes[currentStrokeIndex];
    if (!stroke || stroke.points.length < 2) return;

    const canvasPoints = stroke.points.map(coordToCanvas);
    const progress = Math.max(0, Math.min(1, strokeProgress));

    ctx.save();
    ctx.globalAlpha = CURRENT_OPACITY;
    ctx.strokeStyle = STROKE_COLOR;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const totalSegments = canvasPoints.length - 1;
    const segmentProgress = progress * totalSegments;
    const fullSegments = Math.floor(segmentProgress);
    const localT = segmentProgress - fullSegments;

    ctx.beginPath();
    ctx.moveTo(canvasPoints[0].x, canvasPoints[0].y);

    for (let j = 1; j <= fullSegments && j < canvasPoints.length; j++) {
      ctx.lineTo(canvasPoints[j].x, canvasPoints[j].y);
    }

    if (fullSegments < totalSegments) {
      const interpPt = lerpPoint(canvasPoints[fullSegments], canvasPoints[fullSegments + 1], localT);
      ctx.lineTo(interpPt.x, interpPt.y);
    }

    ctx.stroke();

    const startPt = canvasPoints[0];
    ctx.fillStyle = START_DOT_COLOR;
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, DOT_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    if (progress >= 1) {
      const endPt = canvasPoints[canvasPoints.length - 1];
      ctx.fillStyle = END_DOT_COLOR;
      ctx.beginPath();
      ctx.arc(endPt.x, endPt.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const currentEnd = getPointOnPath(canvasPoints, progress);
      ctx.fillStyle = END_DOT_COLOR;
      ctx.beginPath();
      ctx.arc(currentEnd.x, currentEnd.y, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }, [hanziData, currentStrokeIndex, strokeProgress]);

  const drawStrokeNumbers = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.fillStyle = NUMBER_COLOR;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < currentStrokeIndex; i++) {
      const stroke = hanziData.strokes[i];
      if (!stroke || stroke.points.length === 0) continue;

      const startPt = coordToCanvas(stroke.points[0]);
      const offsetX = startPt.x < 30 ? 12 : -12;
      const offsetY = startPt.y < 30 ? 12 : -12;

      ctx.fillText(String(i + 1), startPt.x + offsetX, startPt.y + offsetY);
    }

    if (currentStrokeIndex < hanziData.strokes.length) {
      const stroke = hanziData.strokes[currentStrokeIndex];
      if (stroke && stroke.points.length > 0) {
        const startPt = coordToCanvas(stroke.points[0]);
        const offsetX = startPt.x < 30 ? 12 : -12;
        const offsetY = startPt.y < 30 ? 12 : -12;

        ctx.font = 'bold 14px Arial';
        ctx.fillText(String(currentStrokeIndex + 1), startPt.x + offsetX, startPt.y + offsetY);
      }
    }

    ctx.restore();
  }, [hanziData, currentStrokeIndex]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_SIZE * dpr || canvas.height !== CANVAS_SIZE * dpr) {
      canvas.width = CANVAS_SIZE * dpr;
      canvas.height = CANVAS_SIZE * dpr;
      canvas.style.width = `${CANVAS_SIZE}px`;
      canvas.style.height = `${CANVAS_SIZE}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    drawCompletedStrokes(ctx);
    drawCurrentStroke(ctx);
    drawStrokeNumbers(ctx);
  }, [drawCompletedStrokes, drawCurrentStroke, drawStrokeNumbers]);

  useImperativeHandle(ref, () => ({
    redraw: render,
  }));

  useEffect(() => {
    const animate = () => {
      render();
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [render]);

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        className="stroke-canvas"
        style={{ width: `${CANVAS_SIZE}px`, height: `${CANVAS_SIZE}px` }}
      />
    </div>
  );
});

StrokeCanvas.displayName = 'StrokeCanvas';

export default React.memo(StrokeCanvas);
