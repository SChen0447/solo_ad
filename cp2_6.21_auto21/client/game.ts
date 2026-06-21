import {
  GameState,
  RoleType,
  FieldPlot,
  Stove,
  CustomerSpot,
  ITEMS,
  RECIPES,
  PLANTS,
  SEASONINGS,
  ROLE_NAMES,
  ItemTransfer,
  drawOrderBanner,
  drawProgressBar,
  drawCoinIcon,
  canCook,
} from './resources.js';
import { PixelRole, getRoleSpawnPosition } from './role.js';

export interface GameCallbacks {
  onPlant: (fieldIndex: number, plantId: string) => void;
  onHarvest: (fieldIndex: number) => void;
  onStartCook: (stoveIndex: number, recipeId: string) => void;
  onFinishCook: (stoveIndex: number) => void;
  onSell: (spotIndex: number, dishId: string) => void;
  onRestockSeasoning: (seasoningId: string) => void;
  onPlayerMove: (x: number, y: number) => void;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  state: GameState;
  roles: Record<string, PixelRole> = {};
  selfId: string;
  selfRole: RoleType;
  callbacks: GameCallbacks;
  lastTime: number = 0;
  running: boolean = false;
  animFrameId: number = 0;

  private plotClickCache: { index: number; x: number; y: number; w: number; h: number }[] = [];
  private stoveClickCache: { index: number; x: number; y: number; w: number; h: number }[] = [];
  private customerClickCache: { index: number; x: number; y: number; w: number; h: number }[] = [];
  private seedMenuActive: { fieldIndex: number } | null = null;
  private cookMenuActive: { stoveIndex: number } | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    initialState: GameState,
    selfId: string,
    selfRole: RoleType,
    callbacks: GameCallbacks
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.state = initialState;
    this.selfId = selfId;
    this.selfRole = selfRole;
    this.callbacks = callbacks;

    this.syncRolesFromState();
    this.rebuildClickCaches();
    this.bindInput();
  }

  syncRolesFromState() {
    for (const [id, p] of Object.entries(this.state.players)) {
      if (!this.roles[id]) {
        const spawn = getRoleSpawnPosition(p.role);
        const r = new PixelRole(id, p.role, ROLE_NAMES[p.role], spawn.x, spawn.y, id === this.selfId);
        r.data.x = p.x;
        r.data.y = p.y;
        r.data.direction = p.direction;
        r.data.animFrame = p.animFrame;
        r.data.moving = p.moving;
        this.roles[id] = r;
      } else {
        const r = this.roles[id];
        if (id !== this.selfId) {
          r.setTarget(p.x, p.y);
        }
        r.data.direction = p.direction;
        r.data.animFrame = p.animFrame;
      }
    }
    for (const id of Object.keys(this.roles)) {
      if (!this.state.players[id]) {
        delete this.roles[id];
      }
    }
  }

  updateState(state: GameState) {
    this.state = state;
    this.syncRolesFromState();
    this.rebuildClickCaches();
  }

  rebuildClickCaches() {
    this.plotClickCache = this.state.fields.map((f) => ({
      index: f.index,
      x: f.x,
      y: f.y,
      w: 45,
      h: 60,
    }));
    this.stoveClickCache = this.state.stoves.map((s) => ({
      index: s.index,
      x: s.x,
      y: s.y,
      w: 45,
      h: 45,
    }));
    this.customerClickCache = this.state.customerSpots.map((c) => ({
      index: c.index,
      x: c.x,
      y: c.y,
      w: 45,
      h: 45,
    }));
  }

  bindInput() {
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (this.seedMenuActive) {
      for (let i = 0; i < 4; i++) {
        const sx = 20 + i * 60;
        const sy = 520;
        if (mx >= sx && mx <= sx + 50 && my >= sy && my <= sy + 50) {
          const plantIds = Object.keys(PLANTS);
          this.callbacks.onPlant(this.seedMenuActive.fieldIndex, plantIds[i]);
          this.seedMenuActive = null;
          return;
        }
      }
      this.seedMenuActive = null;
      return;
    }

    if (this.cookMenuActive) {
      const recipeIds = Object.keys(RECIPES);
      for (let i = 0; i < recipeIds.length; i++) {
        const sx = 20 + i * 150;
        const sy = 510;
        if (mx >= sx && mx <= sx + 140 && my >= sy && my <= sy + 60) {
          this.callbacks.onStartCook(this.cookMenuActive.stoveIndex, recipeIds[i]);
          this.cookMenuActive = null;
          return;
        }
      }
      this.cookMenuActive = null;
      return;
    }

    if (this.selfRole === 'farmer') {
      for (const c of this.plotClickCache) {
        if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
          const f = this.state.fields[c.index];
          if (f.state === 'empty') {
            this.seedMenuActive = { fieldIndex: c.index };
          } else if (f.state === 'grown') {
            this.callbacks.onHarvest(c.index);
          }
          this.moveSelfTo(c.x + c.w / 2, c.y + c.h);
          return;
        }
      }
    }

    if (this.selfRole === 'chef') {
      for (const c of this.stoveClickCache) {
        if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
          const s = this.state.stoves[c.index];
          if (s.state === 'idle') {
            this.cookMenuActive = { stoveIndex: c.index };
          }
          this.moveSelfTo(c.x + c.w / 2, c.y + c.h + 10);
          return;
        }
      }
    }

    if (this.selfRole === 'merchant') {
      for (const c of this.customerClickCache) {
        if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
          const cs = this.state.customerSpots[c.index];
          if (cs.waiting && cs.wantedDish && (this.state.inventory.merchant[cs.wantedDish] || 0) > 0) {
            this.callbacks.onSell(c.index, cs.wantedDish);
          }
          this.moveSelfTo(c.x + c.w / 2, c.y + c.h + 10);
          return;
        }
      }
    }

    this.moveSelfTo(mx, my);
  }

  moveSelfTo(tx: number, ty: number) {
    const r = this.roles[this.selfId];
    if (!r) return;
    const minX = this.getRoleBounds().minX;
    const maxX = this.getRoleBounds().maxX;
    tx = Math.max(minX + 20, Math.min(maxX - 20, tx));
    ty = Math.max(140, Math.min(520, ty));
    r.setTarget(tx, ty);
    this.callbacks.onPlayerMove(r.data.x, r.data.y);
  }

  private getRoleBounds(): { minX: number; maxX: number } {
    switch (this.selfRole) {
      case 'farmer':
        return { minX: 20, maxX: 260 };
      case 'chef':
        return { minX: 280, maxX: 520 };
      case 'merchant':
        return { minX: 540, maxX: 780 };
    }
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
  }

  private loop(t: number) {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.lastTime) / 1000);
    this.lastTime = t;

    this.update(dt, t);
    this.render(t);

    this.animFrameId = requestAnimationFrame((nt) => this.loop(nt));
  }

  private update(dt: number, now: number) {
    for (const role of Object.values(this.roles)) {
      const wasX = role.data.x;
      const wasY = role.data.y;
      role.update(dt);
      role.updateAnimation(now);
      if (role.data.id === this.selfId && (role.data.x !== wasX || role.data.y !== wasY)) {
        this.callbacks.onPlayerMove(role.data.x, role.data.y);
      }
    }

    const nowMs = now;
    for (const f of this.state.fields) {
      if (f.state === 'planted' && f.plantedAt && nowMs - f.plantedAt >= f.growTimeMs) {
        f.state = 'grown';
      }
    }
    for (const s of this.state.stoves) {
      if (s.state === 'cooking' && s.startedAt && s.cookTimeMs && nowMs - s.startedAt >= s.cookTimeMs) {
        s.state = 'idle';
        if (s.recipeId) {
          const recipe = RECIPES[s.recipeId];
          if (recipe) {
            this.state.inventory.chef[recipe.result] = (this.state.inventory.chef[recipe.result] || 0) + 1;
          }
        }
        s.recipeId = undefined;
        s.startedAt = undefined;
        s.cookTimeMs = undefined;
      }
    }

    this.state.activeTransfers = this.state.activeTransfers.filter((tr) => {
      if (!tr._clientStartTime) (tr as any)._clientStartTime = performance.now();
      tr.progress = Math.min(1, (performance.now() - (tr as any)._clientStartTime) / tr.duration);
      return tr.progress < 1;
    });
  }

  private render(now: number) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.fillStyle = '#2D5A27';
    ctx.fillRect(0, 0, W, H);

    this.drawGround(ctx, W, H);
    this.drawZones(ctx, W, H);
    this.drawFields(ctx, now);
    this.drawStoves(ctx, now);
    this.drawCustomers(ctx, now);

    const rolesSorted = Object.values(this.roles).sort((a, b) => a.data.y - b.data.y);
    for (const r of rolesSorted) {
      r.draw(ctx, 2);
    }

    this.drawTransfers(ctx, now);

    drawOrderBanner(ctx, W, this.state.currentOrder, now);

    this.drawCoinDisplay(ctx, W);

    this.drawFloatingMenus(ctx, now);

    this.drawFPS(ctx, now);
  }

  private drawGround(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(0, 120, W, H - 120);

    ctx.fillStyle = '#7A4D24';
    for (let y = 120; y < H; y += 24) {
      for (let x = (y % 48 === 0 ? 0 : 12); x < W; x += 24) {
        ctx.fillRect(x, y, 10, 10);
      }
    }
  }

  private drawZones(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.fillStyle = '#6B8E23';
    ctx.fillRect(10, 130, 260, H - 150);
    ctx.strokeStyle = '#4a6b14';
    ctx.lineWidth = 1;
    for (let y = 140; y < H - 20; y += 30) {
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(270, y);
      ctx.stroke();
    }
    for (let x = 40; x < 270; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 130);
      ctx.lineTo(x, H - 20);
      ctx.stroke();
    }

    ctx.fillStyle = '#F5DEB3';
    ctx.fillRect(274, 130, 248, H - 150);
    ctx.fillStyle = '#E8CD9A';
    for (let y = 130; y < H - 20; y += 40) {
      ctx.fillRect(274, y, 248, 2);
    }

    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(526, 130, 264, H - 150);
    ctx.fillStyle = '#70B8DB';
    for (let x = 526; x < 790; x += 38) {
      ctx.fillRect(x, 130, 2, H - 150);
    }

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(268, 120, 6, H - 130);
    ctx.fillRect(520, 120, 6, H - 130);

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('🌱 农场', 140, 124);
    ctx.fillText('🍳 厨房', 400, 124);
    ctx.fillText('🛒 商店', 660, 124);
  }

  private drawFields(ctx: CanvasRenderingContext2D, now: number) {
    for (const f of this.state.fields) {
      this.drawPlot(ctx, f, now);
    }
  }

  private drawPlot(ctx: CanvasRenderingContext2D, f: FieldPlot, now: number) {
    ctx.fillStyle = '#5D3A1A';
    ctx.fillRect(f.x, f.y, 45, 60);
    ctx.fillStyle = '#4A2E14';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(f.x + 4, f.y + 8 + i * 18, 37, 10);
    }

    if (f.state === 'planted' && f.plantId && f.plantedAt) {
      const p = (now - f.plantedAt) / f.growTimeMs;
      const plantData = (PLANTS as any)[f.plantId];
      if (plantData) {
        const h = 2 + Math.floor(p * 30);
        ctx.fillStyle = '#228B22';
        ctx.fillRect(f.x + 20, f.y + 40 - h, 5, h);
        ctx.fillStyle = plantData.color;
        if (p > 0.5) {
          ctx.fillRect(f.x + 16, f.y + 40 - h - 6, 13, 10);
        }
        drawProgressBar(ctx, f.x, f.y + 62, 45, 4, p, '#90EE90', '#32CD32');
      }
    } else if (f.state === 'grown' && f.plantId) {
      const plantData = (PLANTS as any)[f.plantId];
      if (plantData) {
        ctx.fillStyle = '#228B22';
        ctx.fillRect(f.x + 20, f.y + 12, 5, 28);
        ctx.fillStyle = plantData.color;
        ctx.fillRect(f.x + 13, f.y + 4, 19, 16);
        ctx.fillStyle = '#ffff66';
        ctx.fillRect(f.x + 34, f.y - 2, 10, 10);
        ctx.fillStyle = '#333';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillText('!', f.x + 38, f.y + 6);
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('+', f.x + 22, f.y + 36);
    }
  }

  private drawStoves(ctx: CanvasRenderingContext2D, now: number) {
    for (const s of this.state.stoves) {
      this.drawStove(ctx, s, now);
    }
  }

  private drawStove(ctx: CanvasRenderingContext2D, s: Stove, now: number) {
    ctx.fillStyle = '#444';
    ctx.fillRect(s.x, s.y, 45, 45);
    ctx.fillStyle = '#222';
    ctx.fillRect(s.x + 4, s.y + 4, 37, 20);

    ctx.fillStyle = s.state === 'cooking' ? '#ff6600' : '#555';
    ctx.beginPath();
    ctx.arc(s.x + 12, s.y + 35, 4, 0, Math.PI * 2);
    ctx.arc(s.x + 33, s.y + 35, 4, 0, Math.PI * 2);
    ctx.fill();

    if (s.state === 'cooking' && s.recipeId && s.startedAt && s.cookTimeMs) {
      const p = Math.min(1, (now - s.startedAt) / s.cookTimeMs);
      const recipe = RECIPES[s.recipeId];
      if (recipe) {
        ctx.fillStyle = recipe.result ? ITEMS[recipe.result]?.color || '#fff' : '#fff';
        ctx.fillRect(s.x + 10, s.y + 6, 25, 16);
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(recipe.emoji, s.x + 22, s.y + 20);

        if (Math.floor(now / 200) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.font = '10px sans-serif';
          ctx.fillText('♨', s.x + 22, s.y - 2);
        }
      }
      drawProgressBar(ctx, s.x, s.y + 47, 45, 4, p, '#ff9900', '#ff6600');
    }
  }

  private drawCustomers(ctx: CanvasRenderingContext2D, now: number) {
    for (const cs of this.state.customerSpots) {
      this.drawCustomerSpot(ctx, cs, now);
    }
  }

  private drawCustomerSpot(ctx: CanvasRenderingContext2D, cs: CustomerSpot, now: number) {
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(cs.x, cs.y, 45, 45);
    ctx.fillStyle = '#6B5344';
    ctx.fillRect(cs.x, cs.y, 45, 10);

    if (cs.waiting && cs.wantedDish) {
      const dish = ITEMS[cs.wantedDish];
      if (dish) {
        const bob = Math.sin(now / 300) * 2;

        ctx.fillStyle = '#FFDBAC';
        ctx.fillRect(cs.x + 14, cs.y + 16 + bob, 17, 17);
        ctx.fillStyle = '#333';
        ctx.fillRect(cs.x + 16, cs.y + 22 + bob, 3, 3);
        ctx.fillRect(cs.x + 26, cs.y + 22 + bob, 3, 3);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cs.x + 10, cs.y - 18, 25, 18);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(cs.x + 10.5, cs.y - 18 + 0.5, 25 - 1, 18 - 1);
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(dish.emoji, cs.x + 22, cs.y - 4);

        if ((this.state.inventory.merchant[cs.wantedDish] || 0) > 0) {
          ctx.fillStyle = '#00ff88';
          ctx.fillRect(cs.x + 40, cs.y - 18, 8, 8);
        } else {
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(cs.x + 40, cs.y - 18, 8, 8);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('...', cs.x + 22, cs.y + 30);
    }
  }

  private drawTransfers(ctx: CanvasRenderingContext2D, now: number) {
    for (const tr of this.state.activeTransfers) {
      this.drawTransfer(ctx, tr, now);
    }
  }

  private drawTransfer(ctx: CanvasRenderingContext2D, tr: ItemTransfer, now: number) {
    const p = tr.progress;
    const arcHeight = 80;

    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255, 223, 0, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = tr.startX + (tr.endX - tr.startX) * t;
      const y = tr.startY + (tr.endY - tr.startY) * t - Math.sin(t * Math.PI) * arcHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    const cx = tr.startX + (tr.endX - tr.startX) * p;
    const launchOffset = -16;
    const cy = tr.startY + launchOffset + (tr.endY + launchOffset - tr.startY - launchOffset) * p - Math.sin(p * Math.PI) * arcHeight;

    ctx.save();
    ctx.translate(cx, cy);

    const bounce = Math.sin(p * Math.PI * 4) * (1 - p) * 4;
    ctx.rotate(bounce * 0.05);

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-8, -8, 16, 16);

    ctx.fillStyle = '#FFEB3B';
    ctx.fillRect(-5, -5, 10, 10);

    ctx.fillStyle = '#B8860B';
    ctx.fillRect(-2, -2, 4, 4);

    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.01)';
    ctx.fillRect(-1, -1, 2, 2);
    ctx.shadowBlur = 0;

    const item = ITEMS[tr.itemId];
    if (item) {
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000';
      ctx.fillText(item.emoji, 0, 0);
    }

    ctx.restore();
  }

  private drawFloatingMenus(ctx: CanvasRenderingContext2D, now: number) {
    if (this.seedMenuActive) {
      const plantIds = Object.keys(PLANTS);
      for (let i = 0; i < plantIds.length; i++) {
        const sx = 20 + i * 60;
        const sy = 520;
        const plantData = (PLANTS as any)[plantIds[i]];
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(sx, sy, 50, 50);
        ctx.strokeStyle = '#e94560';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 0.5, sy + 0.5, 50 - 1, 50 - 1);

        ctx.fillStyle = '#228B22';
        ctx.fillRect(sx + 22, sy + 20, 6, 22);
        ctx.fillStyle = plantData.color;
        ctx.fillRect(sx + 15, sy + 10, 20, 16);

        ctx.font = '6px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(plantData.name, sx + 25, sy + 58);
      }
    }

    if (this.cookMenuActive) {
      const recipeIds = Object.keys(RECIPES);
      for (let i = 0; i < recipeIds.length; i++) {
        const recipe = RECIPES[recipeIds[i]];
        const sx = 20 + i * 150;
        const sy = 510;
        const ok = canCook(recipe, this.state.inventory);

        ctx.fillStyle = ok ? '#1a2e1a' : '#2e1a1a';
        ctx.fillRect(sx, sy, 140, 60);
        ctx.strokeStyle = ok ? '#00ff88' : '#cc4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 0.5, sy + 0.5, 140 - 1, 60 - 1);

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(recipe.emoji, sx + 6, sy + 22);
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(recipe.name, sx + 28, sy + 18);

        const parts: string[] = [];
        for (const [id, c] of Object.entries(recipe.ingredients)) {
          const have = this.state.inventory.chef[id] || 0;
          parts.push(`${ITEMS[id]?.emoji}${have}/${c}`);
        }
        for (const [id, c] of Object.entries(recipe.seasonings)) {
          const have = this.state.inventory.chef[id] || 0;
          parts.push(`${ITEMS[id]?.emoji}${have}/${c}`);
        }
        ctx.font = '6px "Press Start 2P", monospace';
        ctx.fillStyle = ok ? '#00ff88' : '#ff8888';
        ctx.fillText(parts.join(' '), sx + 6, sy + 38);
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`+${recipe.reward}💰`, sx + 6, sy + 52);
      }
    }
  }

  private drawCoinDisplay(ctx: CanvasRenderingContext2D, canvasWidth: number) {
    const coinX = canvasWidth - 120;
    const coinY = 8;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(coinX - 8, coinY - 2, 120, 24);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(coinX - 8 + 0.5, coinY - 2 + 0.5, 120 - 1, 24 - 1);

    drawCoinIcon(ctx, coinX, coinY + 2, 16);

    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#FFD700';
    ctx.fillText(String(this.state.coins), coinX + 22, coinY + 4);
    ctx.restore();
  }

  private fpsTimer: number = 0;
  private fpsFrames: number = 0;
  private currentFps: number = 60;

  private drawFPS(ctx: CanvasRenderingContext2D, now: number) {
    this.fpsFrames++;
    if (now - this.fpsTimer >= 1000) {
      this.currentFps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsTimer = now;
    }
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = this.currentFps >= 55 ? '#00ff88' : this.currentFps >= 30 ? '#ffcc00' : '#ff4444';
    ctx.fillText(`FPS:${this.currentFps}`, 8, 18);
  }

  addTransfer(tr: ItemTransfer) {
    this.state.activeTransfers.push(tr);
  }
}
