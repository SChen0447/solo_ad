export interface Vec2 {
  x: number;
  y: number;
}

export interface PhysicsParams {
  stiffness: number;
  damping: number;
  pressure: number;
  gravity: Vec2;
}

export type ShapeType = 'circle' | 'square' | 'triangle';

export class Mass {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public oldX: number;
  public oldY: number;
  public pinned: boolean;
  public stress: number;

  constructor(x: number, y: number, pinned = false) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.oldX = x;
    this.oldY = y;
    this.pinned = pinned;
    this.stress = 0;
  }

  update(dt: number, gravity: Vec2, damping: number): void {
    if (this.pinned) return;

    const vx = (this.x - this.oldX) * (1 - damping);
    const vy = (this.y - this.oldY) * (1 - damping);

    this.oldX = this.x;
    this.oldY = this.y;

    this.x += vx + gravity.x * dt * dt;
    this.y += vy + gravity.y * dt * dt;
  }

  addForce(fx: number, fy: number): void {
    if (this.pinned) return;
    this.x += fx;
    this.y += fy;
  }
}

export class Spring {
  public a: Mass;
  public b: Mass;
  public restLength: number;
  public stress: number;

  constructor(a: Mass, b: Mass) {
    this.a = a;
    this.b = b;
    this.restLength = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    this.stress = 0;
  }

  satisfy(stiffness: number): void {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const diff = (dist - this.restLength) / dist;
    
    this.stress = Math.abs(dist - this.restLength) / this.restLength;
    this.a.stress = Math.max(this.a.stress, this.stress);
    this.b.stress = Math.max(this.b.stress, this.stress);

    if (this.a.pinned && this.b.pinned) return;
    
    const offsetX = dx * 0.5 * diff * stiffness;
    const offsetY = dy * 0.5 * diff * stiffness;

    if (!this.a.pinned) {
      this.a.x += offsetX;
      this.a.y += offsetY;
    }
    if (!this.b.pinned) {
      this.b.x -= offsetX;
      this.b.y -= offsetY;
    }
  }
}

interface Triangle {
  a: number;
  b: number;
  c: number;
}

export class SoftBody {
  public masses: Mass[] = [];
  public springs: Spring[] = [];
  public triangles: Triangle[] = [];
  public params: PhysicsParams;
  public centerX: number;
  public centerY: number;
  public shapeType: ShapeType;
  public size: number;
  public performanceMode = false;

  private dragIndex: number = -1;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private isDragging = false;

  private targetShape: ShapeType | null = null;
  private shapeTransitionProgress = 0;
  private shapeTransitionDuration = 0.3;
  private originalPositions: Vec2[] = [];
  private targetPositions: Vec2[] = [];
  private edgeFlashIntensity = 0;

  private breathPhase = 0;

  private shockwaves: { x: number; y: number; radius: number; maxRadius: number; alpha: number }[] = [];

  constructor(centerX: number, centerY: number, shapeType: ShapeType, size: number, params: PhysicsParams) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.shapeType = shapeType;
    this.size = size;
    this.params = { ...params };

    this.buildShape(shapeType, size);
  }

  private getMassCount(): number {
    return this.performanceMode ? 25 : 50;
  }

  private buildShape(shape: ShapeType, size: number): void {
    this.masses = [];
    this.springs = [];
    this.triangles = [];

    const count = this.getMassCount();

    if (shape === 'circle') {
      this.buildCircle(size, count);
    } else if (shape === 'square') {
      this.buildSquare(size, count);
    } else {
      this.buildTriangle(size, count);
    }
  }

  private buildCircle(radius: number, count: number): void {
    const shellCount = Math.min(count - 1, 20);
    const innerCount = count - shellCount;

    for (let i = 0; i < shellCount; i++) {
      const angle = (i / shellCount) * Math.PI * 2;
      const x = this.centerX + Math.cos(angle) * radius;
      const y = this.centerY + Math.sin(angle) * radius;
      this.masses.push(new Mass(x, y));
    }

    const innerRadius = radius * 0.6;
    const innerPerRow = Math.ceil(Math.sqrt(innerCount));
    let placed = 0;

    for (let row = 0; row < innerPerRow && placed < innerCount; row++) {
      for (let col = 0; col < innerPerRow && placed < innerCount; col++) {
        const px = -innerRadius + (col / (innerPerRow - 1 || 1)) * innerRadius * 2;
        const py = -innerRadius + (row / (innerPerRow - 1 || 1)) * innerRadius * 2;
        if (px * px + py * py <= innerRadius * innerRadius) {
          this.masses.push(new Mass(this.centerX + px, this.centerY + py));
          placed++;
        }
      }
    }

    this.buildTriangularMesh(shellCount);
  }

  private buildSquare(size: number, count: number): void {
    const half = size / 2;
    const sideCount = Math.floor(count / 4);
    const innerCount = count - sideCount * 4;

    for (let i = 0; i < sideCount; i++) {
      const t = i / sideCount;
      this.masses.push(new Mass(this.centerX - half + t * size, this.centerY - half));
    }
    for (let i = 0; i < sideCount; i++) {
      const t = i / sideCount;
      this.masses.push(new Mass(this.centerX + half, this.centerY - half + t * size));
    }
    for (let i = 0; i < sideCount; i++) {
      const t = i / sideCount;
      this.masses.push(new Mass(this.centerX + half - t * size, this.centerY + half));
    }
    for (let i = 0; i < sideCount; i++) {
      const t = i / sideCount;
      this.masses.push(new Mass(this.centerX - half, this.centerY + half - t * size));
    }

    const innerPerRow = Math.ceil(Math.sqrt(innerCount));
    for (let row = 0; row < innerPerRow; row++) {
      for (let col = 0; col < innerPerRow; col++) {
        if (this.masses.length >= count) break;
        const px = -half * 0.8 + (col / (innerPerRow - 1 || 1)) * half * 1.6;
        const py = -half * 0.8 + (row / (innerPerRow - 1 || 1)) * half * 1.6;
        this.masses.push(new Mass(this.centerX + px, this.centerY + py));
      }
      if (this.masses.length >= count) break;
    }

    this.buildTriangularMesh(sideCount * 4);
  }

  private buildTriangle(size: number, count: number): void {
    const height = size * Math.sqrt(3) / 2;
    const shellCount = Math.floor(count * 0.4);
    const edgeCount = Math.floor(shellCount / 3);

    const points: Vec2[] = [];

    const top: Vec2 = { x: this.centerX, y: this.centerY - height * 0.6 };
    const bottomLeft: Vec2 = { x: this.centerX - size / 2, y: this.centerY + height * 0.4 };
    const bottomRight: Vec2 = { x: this.centerX + size / 2, y: this.centerY + height * 0.4 };

    for (let i = 0; i < edgeCount; i++) {
      const t = i / edgeCount;
      points.push({
        x: top.x + (bottomLeft.x - top.x) * t,
        y: top.y + (bottomLeft.y - top.y) * t
      });
    }
    for (let i = 0; i < edgeCount; i++) {
      const t = i / edgeCount;
      points.push({
        x: bottomLeft.x + (bottomRight.x - bottomLeft.x) * t,
        y: bottomLeft.y + (bottomRight.y - bottomLeft.y) * t
      });
    }
    for (let i = 0; i < edgeCount; i++) {
      const t = i / edgeCount;
      points.push({
        x: bottomRight.x + (top.x - bottomRight.x) * t,
        y: bottomRight.y + (top.y - bottomRight.y) * t
      });
    }

    for (const p of points) {
      this.masses.push(new Mass(p.x, p.y));
    }

    const innerCount = count - this.masses.length;
    const innerPerRow = Math.ceil(Math.sqrt(innerCount));
    for (let row = 0; row < innerPerRow; row++) {
      for (let col = 0; col < innerPerRow; col++) {
        if (this.masses.length >= count) break;
        const px = -size * 0.4 + (col / (innerPerRow - 1 || 1)) * size * 0.8;
        const py = -height * 0.3 + (row / (innerPerRow - 1 || 1)) * height * 0.6;
        
        const triCheck = this.pointInTriangle(
          { x: this.centerX + px, y: this.centerY + py },
          { x: top.x, y: top.y - height * 0.1 },
          { x: bottomLeft.x + size * 0.1, y: bottomLeft.y - height * 0.05 },
          { x: bottomRight.x - size * 0.1, y: bottomRight.y - height * 0.05 }
        );
        
        if (triCheck) {
          this.masses.push(new Mass(this.centerX + px, this.centerY + py));
        }
      }
      if (this.masses.length >= count) break;
    }

    this.buildTriangularMesh(points.length);
  }

  private pointInTriangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
    const d1 = this.sign(p, a, b);
    const d2 = this.sign(p, b, c);
    const d3 = this.sign(p, c, a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }

  private sign(p1: Vec2, p2: Vec2, p3: Vec2): number {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  private buildTriangularMesh(shellCount: number): void {
    const n = this.masses.length;

    for (let i = 0; i < shellCount; i++) {
      const j = (i + 1) % shellCount;
      this.springs.push(new Spring(this.masses[i], this.masses[j]));
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = this.masses[i].x - this.masses[j].x;
        const dy = this.masses[i].y - this.masses[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const threshold = this.size * 0.35;
        if (dist < threshold && dist > 0.1) {
          let exists = false;
          for (const s of this.springs) {
            if ((s.a === this.masses[i] && s.b === this.masses[j]) ||
                (s.a === this.masses[j] && s.b === this.masses[i])) {
              exists = true;
              break;
            }
          }
          if (!exists) {
            this.springs.push(new Spring(this.masses[i], this.masses[j]));
          }
        }
      }
    }

    this.triangles = this.generateTriangles();
  }

  private generateTriangles(): Triangle[] {
    const triangles: Triangle[] = [];
    const n = this.masses.length;
    
    const distMatrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      distMatrix[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distMatrix[i][j] = 0;
        } else {
          const dx = this.masses[i].x - this.masses[j].x;
          const dy = this.masses[i].y - this.masses[j].y;
          distMatrix[i][j] = Math.sqrt(dx * dx + dy * dy);
        }
      }
    }

    const springMap = new Set<string>();
    for (const s of this.springs) {
      const ai = this.masses.indexOf(s.a);
      const bi = this.masses.indexOf(s.b);
      springMap.add(`${ai}-${bi}`);
      springMap.add(`${bi}-${ai}`);
    }

    const threshold = this.size * 0.35;
    
    for (let i = 0; i < n; i++) {
      const neighbors: number[] = [];
      for (let j = 0; j < n; j++) {
        if (i !== j && distMatrix[i][j] < threshold) {
          neighbors.push(j);
        }
      }

      for (let a = 0; a < neighbors.length; a++) {
        for (let b = a + 1; b < neighbors.length; b++) {
          const na = neighbors[a];
          const nb = neighbors[b];
          
          if (springMap.has(`${i}-${na}`) && springMap.has(`${i}-${nb}`) && springMap.has(`${na}-${nb}`)) {
            const key1 = `${i}-${na}-${nb}`;
            const key2 = `${i}-${nb}-${na}`;
            const key3 = `${na}-${i}-${nb}`;
            const key4 = `${na}-${nb}-${i}`;
            const key5 = `${nb}-${i}-${na}`;
            const key6 = `${nb}-${na}-${i}`;
            
            let exists = false;
            for (const t of triangles) {
              const triKey = `${t.a}-${t.b}-${t.c}`;
              if (triKey === key1 || triKey === key2 || triKey === key3 ||
                  triKey === key4 || triKey === key5 || triKey === key6) {
                exists = true;
                break;
              }
            }
            
            if (!exists) {
              triangles.push({ a: i, b: na, c: nb });
            }
          }
        }
      }
    }

    return triangles;
  }

  public setShape(shape: ShapeType): void {
    if (shape === this.shapeType && !this.targetShape) return;

    this.targetShape = shape;
    this.shapeTransitionProgress = 0;
    this.edgeFlashIntensity = 1;

    this.originalPositions = this.masses.map(m => ({ x: m.x, y: m.y }));
    
    const tempBody = new SoftBody(this.centerX, this.centerY, shape, this.size, this.params);
    if (this.performanceMode) {
      tempBody.performanceMode = true;
      tempBody.buildShape(shape, tempBody.size);
    }
    
    const targetCount = tempBody.masses.length;
    const currentCount = this.masses.length;

    if (targetCount !== currentCount) {
      while (this.masses.length < targetCount) {
        this.masses.push(new Mass(this.centerX, this.centerY));
        this.originalPositions.push({ x: this.centerX, y: this.centerY });
      }
      while (this.masses.length > targetCount) {
        this.masses.pop();
        this.originalPositions.pop();
      }
    }

    this.targetPositions = [];
    for (let i = 0; i < this.masses.length; i++) {
      if (i < tempBody.masses.length) {
        this.targetPositions.push({ x: tempBody.masses[i].x, y: tempBody.masses[i].y });
      } else {
        this.targetPositions.push({ x: this.centerX, y: this.centerY });
      }
    }
  }

  public setPerformanceMode(enabled: boolean): void {
    if (this.performanceMode === enabled) return;
    this.performanceMode = enabled;
    
    this.setShape(this.targetShape || this.shapeType);
  }

  public update(dt: number): void {
    this.breathPhase += dt / 1.2;

    if (this.targetShape && this.originalPositions.length > 0 && this.targetPositions.length > 0) {
      this.shapeTransitionProgress += dt / this.shapeTransitionDuration;
      
      if (this.shapeTransitionProgress >= 1) {
        this.shapeTransitionProgress = 1;
        this.shapeType = this.targetShape;
        this.targetShape = null;
        
        this.buildShape(this.shapeType, this.size);
        
        for (let i = 0; i < Math.min(this.masses.length, this.targetPositions.length); i++) {
          this.masses[i].x = this.targetPositions[i].x;
          this.masses[i].y = this.targetPositions[i].y;
          this.masses[i].oldX = this.targetPositions[i].x;
          this.masses[i].oldY = this.targetPositions[i].y;
        }
      } else {
        const t = this.easeOutElastic(this.shapeTransitionProgress);
        for (let i = 0; i < this.masses.length; i++) {
          const ox = this.originalPositions[i].x;
          const oy = this.originalPositions[i].y;
          const tx = this.targetPositions[i].x;
          const ty = this.targetPositions[i].y;
          
          this.masses[i].x = ox + (tx - ox) * t;
          this.masses[i].y = oy + (ty - oy) * t;
          this.masses[i].oldX = this.masses[i].x;
          this.masses[i].oldY = this.masses[i].y;
        }
      }
    } else {
      for (const mass of this.masses) {
        mass.stress = 0;
      }

      const iterations = 5;
      for (let iter = 0; iter < iterations; iter++) {
        for (const spring of this.springs) {
          spring.satisfy(this.params.stiffness / iterations);
        }
      }

      this.applyPressure();

      for (const mass of this.masses) {
        mass.update(dt, this.params.gravity, this.params.damping);
      }
    }

    if (this.edgeFlashIntensity > 0) {
      this.edgeFlashIntensity -= dt * 3;
      if (this.edgeFlashIntensity < 0) this.edgeFlashIntensity = 0;
    }

    this.shockwaves = this.shockwaves.filter(s => {
      s.radius += dt * 200;
      s.alpha -= dt * 10;
      return s.alpha > 0;
    });
  }

  private applyPressure(): void {
    if (this.triangles.length === 0) return;

    const pressure = this.params.pressure;
    
    for (const tri of this.triangles) {
      const a = this.masses[tri.a];
      const b = this.masses[tri.b];
      const c = this.masses[tri.c];

      const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
      const targetArea = this.size * this.size * 0.3;
      const areaRatio = area / targetArea;

      if (area > 1) {
        const pressureForce = (1 - areaRatio) * pressure * 0.1;
        
        const cx = (a.x + b.x + c.x) / 3;
        const cy = (a.y + b.y + c.y) / 3;

        if (!a.pinned) {
          a.x += (a.x - cx) * pressureForce;
          a.y += (a.y - cy) * pressureForce;
        }
        if (!b.pinned) {
          b.x += (b.x - cx) * pressureForce;
          b.y += (b.y - cy) * pressureForce;
        }
        if (!c.pinned) {
          c.x += (c.x - cx) * pressureForce;
          c.y += (c.y - cy) * pressureForce;
        }
      }
    }
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  public handleMouseDown(x: number, y: number): boolean {
    let minDist = Infinity;
    let nearestIndex = -1;

    for (let i = 0; i < this.masses.length; i++) {
      const dx = x - this.masses[i].x;
      const dy = y - this.masses[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist < 60) {
        minDist = dist;
        nearestIndex = i;
      }
    }

    if (nearestIndex >= 0) {
      this.dragIndex = nearestIndex;
      this.dragOffsetX = x - this.masses[nearestIndex].x;
      this.dragOffsetY = y - this.masses[nearestIndex].y;
      this.isDragging = true;
      this.masses[nearestIndex].pinned = true;
      return true;
    }
    return false;
  }

  public handleMouseMove(x: number, y: number): void {
    if (this.isDragging && this.dragIndex >= 0) {
      this.masses[this.dragIndex].x = x - this.dragOffsetX;
      this.masses[this.dragIndex].y = y - this.dragOffsetY;
    }
  }

  public handleMouseUp(): void {
    if (this.dragIndex >= 0) {
      this.masses[this.dragIndex].pinned = false;
      this.masses[this.dragIndex].vx = 0;
      this.masses[this.dragIndex].vy = 0;
    }
    this.isDragging = false;
    this.dragIndex = -1;
  }

  public addShockwave(x: number, y: number, maxRadius: number): void {
    this.shockwaves.push({ x, y, radius: 0, maxRadius, alpha: 1 });
  }

  public getDeformationRate(): number {
    if (this.masses.length === 0) return 0;

    let totalStress = 0;
    for (const mass of this.masses) {
      totalStress += mass.stress;
    }
    return Math.min(100, (totalStress / this.masses.length) * 500);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawShape(ctx);
    this.drawSprings(ctx);
    this.drawMasses(ctx);
    this.drawShockwaves(ctx);
  }

  private drawShape(ctx: CanvasRenderingContext2D): void {
    if (this.masses.length < 3) return;

    const breathIntensity = 0.6 + 0.2 * (0.5 + 0.5 * Math.sin(this.breathPhase * Math.PI * 2));

    ctx.save();
    
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.size
    );
    gradient.addColorStop(0, `rgba(255, 136, 0, ${0.8 * breathIntensity})`);
    gradient.addColorStop(0.5, `rgba(255, 85, 85, ${0.7 * breathIntensity})`);
    gradient.addColorStop(1, `rgba(255, 68, 136, ${0.6 * breathIntensity})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();

    const shellCount = this.getShellCount();
    if (shellCount > 0) {
      ctx.moveTo(this.masses[0].x, this.masses[0].y);
      for (let i = 1; i < shellCount; i++) {
        this.lineToSmooth(ctx, i, shellCount);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 20 * breathIntensity;
    ctx.shadowColor = 'rgba(255, 136, 0, 0.5)';
    ctx.fill();

    if (this.edgeFlashIntensity > 0) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.edgeFlashIntensity})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  }

  private getShellCount(): number {
    if (this.shapeType === 'circle') return Math.min(this.masses.length, 20);
    if (this.shapeType === 'square') {
      const sideCount = Math.floor(this.getMassCount() / 4);
      return sideCount * 4;
    }
    if (this.shapeType === 'triangle') {
      const shellCount = Math.floor(this.getMassCount() * 0.4);
      return Math.floor(shellCount / 3) * 3;
    }
    return this.masses.length;
  }

  private lineToSmooth(ctx: CanvasRenderingContext2D, index: number, total: number): void {
    const prev = (index - 1 + total) % total;
    const next = (index + 1) % total;
    
    const xc = (this.masses[prev].x + this.masses[next].x) / 2;
    const yc = (this.masses[prev].y + this.masses[next].y) / 2;
    
    ctx.quadraticCurveTo(this.masses[prev].x, this.masses[prev].y, xc, yc);
  }

  private drawSprings(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    if (this.performanceMode) {
      ctx.setLineDash([4, 4]);
    }
    
    for (const spring of this.springs) {
      const stressRatio = Math.min(1, spring.stress * 5);
      const r = Math.floor(100 + stressRatio * 155);
      const g = Math.floor(255 - stressRatio * 200);
      const b = Math.floor(100 - stressRatio * 50);
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(spring.a.x, spring.a.y);
      ctx.lineTo(spring.b.x, spring.b.y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  private drawMasses(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.masses.length; i++) {
      const mass = this.masses[i];
      const isDragged = i === this.dragIndex;
      
      ctx.fillStyle = isDragged ? '#ffff00' : '#ffffff';
      ctx.beginPath();
      ctx.arc(mass.x, mass.y, isDragged ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShockwaves(ctx: CanvasRenderingContext2D): void {
    for (const wave of this.shockwaves) {
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${wave.alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  public drawHeatmap(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    ctx.clearRect(0, 0, width, height);
    
    if (this.springs.length === 0) return;

    const padding = 5;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const cols = 10;
    const rows = 6;
    const cellW = w / cols;
    const cellH = h / rows;

    let maxStress = 0.001;
    for (const spring of this.springs) {
      maxStress = Math.max(maxStress, spring.stress);
    }

    const stressGrid: number[][] = [];
    for (let r = 0; r < rows; r++) {
      stressGrid[r] = [];
      for (let c = 0; c < cols; c++) {
        stressGrid[r][c] = 0;
      }
    }

    for (const spring of this.springs) {
      const ax = (spring.a.x - (this.centerX - this.size)) / (this.size * 2);
      const ay = (spring.a.y - (this.centerY - this.size)) / (this.size * 2);
      const bx = (spring.b.x - (this.centerX - this.size)) / (this.size * 2);
      const by = (spring.b.y - (this.centerY - this.size)) / (this.size * 2);

      const colA = Math.floor(ax * cols);
      const rowA = Math.floor(ay * rows);
      const colB = Math.floor(bx * cols);
      const rowB = Math.floor(by * rows);

      const addStress = (col: number, row: number, stress: number) => {
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
          stressGrid[row][col] = Math.max(stressGrid[row][col], stress);
        }
      };

      addStress(colA, rowA, spring.stress);
      addStress(colB, rowB, spring.stress);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const stress = stressGrid[r][c] / maxStress;
        const hue = 120 - stress * 120;
        ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.8)`;
        ctx.fillRect(padding + c * cellW, padding + r * cellH, cellW - 1, cellH - 1);
      }
    }

    ctx.fillStyle = '#cccccc';
    ctx.font = '10px sans-serif';
    ctx.fillText('应力分布', padding, height - 2);
  }
}
