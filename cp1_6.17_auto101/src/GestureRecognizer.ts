export type SpellType = 'fireball' | 'iceSpike' | 'lightning' | null;

export interface TrackPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface GestureResult {
  spellType: SpellType;
  startPoint: TrackPoint;
  endPoint: TrackPoint;
}

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

const CIRCLE_MIN_RADIUS = 30;
const CIRCLE_CLOSURE_THRESHOLD = 50;
const LINE_VERTICAL_THRESHOLD = 50;
const LINE_ANGLE_THRESHOLD = 15;
const ZIGZAG_MIN_TURNS = 3;
const TRAJECTORY_MAX_AGE = 2000;
const MIN_POINT_DISTANCE = 5;
const MAX_TRAJECTORY_POINTS = 200;

export class GestureRecognizer {
  private trajectory: TrackPoint[] = [];
  private lastFireballTime = 0;
  private lastIceSpikeTime = 0;
  private lastLightningTime = 0;
  private readonly COOLDOWN_MS = 500;

  addPoint(landmarks: HandLandmark[]): void {
    if (!landmarks || landmarks.length < 9) return;
    const indexTip = landmarks[8];
    const now = Date.now();

    if (this.trajectory.length > 0) {
      const lastPoint = this.trajectory[this.trajectory.length - 1];
      const dist = Math.hypot(indexTip.x - lastPoint.x, indexTip.y - lastPoint.y);
      if (dist < MIN_POINT_DISTANCE) return;
    }

    this.trajectory.push({
      x: indexTip.x,
      y: indexTip.y,
      timestamp: now
    });

    if (this.trajectory.length > MAX_TRAJECTORY_POINTS) {
      this.trajectory.shift();
    }

    this.cleanOldPoints();
  }

  private cleanOldPoints(): void {
    const now = Date.now();
    while (this.trajectory.length > 0 && now - this.trajectory[0].timestamp > TRAJECTORY_MAX_AGE) {
      this.trajectory.shift();
    }
  }

  recognize(): GestureResult | null {
    if (this.trajectory.length < 10) return null;

    const circleResult = this.detectCircle();
    if (circleResult && Date.now() - this.lastFireballTime > this.COOLDOWN_MS) {
      this.lastFireballTime = Date.now();
      this.clearTrajectory();
      return circleResult;
    }

    const lineResult = this.detectVerticalLine();
    if (lineResult && Date.now() - this.lastIceSpikeTime > this.COOLDOWN_MS) {
      this.lastIceSpikeTime = Date.now();
      this.clearTrajectory();
      return lineResult;
    }

    const zigzagResult = this.detectZigzag();
    if (zigzagResult && Date.now() - this.lastLightningTime > this.COOLDOWN_MS) {
      this.lastLightningTime = Date.now();
      this.clearTrajectory();
      return zigzagResult;
    }

    return null;
  }

  private clearTrajectory(): void {
    this.trajectory = [];
  }

  getTrajectory(): TrackPoint[] {
    return [...this.trajectory];
  }

  private detectCircle(): GestureResult | null {
    const points = this.trajectory;
    if (points.length < 20) return null;

    let sumX = 0, sumY = 0;
    points.forEach(p => { sumX += p.x; sumY += p.y; });
    const centerX = sumX / points.length;
    const centerY = sumY / points.length;

    const distances = points.map(p => Math.hypot(p.x - centerX, p.y - centerY));
    const avgRadius = distances.reduce((a, b) => a + b, 0) / distances.length;

    if (avgRadius < CIRCLE_MIN_RADIUS) return null;

    const variance = distances.reduce((sum, d) => sum + (d - avgRadius) ** 2, 0) / distances.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev / avgRadius > 0.35) return null;

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const closureDist = Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y);
    if (closureDist > CIRCLE_CLOSURE_THRESHOLD && closureDist > avgRadius * 1.5) return null;

    const startAngle = Math.atan2(firstPoint.y - centerY, firstPoint.x - centerX);
    const endAngle = Math.atan2(lastPoint.y - centerY, lastPoint.x - centerX);
    let angleDiff = Math.abs(endAngle - startAngle);
    angleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
    if (angleDiff < Math.PI * 1.2) return null;

    return {
      spellType: 'fireball',
      startPoint: { ...centerPointFromTrajectory(points), x: centerX, y: centerY } as TrackPoint,
      endPoint: points[Math.floor(points.length / 2)]
    };
  }

  private detectVerticalLine(): GestureResult | null {
    const points = this.trajectory;
    if (points.length < 8) return null;

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const verticalDisplacement = lastPoint.y - firstPoint.y;

    if (verticalDisplacement < LINE_VERTICAL_THRESHOLD) return null;

    const horizontalDisplacement = Math.abs(lastPoint.x - firstPoint.x);
    const angle = Math.atan2(verticalDisplacement, horizontalDisplacement) * (180 / Math.PI);
    const deviationFromVertical = Math.abs(90 - angle);

    if (deviationFromVertical > LINE_ANGLE_THRESHOLD) return null;

    let pathLength = 0;
    for (let i = 1; i < points.length; i++) {
      pathLength += Math.hypot(
        points[i].x - points[i - 1].x,
        points[i].y - points[i - 1].y
      );
    }
    const straightDistance = Math.hypot(
      lastPoint.x - firstPoint.x,
      lastPoint.y - firstPoint.y
    );
    if (pathLength / straightDistance > 1.4) return null;

    return {
      spellType: 'iceSpike',
      startPoint: firstPoint,
      endPoint: lastPoint
    };
  }

  private detectZigzag(): GestureResult | null {
    const points = this.trajectory;
    if (points.length < 15) return null;

    const smoothed = this.smoothTrajectory(points, 3);
    const directions: number[] = [];

    for (let i = 1; i < smoothed.length; i++) {
      const dx = smoothed[i].x - smoothed[i - 1].x;
      const dy = smoothed[i].y - smoothed[i - 1].y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        directions.push(Math.atan2(dy, dx));
      }
    }

    if (directions.length < 6) return null;

    const turns: number[] = [];
    for (let i = 1; i < directions.length; i++) {
      let turn = Math.abs(directions[i] - directions[i - 1]);
      if (turn > Math.PI) turn = Math.PI * 2 - turn;
      if (turn > Math.PI / 4) {
        turns.push(turn);
      }
    }

    if (turns.length < ZIGZAG_MIN_TURNS) return null;

    const totalDisplacement = Math.hypot(
      points[points.length - 1].x - points[0].x,
      points[points.length - 1].y - points[0].y
    );
    if (totalDisplacement < 60) return null;

    return {
      spellType: 'lightning',
      startPoint: points[0],
      endPoint: points[points.length - 1]
    };
  }

  private smoothTrajectory(points: TrackPoint[], window: number): TrackPoint[] {
    if (points.length < window * 2 + 1) return points;
    const smoothed: TrackPoint[] = [];
    for (let i = window; i < points.length - window; i++) {
      let sumX = 0, sumY = 0;
      for (let j = -window; j <= window; j++) {
        sumX += points[i + j].x;
        sumY += points[i + j].y;
      }
      smoothed.push({
        x: sumX / (window * 2 + 1),
        y: sumY / (window * 2 + 1),
        timestamp: points[i].timestamp
      });
    }
    return smoothed;
  }

  reset(): void {
    this.trajectory = [];
    this.lastFireballTime = 0;
    this.lastIceSpikeTime = 0;
    this.lastLightningTime = 0;
  }
}

function centerPointFromTrajectory(points: TrackPoint[]): TrackPoint {
  return points[Math.floor(points.length / 2)];
}
