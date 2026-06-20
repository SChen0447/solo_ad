export interface Point {
  x: number;
  y: number;
}

export interface TrackData {
  controlPoints: Point[];
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const GRID_SPACING = 40;
const GRID_COLOR = '#ddd';
const GRID_LINE_WIDTH = 1;
const CONTROL_POINT_RADIUS = 6;
const CONTROL_POINT_FILL = '#ffffff';
const CONTROL_POINT_STROKE = '#4a90d9';
const SELECTED_GLOW = 'rgba(74, 144, 217, 0.6)';
const TRACK_WIDTH = 30;
const TRACK_INNER_COLOR = '#2c3e50';
const TRACK_OUTER_COLOR = '#e74c3c';
const MAX_UNDO = 10;

export class TrackEditor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private controlPoints: Point[] = [];
  private history: Point[][] = [];
  private selectedPointIndex: number | null = null;
  private isDragging = false;
  private dragOffset: Point = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.bindEvents();
    this.render();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedIndex = this.findPointAt(x, y);
    if (clickedIndex !== -1) {
      this.selectedPointIndex = clickedIndex;
      this.isDragging = true;
      this.dragOffset = {
        x: x - this.controlPoints[clickedIndex].x,
        y: y - this.controlPoints[clickedIndex].y
      };
    } else {
      this.saveHistory();
      this.controlPoints.push({ x, y });
      this.selectedPointIndex = this.controlPoints.length - 1;
    }
    this.render();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging || this.selectedPointIndex === null) return;

    const rect = this.canvas.getBoundingClientRect();
    let x = e.clientX - rect.left - this.dragOffset.x;
    let y = e.clientY - rect.top - this.dragOffset.y;

    x = Math.max(0, Math.min(CANVAS_WIDTH, x));
    y = Math.max(0, Math.min(CANVAS_HEIGHT, y));

    this.controlPoints[this.selectedPointIndex] = { x, y };
    this.render();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private findPointAt(x: number, y: number): number {
    for (let i = this.controlPoints.length - 1; i >= 0; i--) {
      const p = this.controlPoints[i];
      const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      if (dist <= CONTROL_POINT_RADIUS + 4) {
        return i;
      }
    }
    return -1;
  }

  private saveHistory(): void {
    this.history.push([...this.controlPoints]);
    if (this.history.length > MAX_UNDO) {
      this.history.shift();
    }
  }

  undo(): void {
    if (this.history.length > 0) {
      this.controlPoints = this.history.pop()!;
      this.selectedPointIndex = null;
      this.render();
    }
  }

  clear(): void {
    if (this.controlPoints.length === 0) return;
    this.saveHistory();
    this.controlPoints = [];
    this.selectedPointIndex = null;
    this.render();
  }

  getControlPoints(): Point[] {
    return [...this.controlPoints];
  }

  setControlPoints(points: Point[]): void {
    this.saveHistory();
    this.controlPoints = [...points];
    this.selectedPointIndex = null;
    this.render();
  }

  getTrackData(): TrackData {
    return {
      controlPoints: this.getControlPoints()
    };
  }

  getTrackDataJSON(): string {
    return JSON.stringify(this.getTrackData());
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  hasValidTrack(): boolean {
    return this.controlPoints.length >= 3;
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawGrid();
    this.drawTrack();
    this.drawControlPoints();
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = GRID_LINE_WIDTH;

    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  }

  private drawTrack(): void {
    if (this.controlPoints.length < 2) return;

    const ctx = this.ctx;
    const pathPoints = this.generateSmoothPath();

    if (pathPoints.length < 2) return;

    this.drawTrackPath(pathPoints, TRACK_OUTER_COLOR, TRACK_WIDTH);
    this.drawTrackPath(pathPoints, TRACK_INNER_COLOR, TRACK_WIDTH * 0.7);
    this.drawKerbs(pathPoints);
  }

  private drawTrackPath(points: Point[], color: string, width: number): void {
    if (points.length < 2) return;
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    if (this.controlPoints.length >= 3) {
      ctx.closePath();
    }
    ctx.stroke();
  }

  private drawKerbs(points: Point[]): void {
    if (points.length < 3) return;
    const ctx = this.ctx;
    const halfWidth = TRACK_WIDTH / 2;
    const stripeLength = 8;
    const stripeSpacing = 16;

    let distance = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen === 0) continue;

      const nx = -dy / segLen;
      const ny = dx / segLen;

      let t = 0;
      while (t < segLen) {
        const tt = t / segLen;
        const px = p1.x + dx * tt;
        const py = p1.y + dy * tt;

        const isRed = Math.floor((distance + t) / stripeSpacing) % 2 === 0;
        const color = isRed ? '#e74c3c' : '#ffffff';

        ctx.fillStyle = color;

        const innerX = px + nx * (halfWidth - 3);
        const innerY = py + ny * (halfWidth - 3);
        const outerX = px - nx * (halfWidth - 3);
        const outerY = py - ny * (halfWidth - 3);

        ctx.fillRect(innerX - 2, innerY - 2, 4, 4);
        ctx.fillRect(outerX - 2, outerY - 2, 4, 4);

        t += stripeSpacing;
      }
      distance += segLen;
    }
  }

  private drawControlPoints(): void {
    const ctx = this.ctx;

    for (let i = 0; i < this.controlPoints.length; i++) {
      const p = this.controlPoints[i];
      const isSelected = i === this.selectedPointIndex;

      if (isSelected) {
        ctx.shadowColor = SELECTED_GLOW;
        ctx.shadowBlur = 15;
      }

      ctx.fillStyle = CONTROL_POINT_FILL;
      ctx.strokeStyle = CONTROL_POINT_STROKE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CONTROL_POINT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
    }

    if (this.controlPoints.length >= 2) {
      ctx.strokeStyle = 'rgba(74, 144, 217, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.controlPoints[0].x, this.controlPoints[0].y);
      for (let i = 1; i < this.controlPoints.length; i++) {
        ctx.lineTo(this.controlPoints[i].x, this.controlPoints[i].y);
      }
      if (this.controlPoints.length >= 3) {
        ctx.closePath();
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private generateSmoothPath(): Point[] {
    const points = this.controlPoints;
    if (points.length < 2) return [];

    const result: Point[] = [];
    const isClosed = points.length >= 3;
    const numPoints = points.length;

    const extendedPoints: Point[] = [];
    if (isClosed) {
      extendedPoints.push(points[numPoints - 1]);
      extendedPoints.push(...points);
      extendedPoints.push(points[0]);
      extendedPoints.push(points[1]);
    } else {
      extendedPoints.push(points[0]);
      extendedPoints.push(...points);
      extendedPoints.push(points[numPoints - 1]);
    }

    for (let i = 1; i < extendedPoints.length - 2; i++) {
      const p0 = extendedPoints[i - 1];
      const p1 = extendedPoints[i];
      const p2 = extendedPoints[i + 1];
      const p3 = extendedPoints[i + 2];

      const steps = 20;
      for (let t = 0; t < steps; t++) {
        const tt = t / steps;
        const tt2 = tt * tt;
        const tt3 = tt2 * tt;

        const x = 0.5 * (
          2 * p1.x +
          (-p0.x + p2.x) * tt +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * tt3
        );
        const y = 0.5 * (
          2 * p1.y +
          (-p0.y + p2.y) * tt +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * tt3
        );

        result.push({ x, y });
      }
    }

    if (isClosed) {
      result.push(result[0]);
    } else {
      result.push(points[numPoints - 1]);
    }

    return result;
  }

  getTrackPath(): Point[] {
    return this.generateSmoothPath();
  }
}

export function buildTrack(controlPoints: Point[]): Point[] {
  if (controlPoints.length < 2) return [];

  const result: Point[] = [];
  const isClosed = controlPoints.length >= 3;
  const numPoints = controlPoints.length;

  const extendedPoints: Point[] = [];
  if (isClosed) {
    extendedPoints.push(controlPoints[numPoints - 1]);
    extendedPoints.push(...controlPoints);
    extendedPoints.push(controlPoints[0]);
    extendedPoints.push(controlPoints[1]);
  } else {
    extendedPoints.push(controlPoints[0]);
    extendedPoints.push(...controlPoints);
    extendedPoints.push(controlPoints[numPoints - 1]);
  }

  for (let i = 1; i < extendedPoints.length - 2; i++) {
    const p0 = extendedPoints[i - 1];
    const p1 = extendedPoints[i];
    const p2 = extendedPoints[i + 1];
    const p3 = extendedPoints[i + 2];

    const steps = 20;
    for (let t = 0; t < steps; t++) {
      const tt = t / steps;
      const tt2 = tt * tt;
      const tt3 = tt2 * tt;

      const x = 0.5 * (
        2 * p1.x +
        (-p0.x + p2.x) * tt +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * tt3
      );
      const y = 0.5 * (
        2 * p1.y +
        (-p0.y + p2.y) * tt +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * tt3
      );

      result.push({ x, y });
    }
  }

  if (isClosed) {
    result.push(result[0]);
  } else {
    result.push(controlPoints[numPoints - 1]);
  }

  return result;
}
