import Phaser from 'phaser';

export interface LightSource {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  intensity: number;
  type: 'point' | 'cone';
  angle?: number;
  coneAngle?: number;
  oscillate?: boolean;
  oscSpeed?: number;
  oscPhase?: number;
  oscRange?: number;
}

export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class LightManager {
  private scene: Phaser.Scene;
  private lights: LightSource[] = [];
  private walls: Wall[] = [];
  private lightTexture: Phaser.GameObjects.RenderTexture | null = null;
  private shadowTexture: Phaser.GameObjects.RenderTexture | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private cachedWallsDirty = true;
  private worldWidth: number = 2560;
  private worldHeight: number = 1440;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.initOffscreenCanvas();
  }

  private initOffscreenCanvas(): void {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.worldWidth;
    this.offscreenCanvas.height = this.worldHeight;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  }

  setWalls(walls: Wall[]): void {
    this.walls = walls;
    this.cachedWallsDirty = true;
  }

  addLight(light: LightSource): void {
    this.lights.push(light);
  }

  removeLight(id: string): void {
    this.lights = this.lights.filter(l => l.id !== id);
  }

  updateLights(delta: number): void {
    for (const light of this.lights) {
      if (light.oscillate && light.oscSpeed !== undefined) {
        light.oscPhase = (light.oscPhase || 0) + delta * light.oscSpeed * 0.001;
        if (light.type === 'cone' && light.angle !== undefined) {
        }
      }
    }
  }

  isPointLit(x: number, y: number): number {
    let totalExposure = 0;
    for (const light of this.lights) {
      const exposure = this.getLightExposureAtPoint(light, x, y);
      totalExposure += exposure;
    }
    return Math.min(1, totalExposure);
  }

  private getLightExposureAtPoint(light: LightSource, px: number, py: number): number {
    const dx = px - light.x;
    const dy = py - light.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > light.radius) return 0;

    if (light.type === 'cone' && light.angle !== undefined && light.coneAngle !== undefined) {
      const pointAngle = Math.atan2(dy, dx);
      let angleDiff = pointAngle - light.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) > light.coneAngle / 2) return 0;
    }

    if (this.isLineBlockedByWalls(light.x, light.y, px, py)) {
      return 0;
    }

    const falloff = 1 - (dist / light.radius);
    return falloff * light.intensity;
  }

  private isLineBlockedByWalls(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const wall of this.walls) {
      if (this.lineIntersectsRect(x1, y1, x2, y2, wall)) {
        return true;
      }
    }
    return false;
  }

  private lineIntersectsRect(x1: number, y1: number, x2: number, y2: number, rect: Wall): boolean {
    const left = rect.x;
    const right = rect.x + rect.width;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    if (x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) return true;
    if (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom) return true;

    return (
      this.lineSegmentsIntersect(x1, y1, x2, y2, left, top, right, top) ||
      this.lineSegmentsIntersect(x1, y1, x2, y2, right, top, right, bottom) ||
      this.lineSegmentsIntersect(x1, y1, x2, y2, right, bottom, left, bottom) ||
      this.lineSegmentsIntersect(x1, y1, x2, y2, left, bottom, left, top)
    );
  }

  private lineSegmentsIntersect(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return false;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  calculateLightPolygon(light: LightSource): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const numRays = light.type === 'cone' ? 60 : 120;
    const startAngle = light.type === 'cone' && light.angle !== undefined && light.coneAngle !== undefined
      ? light.angle - light.coneAngle / 2
      : 0;
    const endAngle = light.type === 'cone' && light.angle !== undefined && light.coneAngle !== undefined
      ? light.angle + light.coneAngle / 2
      : Math.PI * 2;

    for (let i = 0; i <= numRays; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / numRays);
      const endX = light.x + Math.cos(angle) * light.radius;
      const endY = light.y + Math.sin(angle) * light.radius;
      const hitPoint = this.castRay(light.x, light.y, endX, endY);
      points.push(hitPoint);
    }

    return points;
  }

  private castRay(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
    let closestDist = Infinity;
    let closestPoint = { x: x2, y: y2 };

    for (const wall of this.walls) {
      const corners = [
        { x: wall.x, y: wall.y },
        { x: wall.x + wall.width, y: wall.y },
        { x: wall.x + wall.width, y: wall.y + wall.height },
        { x: wall.x, y: wall.y + wall.height }
      ];

      for (let i = 0; i < 4; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % 4];
        const intersection = this.getLineIntersection(x1, y1, x2, y2, p1.x, p1.y, p2.x, p2.y);
        if (intersection) {
          const dist = Phaser.Math.Distance.Between(x1, y1, intersection.x, intersection.y);
          if (dist < closestDist && dist > 1) {
            closestDist = dist;
            closestPoint = intersection;
          }
        }
      }
    }

    return closestPoint;
  }

  private getLineIntersection(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): { x: number; y: number } | null {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1)
      };
    }

    return null;
  }

  renderLights(graphics: Phaser.GameObjects.Graphics): void {
    for (const light of this.lights) {
      this.renderSingleLight(light, graphics);
    }
  }

  private renderSingleLight(light: LightSource, graphics: Phaser.GameObjects.Graphics): void {
    const polygon = this.calculateLightPolygon(light);
    if (polygon.length < 3) return;

    const color = Phaser.Display.Color.IntegerToColor(light.color);

    const points: Phaser.Math.Vector2[] = polygon.map(p => new Phaser.Math.Vector2(p.x, p.y));

    const steps = 8;
    for (let i = steps; i >= 0; i--) {
      const alpha = (i / steps) * 0.6 * light.intensity;
      const scale = 0.7 + (i / steps) * 0.3;

      graphics.fillStyle(light.color, alpha);
      graphics.beginPath();

      for (let j = 0; j < points.length; j++) {
        const px = light.x + (points[j].x - light.x) * scale;
        const py = light.y + (points[j].y - light.y) * scale;
        if (j === 0) {
          graphics.moveTo(px, py);
        } else {
          graphics.lineTo(px, py);
        }
      }

      graphics.closePath();
      graphics.fillPath();
    }

    graphics.fillStyle(light.color, 0.15 * light.intensity);
    graphics.beginPath();
    for (let j = 0; j < points.length; j++) {
      if (j === 0) {
        graphics.moveTo(points[j].x, points[j].y);
      } else {
        graphics.lineTo(points[j].x, points[j].y);
      }
    }
    graphics.closePath();
    graphics.fillPath();
  }

  getLights(): LightSource[] {
    return this.lights;
  }

  getWalls(): Wall[] {
    return this.walls;
  }

  destroy(): void {
    this.lights = [];
    this.walls = [];
    if (this.offscreenCanvas) {
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
    }
  }
}
