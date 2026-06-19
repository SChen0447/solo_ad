import { CONFIG } from './config';
import type {
  GameEntity,
  PlayerObject,
  CoralReef,
  Wreck,
  TreasureChest,
  OxygenBubble,
  PlanktonGroup,
  Particle,
  FloatText,
  EntityType,
  GameState,
  InputState
} from './entities';

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

export class EntityManager {
  private entities: Map<EntityType, GameEntity[]> = new Map();
  private camera: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.init();
  }

  init(): void {
    this.entities.clear();
    idCounter = 0;
    this.spawnPlayer();
    this.spawnCorals();
    this.spawnWrecks();
    this.spawnPlankton();
    this.spawnTreasures();
  }

  private addEntity(entity: GameEntity): void {
    const list = this.entities.get(entity.type) ?? [];
    list.push(entity);
    this.entities.set(entity.type, list);
  }

  getEntitiesByType<T extends GameEntity>(type: EntityType): T[] {
    return (this.entities.get(type) ?? []) as T[];
  }

  getAllEntities(): GameEntity[] {
    const all: GameEntity[] = [];
    this.entities.forEach(list => all.push(...list));
    return all;
  }

  getPlayer(): PlayerObject {
    const players = this.getEntitiesByType<PlayerObject>('player');
    return players[0];
  }

  getCamera(): { x: number; y: number } {
    return this.camera;
  }

  setCamera(x: number, y: number): void {
    this.camera.x = x;
    this.camera.y = y;
  }

  private spawnPlayer(): void {
    const halfW = CONFIG.WORLD.width / 2;
    const halfH = CONFIG.WORLD.height / 2;
    const player: PlayerObject = {
      id: nextId('player'),
      type: 'player',
      x: halfW,
      y: halfH,
      width: CONFIG.PLAYER.SIZE,
      height: CONFIG.PLAYER.SIZE,
      active: true,
      vx: 0,
      vy: 0,
      oxygen: CONFIG.OXYGEN.MAX,
      angle: 0
    };
    this.addEntity(player);
  }

  private getGridPositions(count: number, padding: number = 1): Array<{ gx: number; gy: number }> {
    const positions: Array<{ gx: number; gy: number }> = [];
    const used = new Set<string>();
    const grid = CONFIG.WORLD.GRID_SIZE;
    let attempts = 0;
    while (positions.length < count && attempts < count * 20) {
      attempts++;
      const gx = Math.floor(Math.random() * (grid - padding * 2)) + padding;
      const gy = Math.floor(Math.random() * (grid - padding * 2)) + padding;
      const key = `${gx},${gy}`;
      if (!used.has(key)) {
        used.add(key);
        positions.push({ gx, gy });
      }
    }
    return positions;
  }

  private spawnCorals(): void {
    const positions = this.getGridPositions(CONFIG.CORAL.COUNT, 0);
    positions.forEach(pos => {
      const cell = CONFIG.WORLD.CELL_SIZE;
      const x = pos.gx * cell + cell / 2 + (Math.random() - 0.5) * cell * 0.6;
      const y = pos.gy * cell + cell / 2 + (Math.random() - 0.5) * cell * 0.6;
      const size = CONFIG.CORAL.MIN_SIZE + Math.random() * (CONFIG.CORAL.MAX_SIZE - CONFIG.CORAL.MIN_SIZE);
      const color = CONFIG.CORAL.COLORS[Math.floor(Math.random() * CONFIG.CORAL.COLORS.length)];
      const coral: CoralReef = {
        id: nextId('coral'),
        type: 'coral',
        x,
        y,
        width: size,
        height: size,
        active: true,
        color,
        baseSize: size,
        wavePhase: Math.random() * Math.PI * 2
      };
      this.addEntity(coral);
    });
  }

  private spawnWrecks(): void {
    const subPositions = this.getGridPositions(CONFIG.WRECK.SUBMARINE_COUNT, 1);
    subPositions.forEach(pos => {
      const cell = CONFIG.WORLD.CELL_SIZE;
      const x = pos.gx * cell + cell / 2 + (Math.random() - 0.5) * cell * 0.4;
      const y = pos.gy * cell + cell / 2 + (Math.random() - 0.5) * cell * 0.4;
      const sub: Wreck = {
        id: nextId('sub'),
        type: 'submarine',
        x,
        y,
        width: CONFIG.WRECK.SUB_SIZE,
        height: CONFIG.WRECK.SUB_SIZE * 0.5,
        active: true,
        rotation: Math.random() * Math.PI * 2,
        wavePhase: Math.random() * Math.PI * 2
      };
      this.addEntity(sub);
    });

    const shipPositions = this.getGridPositions(CONFIG.WRECK.SHIP_COUNT, 1);
    shipPositions.forEach(pos => {
      const cell = CONFIG.WORLD.CELL_SIZE;
      const x = pos.gx * cell + cell / 2 + (Math.random() - 0.5) * cell * 0.3;
      const y = pos.gy * cell + cell / 2 + (Math.random() - 0.5) * cell * 0.3;
      const ship: Wreck = {
        id: nextId('ship'),
        type: 'shipwreck',
        x,
        y,
        width: CONFIG.WRECK.SHIP_SIZE,
        height: CONFIG.WRECK.SHIP_SIZE * 0.6,
        active: true,
        rotation: (Math.random() - 0.5) * 0.5,
        wavePhase: Math.random() * Math.PI * 2
      };
      this.addEntity(ship);
    });
  }

  private spawnPlankton(): void {
    const cell = CONFIG.WORLD.CELL_SIZE;
    const grid = CONFIG.WORLD.GRID_SIZE;
    for (let i = 0; i < CONFIG.PLANKTON.COUNT; i++) {
      const x = Math.random() * grid * cell;
      const y = Math.random() * grid * cell;
      const particles: PlanktonGroup['particles'] = [];
      for (let j = 0; j < CONFIG.PLANKTON.PARTICLES_PER_GROUP; j++) {
        particles.push({
          offsetX: (Math.random() - 0.5) * CONFIG.PLANKTON.SPREAD,
          offsetY: (Math.random() - 0.5) * CONFIG.PLANKTON.SPREAD,
          phase: Math.random() * Math.PI * 2,
          size: CONFIG.PLANKTON.SIZE + Math.random() * 2
        });
      }
      const group: PlanktonGroup = {
        id: nextId('plankton'),
        type: 'plankton',
        x,
        y,
        width: CONFIG.PLANKTON.SPREAD * 2,
        height: CONFIG.PLANKTON.SPREAD * 2,
        active: true,
        particles
      };
      this.addEntity(group);
    }
  }

  private spawnTreasures(): void {
    const positions = this.getGridPositions(8, 1);
    positions.forEach(pos => {
      const cell = CONFIG.WORLD.CELL_SIZE;
      const x = pos.gx * cell + cell / 2 + (Math.random() - 0.5) * cell * 0.4;
      const y = pos.gy * cell + cell / 2 + (Math.random() - 0.5) * cell * 0.4;
      const chest: TreasureChest = {
        id: nextId('chest'),
        type: 'treasure',
        x,
        y,
        width: CONFIG.TREASURE.SIZE,
        height: CONFIG.TREASURE.SIZE * 0.75,
        active: true,
        isOpen: false,
        openingProgress: 0,
        openStartTime: 0
      };
      this.addEntity(chest);
    });
  }

  spawnOxygenBubble(): void {
    const worldW = CONFIG.WORLD.width;
    const bubble: OxygenBubble = {
      id: nextId('bubble'),
      type: 'oxygenBubble',
      x: Math.random() * (worldW - 100) + 50,
      y: CONFIG.WORLD.height + 30,
      width: CONFIG.OXYGEN.BUBBLE_RADIUS * 2,
      height: CONFIG.OXYGEN.BUBBLE_RADIUS * 2,
      active: true,
      vy: -CONFIG.OXYGEN.BUBBLE_RISE_SPEED,
      pulsePhase: Math.random() * Math.PI * 2
    };
    this.addEntity(bubble);
  }

  spawnBurstParticles(x: number, y: number, color: string, count: number = CONFIG.PARTICLE.BUBBLE_BURST_COUNT): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 60;
      const particle: Particle = {
        id: nextId('particle'),
        type: 'particle',
        x,
        y,
        width: CONFIG.PARTICLE.DEFAULT_SIZE,
        height: CONFIG.PARTICLE.DEFAULT_SIZE,
        active: true,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: CONFIG.PARTICLE.DEFAULT_LIFETIME,
        maxLife: CONFIG.PARTICLE.DEFAULT_LIFETIME,
        size: CONFIG.PARTICLE.DEFAULT_SIZE + Math.random() * 3
      };
      this.addEntity(particle);
    }
  }

  spawnFloatText(x: number, y: number, text: string, color: string): void {
    const ft: FloatText = {
      id: nextId('float'),
      type: 'floatText',
      x,
      y,
      width: 80,
      height: 30,
      active: true,
      text,
      color,
      life: CONFIG.TREASURE.FLOAT_TEXT_DURATION,
      maxLife: CONFIG.TREASURE.FLOAT_TEXT_DURATION,
      startY: y
    };
    this.addEntity(ft);
  }

  update(dt: number, state: GameState, input: InputState): void {
    const time = performance.now();
    this.updatePlayer(dt, state, input);
    this.updateCorals(dt, time);
    this.updateWrecks(dt, time);
    this.updateBubbles(dt);
    this.updateTreasures(dt, time);
    this.updatePlankton(dt, time);
    this.updateParticles(dt);
    this.updateFloatTexts(dt);
    this.handleCollisions(state);
    this.cleanup();
  }

  private updatePlayer(dt: number, state: GameState, input: InputState): void {
    const player = this.getPlayer();
    if (!player || !state.isRunning) return;

    let ax = 0;
    let ay = 0;

    if (input.joystickActive) {
      ax = input.joystickX * CONFIG.PLAYER.ACCELERATION;
      ay = input.joystickY * CONFIG.PLAYER.ACCELERATION;
    } else {
      if (input.left) ax -= CONFIG.PLAYER.ACCELERATION;
      if (input.right) ax += CONFIG.PLAYER.ACCELERATION;
      if (input.up) ay -= CONFIG.PLAYER.ACCELERATION;
      if (input.down) ay += CONFIG.PLAYER.ACCELERATION;
    }

    player.vx += ax * dt;
    player.vy += ay * dt;

    const friction = Math.pow(0.001, CONFIG.PLAYER.FRICTION * dt);
    player.vx *= friction;
    player.vy *= friction;

    const speed = Math.hypot(player.vx, player.vy);
    if (speed > CONFIG.PLAYER.MAX_SPEED) {
      const scale = CONFIG.PLAYER.MAX_SPEED / speed;
      player.vx *= scale;
      player.vy *= scale;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    const margin = CONFIG.PLAYER.SIZE / 2;
    player.x = Math.max(margin, Math.min(CONFIG.WORLD.width - margin, player.x));
    player.y = Math.max(margin, Math.min(CONFIG.WORLD.height - margin, player.y));

    if (Math.abs(player.vx) > 10 || Math.abs(player.vy) > 10) {
      player.angle = Math.atan2(player.vy, player.vx);
    }
  }

  private updateCorals(_dt: number, time: number): void {
    const corals = this.getEntitiesByType<CoralReef>('coral');
    corals.forEach(c => {
      const wave = Math.sin(time * 0.001 * CONFIG.OCEAN.WAVE_SPEED + c.wavePhase);
      c.width = c.baseSize * (1 + wave * 0.04);
      c.height = c.baseSize * (1 - wave * 0.03);
    });
  }

  private updateWrecks(_dt: number, time: number): void {
    const subs = this.getEntitiesByType<Wreck>('submarine');
    const ships = this.getEntitiesByType<Wreck>('shipwreck');
    [...subs, ...ships].forEach(w => {
      w.rotation += Math.sin(time * 0.0005 + w.wavePhase) * 0.001;
    });
  }

  private updateBubbles(dt: number): void {
    const bubbles = this.getEntitiesByType<OxygenBubble>('oxygenBubble');
    bubbles.forEach(b => {
      b.y += b.vy * dt;
      b.pulsePhase += dt * 4;
      if (b.y < -40) {
        b.active = false;
      }
    });
  }

  private updateTreasures(dt: number, time: number): void {
    const chests = this.getEntitiesByType<TreasureChest>('treasure');
    chests.forEach(c => {
      if (c.isOpen && c.openingProgress < 1) {
        const elapsed = time - c.openStartTime;
        c.openingProgress = Math.min(1, elapsed / CONFIG.TREASURE.OPEN_ANIM_DURATION);
      }
    });
    void dt;
  }

  private updatePlankton(_dt: number, time: number): void {
    const groups = this.getEntitiesByType<PlanktonGroup>('plankton');
    groups.forEach(g => {
      g.particles.forEach(p => {
        p.phase += 0.02;
        p.offsetX += Math.sin(p.phase) * 0.15;
        p.offsetY += Math.cos(p.phase * 0.8) * 0.15;
      });
      const drift = Math.sin(time * 0.0003 + g.x * 0.01) * 0.3;
      g.x += drift;
      g.y += Math.cos(time * 0.0004 + g.y * 0.01) * 0.2;
    });
  }

  private updateParticles(dt: number): void {
    const particles = this.getEntitiesByType<Particle>('particle');
    particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt * 1000;
      if (p.life <= 0) p.active = false;
    });
  }

  private updateFloatTexts(dt: number): void {
    const texts = this.getEntitiesByType<FloatText>('floatText');
    texts.forEach(t => {
      t.life -= dt * 1000;
      const progress = 1 - t.life / t.maxLife;
      t.y = t.startY - progress * CONFIG.TREASURE.FLOAT_TEXT_DISTANCE;
      if (t.life <= 0) t.active = false;
    });
  }

  private handleCollisions(state: GameState): void {
    if (!state.isRunning) return;
    const player = this.getPlayer();
    if (!player) return;

    const bubbles = this.getEntitiesByType<OxygenBubble>('oxygenBubble');
    bubbles.forEach(b => {
      if (!b.active) return;
      const dist = Math.hypot(player.x - b.x, player.y - b.y);
      if (dist < CONFIG.PLAYER.SIZE / 2 + CONFIG.OXYGEN.BUBBLE_RADIUS) {
        b.active = false;
        player.oxygen = Math.min(CONFIG.OXYGEN.MAX, player.oxygen + CONFIG.OXYGEN.BUBBLE_RESTORE);
        this.spawnBurstParticles(b.x, b.y, '#66CCFF', CONFIG.PARTICLE.BUBBLE_BURST_COUNT);
      }
    });
  }

  tryOpenTreasure(state: GameState): boolean {
    const player = this.getPlayer();
    if (!player) return false;
    const chests = this.getEntitiesByType<TreasureChest>('treasure');
    let nearest: TreasureChest | null = null;
    let nearestDist = Infinity;

    for (const c of chests) {
      if (c.isOpen || !c.active) continue;
      const dist = Math.hypot(player.x - c.x, player.y - c.y);
      if (dist < CONFIG.PLAYER.INTERACT_RADIUS && dist < nearestDist) {
        nearest = c;
        nearestDist = dist;
      }
    }

    if (nearest) {
      nearest.isOpen = true;
      nearest.openStartTime = performance.now();
      const reward = this.pickReward();
      state.coins += reward.value;
      this.spawnFloatText(nearest.x, nearest.y - 20, reward.text, CONFIG.COLORS.GOLD);
      this.spawnBurstParticles(nearest.x, nearest.y, CONFIG.COLORS.GOLD, 8);
      return true;
    }
    return false;
  }

  private pickReward(): { text: string; value: number } {
    const total = CONFIG.TREASURE.REWARDS.reduce((s, r) => s + r.weight, 0);
    let r = Math.random() * total;
    for (const reward of CONFIG.TREASURE.REWARDS) {
      r -= reward.weight;
      if (r <= 0) return reward;
    }
    return CONFIG.TREASURE.REWARDS[0];
  }

  private cleanup(): void {
    this.entities.forEach((list, type) => {
      const filtered = list.filter(e => e.active);
      this.entities.set(type, filtered);
    });
  }

  render(ctx: CanvasRenderingContext2D, viewW: number, viewH: number, time: number): void {
    this.renderOceanBackground(ctx, viewW, viewH, time);
    ctx.save();
    ctx.translate(viewW / 2 - this.camera.x, viewH / 2 - this.camera.y);
    this.renderGrid(ctx);
    this.renderCorals(ctx, time);
    this.renderPlankton(ctx, time);
    this.renderWrecks(ctx, time);
    this.renderTreasures(ctx, time);
    this.renderBubbles(ctx, time);
    this.renderPlayer(ctx, time);
    this.renderParticles(ctx);
    this.renderFloatTexts(ctx);
    ctx.restore();
  }

  private renderOceanBackground(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    const t = time * 0.0003;
    gradient.addColorStop(0, `hsl(${195 + Math.sin(t) * 5}, 70%, ${14 + Math.sin(t * 0.7) * 2}%)`);
    gradient.addColorStop(0.5, `hsl(${185 + Math.cos(t) * 5}, 65%, ${18 + Math.sin(t * 1.3) * 2}%)`);
    gradient.addColorStop(1, `hsl(${175 + Math.sin(t * 0.5) * 8}, 75%, ${10 + Math.cos(t) * 2}%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < 5; i++) {
      const y = ((time * 10 + i * 150) % (h + 200)) - 100;
      ctx.beginPath();
      ctx.strokeStyle = CONFIG.COLORS.NEON_GREEN;
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 8) {
        const yy = y + Math.sin((x + time * 20) * 0.01 + i) * CONFIG.OCEAN.WAVE_AMPLITUDE;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderGrid(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = CONFIG.COLORS.TEAL;
    ctx.lineWidth = 1;
    const cell = CONFIG.WORLD.CELL_SIZE;
    for (let x = 0; x <= CONFIG.WORLD.width; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CONFIG.WORLD.height);
      ctx.stroke();
    }
    for (let y = 0; y <= CONFIG.WORLD.height; y += cell) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CONFIG.WORLD.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderCorals(ctx: CanvasRenderingContext2D, time: number): void {
    const corals = this.getEntitiesByType<CoralReef>('coral');
    corals.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      const wave = Math.sin(time * 0.001 + c.wavePhase) * 3;
      ctx.rotate(wave * 0.015);

      ctx.shadowColor = c.color;
      ctx.shadowBlur = 15;

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const len = c.baseSize * (0.6 + Math.sin(c.wavePhase + i) * 0.2);
        const ex = Math.cos(angle) * len * 0.4;
        const ey = Math.sin(angle) * len * 0.4 - len * 0.3;
        ctx.beginPath();
        ctx.fillStyle = c.color;
        ctx.ellipse(ex, ey, len * 0.18, len * 0.45, angle, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.fillStyle = this.darkenColor(c.color, 0.3);
      ctx.ellipse(0, c.baseSize * 0.1, c.baseSize * 0.3, c.baseSize * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  private renderPlankton(ctx: CanvasRenderingContext2D, time: number): void {
    const groups = this.getEntitiesByType<PlanktonGroup>('plankton');
    groups.forEach(g => {
      g.particles.forEach(p => {
        const alpha = 0.6 + Math.sin(time * 0.003 + p.phase) * 0.4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = CONFIG.COLORS.NEON_GREEN;
        ctx.shadowBlur = 10;
        ctx.fillStyle = CONFIG.COLORS.NEON_GREEN;
        ctx.beginPath();
        ctx.arc(g.x + p.offsetX, g.y + p.offsetY, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    });
  }

  private renderWrecks(ctx: CanvasRenderingContext2D, _time: number): void {
    const subs = this.getEntitiesByType<Wreck>('submarine');
    subs.forEach(s => this.renderSubmarine(ctx, s));

    const ships = this.getEntitiesByType<Wreck>('shipwreck');
    ships.forEach(s => this.renderShip(ctx, s));
  }

  private renderSubmarine(ctx: CanvasRenderingContext2D, s: Wreck): void {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);

    ctx.fillStyle = CONFIG.COLORS.METAL_DARK;
    ctx.strokeStyle = CONFIG.COLORS.METAL_LIGHT;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(0, 0, s.width * 0.5, s.height * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const grad = ctx.createLinearGradient(-s.width * 0.5, 0, s.width * 0.5, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.15)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.35)');
    grad.addColorStop(0.6, 'rgba(255,255,255,0.1)');
    grad.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, -s.height * 0.15, s.width * 0.48, s.height * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * s.width * 0.15, -s.height * 0.1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.stroke();
    }

    ctx.fillStyle = CONFIG.COLORS.METAL_DARK;
    ctx.fillRect(-s.width * 0.08, -s.height * 0.85, s.width * 0.16, s.height * 0.4);
    ctx.strokeRect(-s.width * 0.08, -s.height * 0.85, s.width * 0.16, s.height * 0.4);

    ctx.fillStyle = '#aa3333';
    ctx.fillRect(s.width * 0.4, -s.height * 0.15, s.width * 0.1, s.height * 0.3);

    ctx.restore();
  }

  private renderShip(ctx: CanvasRenderingContext2D, s: Wreck): void {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);

    ctx.fillStyle = CONFIG.COLORS.WOOD_DARK;
    ctx.strokeStyle = CONFIG.COLORS.WOOD_LIGHT;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-s.width * 0.5, 0);
    ctx.lineTo(-s.width * 0.35, s.height * 0.5);
    ctx.lineTo(s.width * 0.35, s.height * 0.5);
    ctx.lineTo(s.width * 0.5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = CONFIG.COLORS.WOOD_LIGHT;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s.width * 0.1, s.height * 0.05);
      ctx.lineTo(i * s.width * 0.1 - 4, s.height * 0.45);
      ctx.strokeStyle = CONFIG.COLORS.WOOD_DARK;
      ctx.stroke();
    }

    ctx.fillStyle = CONFIG.COLORS.WOOD_DARK;
    ctx.fillRect(-s.width * 0.04, -s.height * 0.8, s.width * 0.08, s.height * 0.85);
    ctx.strokeStyle = CONFIG.COLORS.WOOD_LIGHT;
    ctx.strokeRect(-s.width * 0.04, -s.height * 0.8, s.width * 0.08, s.height * 0.85);

    ctx.beginPath();
    ctx.moveTo(s.width * 0.04, -s.height * 0.75);
    ctx.lineTo(s.width * 0.35, -s.height * 0.55);
    ctx.lineTo(s.width * 0.04, -s.height * 0.35);
    ctx.closePath();
    ctx.fillStyle = '#d4c4a8';
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = CONFIG.COLORS.WOOD_DARK;
    ctx.stroke();

    ctx.restore();
  }

  private renderTreasures(ctx: CanvasRenderingContext2D, time: number): void {
    const chests = this.getEntitiesByType<TreasureChest>('treasure');
    const player = this.getPlayer();
    chests.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);

      const isNear = player ? Math.hypot(player.x - c.x, player.y - c.y) < CONFIG.PLAYER.INTERACT_RADIUS : false;
      const glowIntensity = (c.isOpen ? 0.3 : 0.6) + Math.sin(time * 0.005) * 0.2;
      ctx.shadowColor = CONFIG.COLORS.GOLD;
      ctx.shadowBlur = isNear ? 25 + glowIntensity * 15 : 15 + glowIntensity * 8;

      ctx.fillStyle = CONFIG.COLORS.WOOD_DARK;
      ctx.strokeStyle = CONFIG.COLORS.GOLD;
      ctx.lineWidth = 2;

      const w = c.width;
      const h = c.height;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 4, w, h * 0.75, 4);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = CONFIG.COLORS.GOLD;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.lineTo(w / 2, 0);
      ctx.stroke();

      if (!c.isOpen) {
        ctx.fillStyle = CONFIG.COLORS.WOOD_DARK;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 4);
        ctx.quadraticCurveTo(0, -h * 0.75, w / 2, -h / 4);
        ctx.lineTo(w / 2, 0);
        ctx.lineTo(-w / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = CONFIG.COLORS.GOLD;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = CONFIG.COLORS.GOLD;
        ctx.fillRect(-4, -h * 0.15, 8, 10);
      } else {
        const lidAngle = c.openingProgress * Math.PI * 0.7;
        ctx.save();
        ctx.translate(-w / 2, -h / 4);
        ctx.rotate(-lidAngle);
        ctx.fillStyle = CONFIG.COLORS.WOOD_DARK;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(w / 2, -h * 0.65, w, 0);
        ctx.lineTo(w, h / 4);
        ctx.lineTo(0, h / 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = CONFIG.COLORS.GOLD;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        if (c.openingProgress > 0.5) {
          ctx.globalAlpha = c.openingProgress * 0.6;
          ctx.fillStyle = CONFIG.COLORS.GOLD;
          ctx.beginPath();
          ctx.arc(0, -h * 0.1, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      ctx.restore();
    });
  }

  private renderBubbles(ctx: CanvasRenderingContext2D, _time: number): void {
    const bubbles = this.getEntitiesByType<OxygenBubble>('oxygenBubble');
    bubbles.forEach(b => {
      ctx.save();
      const r = CONFIG.OXYGEN.BUBBLE_RADIUS + Math.sin(b.pulsePhase) * 2;
      const grad = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.3, 1, b.x, b.y, r);
      grad.addColorStop(0, 'rgba(180,230,255,0.9)');
      grad.addColorStop(0.5, 'rgba(100,180,255,0.5)');
      grad.addColorStop(1, 'rgba(60,140,220,0.15)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(180,230,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(b.x - r * 0.35, b.y - r * 0.35, r * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, time: number): void {
    const player = this.getPlayer();
    if (!player) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    const size = CONFIG.PLAYER.SIZE;
    const bob = Math.sin(time * 0.004) * 2;
    ctx.translate(0, bob);

    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 12;

    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.strokeStyle = '#AA7722';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.55, size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#553322';
    ctx.fillRect(size * 0.2, -size * 0.3, size * 0.25, size * 0.6);

    ctx.fillStyle = '#224466';
    ctx.beginPath();
    ctx.arc(-size * 0.1, 0, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#113355';
    ctx.stroke();

    ctx.fillStyle = 'rgba(150,200,255,0.8)';
    ctx.beginPath();
    ctx.arc(-size * 0.12, -size * 0.05, size * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-size * 0.18, -size * 0.1, size * 0.06, 0, Math.PI * 2);
    ctx.fill();

    const speed = Math.hypot(player.vx, player.vy);
    if (speed > 30) {
      ctx.globalAlpha = Math.min(0.6, speed / CONFIG.PLAYER.MAX_SPEED);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#aaddff';
        ctx.beginPath();
        ctx.arc(
          size * 0.5 + i * 8 + Math.random() * 4,
          (Math.random() - 0.5) * size * 0.3,
          2 + Math.random() * 2,
          0, Math.PI * 2
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    const particles = this.getEntitiesByType<Particle>('particle');
    particles.forEach(p => {
      ctx.save();
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private renderFloatTexts(ctx: CanvasRenderingContext2D): void {
    const texts = this.getEntitiesByType<FloatText>('floatText');
    texts.forEach(t => {
      ctx.save();
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  }

  private darkenColor(hex: string, amount: number): string {
    const c = hex.replace('#', '');
    const r = Math.max(0, parseInt(c.substring(0, 2), 16) * (1 - amount));
    const g = Math.max(0, parseInt(c.substring(2, 4), 16) * (1 - amount));
    const b = Math.max(0, parseInt(c.substring(4, 6), 16) * (1 - amount));
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }
}
