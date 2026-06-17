import Phaser from 'phaser';

export interface LineData {
  points: Phaser.Math.Vector2[];
  widths: number[];
  body: Phaser.Physics.Matter.Image | null;
  graphics: Phaser.GameObjects.Graphics | null;
}

export default class LineTerrain {
  private scene: Phaser.Scene;
  private matterWorld: Phaser.Physics.Matter.World;
  private lines: LineData[] = [];
  private history: LineData[] = [];
  private currentDrawing: Phaser.Math.Vector2[] = [];
  private currentWidths: number[] = [];
  private currentGraphics: Phaser.GameObjects.Graphics | null = null;
  private maxHistory: number = 20;
  private maxPointsPerLine: number = 500;
  private minPointDistance: number = 4;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.matterWorld = scene.matter.world;
  }

  public startDrawing(x: number, y: number): void {
    this.currentDrawing = [new Phaser.Math.Vector2(x, y)];
    this.currentWidths = [Phaser.Math.Between(3, 8)];
    this.currentGraphics = this.scene.add.graphics();
  }

  public continueDrawing(x: number, y: number): boolean {
    if (!this.currentGraphics || this.currentDrawing.length === 0) return false;
    if (this.currentDrawing.length >= this.maxPointsPerLine) return false;

    const lastPoint = this.currentDrawing[this.currentDrawing.length - 1];
    const dist = Phaser.Math.Distance.Between(lastPoint.x, lastPoint.y, x, y);

    if (dist < this.minPointDistance) return true;

    this.currentDrawing.push(new Phaser.Math.Vector2(x, y));
    this.currentWidths.push(Phaser.Math.Between(3, 8));

    this.renderCurrentLine();
    return true;
  }

  public endDrawing(): LineData | null {
    if (this.currentDrawing.length < 2) {
      if (this.currentGraphics) {
        this.currentGraphics.clear();
        this.currentGraphics.destroy();
        this.currentGraphics = null;
      }
      this.currentDrawing = [];
      this.currentWidths = [];
      return null;
    }

    const points = [...this.currentDrawing];
    const widths = [...this.currentWidths];
    const graphics = this.currentGraphics;

    const body = this.createPhysicsBody(points, widths);

    const lineData: LineData = {
      points,
      widths,
      body,
      graphics
    };

    this.lines.push(lineData);
    this.pushHistory(lineData);

    this.currentDrawing = [];
    this.currentWidths = [];
    this.currentGraphics = null;

    return lineData;
  }

  private renderCurrentLine(): void {
    if (!this.currentGraphics || this.currentDrawing.length < 2) return;

    this.currentGraphics.clear();

    for (let i = 1; i < this.currentDrawing.length; i++) {
      const prev = this.currentDrawing[i - 1];
      const curr = this.currentDrawing[i];
      const width = this.currentWidths[i] || 5;

      this.currentGraphics.lineStyle(width, 0xe94560, 0.8);
      this.currentGraphics.beginPath();
      this.currentGraphics.moveTo(prev.x, prev.y);
      this.currentGraphics.lineTo(curr.x, curr.y);
      this.currentGraphics.strokePath();

      this.currentGraphics.lineStyle(width + 4, 0xe94560, 0.25);
      this.currentGraphics.beginPath();
      this.currentGraphics.moveTo(prev.x, prev.y);
      this.currentGraphics.lineTo(curr.x, curr.y);
      this.currentGraphics.strokePath();
    }
  }

  private createPhysicsBody(
    points: Phaser.Math.Vector2[],
    _widths: number[]
  ): Phaser.Physics.Matter.Image | null {
    if (points.length < 2) return null;

    const simplified = this.simplifyPoints(points, 3);
    if (simplified.length < 2) return null;

    const vertexSets: Phaser.Types.Math.Vector2Like[][] = [];

    for (let i = 1; i < simplified.length; i++) {
      const p1 = simplified[i - 1];
      const p2 = simplified[i];
      const segment = this.createSegmentVertices(p1, p2, 5);
      vertexSets.push(segment);
    }

    const cx = simplified.reduce((s, p) => s + p.x, 0) / simplified.length;
    const cy = simplified.reduce((s, p) => s + p.y, 0) / simplified.length;

    try {
      const body = this.scene.matter.add.image(cx, cy, 'terrain', undefined, {
        isStatic: true,
        friction: 0.8,
        restitution: 0.2,
        shape: {
          type: 'fromVerts',
          vertexSets
        }
      } as Phaser.Types.Physics.Matter.MatterImageConfig);

      body.setAlpha(0);
      return body;
    } catch (err) {
      console.warn('Failed to create physics body for line:', err);
      return this.createFallbackBody(simplified);
    }
  }

  private createFallbackBody(points: Phaser.Math.Vector2[]): Phaser.Physics.Matter.Image | null {
    if (points.length < 2) return null;

    try {
      const rect = Phaser.Geom.Rectangle.FromPoints(points.map(p => ({ x: p.x, y: p.y })));
      const cx = rect.centerX;
      const cy = rect.centerY;
      const w = Math.max(rect.width, 10);
      const h = Math.max(rect.height, 10);

      const body = this.scene.matter.add.image(cx, cy, 'terrain', undefined, {
        isStatic: true,
        friction: 0.8,
        restitution: 0.2,
        shape: {
          type: 'rectangle',
          width: w,
          height: h
        }
      } as Phaser.Types.Physics.Matter.MatterImageConfig);

      body.setAlpha(0);
      return body;
    } catch {
      return null;
    }
  }

  private createSegmentVertices(
    p1: Phaser.Math.Vector2,
    p2: Phaser.Math.Vector2,
    thickness: number
  ): Phaser.Types.Math.Vector2Like[] {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const t = thickness / 2;

    return [
      { x: p1.x + nx * t, y: p1.y + ny * t },
      { x: p2.x + nx * t, y: p2.y + ny * t },
      { x: p2.x - nx * t, y: p2.y - ny * t },
      { x: p1.x - nx * t, y: p1.y - ny * t }
    ];
  }

  private simplifyPoints(points: Phaser.Math.Vector2[], tolerance: number): Phaser.Math.Vector2[] {
    if (points.length <= 2) return points;

    const result: Phaser.Math.Vector2[] = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = points[i];
      const dist = Phaser.Math.Distance.Between(prev.x, prev.y, curr.x, curr.y);
      if (dist >= tolerance) {
        result.push(curr);
      }
    }

    result.push(points[points.length - 1]);
    return result;
  }

  private pushHistory(line: LineData): void {
    this.history.push(line);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  public undo(): boolean {
    if (this.history.length === 0) return false;

    const lastLine = this.history.pop()!;
    const idx = this.lines.indexOf(lastLine);
    if (idx >= 0) {
      this.lines.splice(idx, 1);
    }

    if (lastLine.body) {
      this.scene.matter.world.remove(lastLine.body.body as MatterJS.BodyType);
      lastLine.body.destroy();
    }
    if (lastLine.graphics) {
      lastLine.graphics.clear();
      lastLine.graphics.destroy();
    }

    return true;
  }

  public clearAll(): void {
    this.lines.forEach(line => {
      if (line.body) {
        try {
          this.scene.matter.world.remove(line.body.body as MatterJS.BodyType);
          line.body.destroy();
        } catch {
          // ignore
        }
      }
      if (line.graphics) {
        line.graphics.clear();
        line.graphics.destroy();
      }
    });

    this.lines = [];
    this.history = [];
    this.currentDrawing = [];
    this.currentWidths = [];
    if (this.currentGraphics) {
      this.currentGraphics.clear();
      this.currentGraphics.destroy();
      this.currentGraphics = null;
    }
  }

  public getLines(): LineData[] {
    return this.lines;
  }

  public getLinesData(): number[][][] {
    return this.lines.map(line =>
      line.points.map(p => [p.x, p.y])
    );
  }

  public loadLinesData(linesData: number[][][]): void {
    this.clearAll();

    linesData.forEach(linePoints => {
      if (linePoints.length < 2) return;

      const points = linePoints.map(p => new Phaser.Math.Vector2(p[0], p[1]));
      const widths = points.map(() => Phaser.Math.Between(3, 8));

      const graphics = this.scene.add.graphics();
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const width = widths[i] || 5;

        graphics.lineStyle(width + 4, 0xe94560, 0.25);
        graphics.beginPath();
        graphics.moveTo(prev.x, prev.y);
        graphics.lineTo(curr.x, curr.y);
        graphics.strokePath();

        graphics.lineStyle(width, 0xe94560, 0.8);
        graphics.beginPath();
        graphics.moveTo(prev.x, prev.y);
        graphics.lineTo(curr.x, curr.y);
        graphics.strokePath();
      }

      const body = this.createPhysicsBody(points, widths);

      this.lines.push({ points, widths, body, graphics });
    });
  }

  public isDrawing(): boolean {
    return this.currentDrawing.length > 0;
  }

  public getHistoryCount(): number {
    return this.history.length;
  }

  public destroy(): void {
    this.clearAll();
  }
}
