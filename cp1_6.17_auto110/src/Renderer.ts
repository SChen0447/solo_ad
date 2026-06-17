import { DiceState, DICE_COLORS, DiceType } from './DiceEngine';
import { CombatManager, SkillState, SkillType, GamePhase } from './CombatManager';

export interface UIButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  action: () => void;
  hovered: boolean;
  enabled: boolean;
}

export interface SkillSlot {
  x: number;
  y: number;
  r: number;
  type: SkillType;
  skill: SkillState;
}

export interface SummaryText {
  text: string;
  startTime: number;
  duration: number;
  alpha: number;
}

const COLORS = {
  primaryBg: '#2A1B38',
  darkBg: '#1a0f28',
  gold: '#C9A94C',
  goldBright: '#FFD700',
  goldDim: '#8B7030',
  text: '#E8D8B4',
  textDim: '#8A7B5B',
  wallDark: '#1C1228',
  wallMid: '#2A1B38',
  wallLight: '#3D2A50',
  floor: '#181020'
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private time: number = 0;
  private wallLightSpots: { x: number; y: number; r: number; alpha: number; phase: number }[] = [];
  private floorLightSpots: { x: number; y: number; r: number; alpha: number }[] = [];
  public buttons: UIButton[] = [];
  public skillSlots: SkillSlot[] = [];
  public summaryText: SummaryText | null = null;
  private lastFrameTime: number = 0;
  public frameTimeMs: number = 0;
  private hpLowBlinkPhase: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.generateLightSpots();
  }

  private generateLightSpots(): void {
    for (let i = 0; i < 25; i++) {
      this.floorLightSpots.push({
        x: Math.random() * 800,
        y: 280 + Math.random() * 200,
        r: 20 + Math.random() * 40,
        alpha: 0.02 + Math.random() * 0.04
      });
    }
    for (let i = 0; i < 12; i++) {
      this.wallLightSpots.push({
        x: Math.random() * 800,
        y: 50 + Math.random() * 180,
        r: 30 + Math.random() * 50,
        alpha: 0.015 + Math.random() * 0.025,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  public render(
    combat: CombatManager,
    playerDice: DiceState[],
    enemyDiceValues: { type: DiceType; value: number }[],
    currentTime: number
  ): void {
    const deltaTime = currentTime - this.lastFrameTime;
    this.frameTimeMs = deltaTime > 0 ? deltaTime : this.frameTimeMs;
    this.lastFrameTime = currentTime;
    this.time = currentTime;

    this.ctx.imageSmoothingEnabled = false;

    this.drawBackground();
    this.drawArena();
    this.drawCharacters(combat);
    this.drawPlayerDice(playerDice);
    this.drawEnemyDiceIcons(enemyDiceValues);
    this.drawStatsUI(combat);
    this.drawSkillSlots(combat);
    this.drawTurnInfo(combat);
    this.drawButtons(combat);
    this.drawSummaryText(currentTime);
    this.drawRollButton(combat);

    if (combat.currentPhase === 'game_over') {
      this.drawGameOverPanel(combat);
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = COLORS.primaryBg;
    ctx.fillRect(0, 0, w, h);

    this.drawStoneWalls();
    this.drawFloor();
  }

  private drawStoneWalls(): void {
    const ctx = this.ctx;

    for (let y = 0; y < 260; y += 40) {
      const offset = (Math.floor(y / 40) % 2) * 40;
      for (let x = -40; x < 840; x += 80) {
        const bx = x + offset;
        const by = y;

        const shadeVar = ((bx * 7 + by * 13) % 100) / 100;
        let baseColor: string;
        if (shadeVar < 0.33) baseColor = COLORS.wallDark;
        else if (shadeVar < 0.66) baseColor = COLORS.wallMid;
        else baseColor = COLORS.wallLight;

        ctx.fillStyle = baseColor;
        ctx.fillRect(bx, by, 78, 38);

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(bx, by + 35, 78, 3);
        ctx.fillRect(bx + 75, by, 3, 38);

        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(bx, by, 78, 2);
        ctx.fillRect(bx, by, 2, 38);
      }
    }

    for (const spot of this.wallLightSpots) {
      const flicker = Math.sin(this.time * 0.001 + spot.phase) * 0.008;
      const gradient = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.r);
      gradient.addColorStop(0, `rgba(201, 169, 76, ${spot.alpha + flicker + 0.03})`);
      gradient.addColorStop(1, 'rgba(201, 169, 76, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(spot.x - spot.r, spot.y - spot.r, spot.r * 2, spot.r * 2);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 255, 800, 10);
    ctx.fillStyle = 'rgba(201,169,76,0.08)';
    ctx.fillRect(0, 255, 800, 2);
  }

  private drawFloor(): void {
    const ctx = this.ctx;

    for (let y = 260; y < 600; y += 30) {
      for (let x = 0; x < 800; x += 60) {
        const shadeVar = ((x * 3 + y * 11) % 100) / 100;
        const alpha = 0.03 + shadeVar * 0.05;
        ctx.fillStyle = `rgba(60, 40, 80, ${alpha})`;
        ctx.fillRect(x, y, 58, 28);
      }
    }

    for (const spot of this.floorLightSpots) {
      const gradient = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, spot.r);
      gradient.addColorStop(0, `rgba(201, 169, 76, ${spot.alpha})`);
      gradient.addColorStop(1, 'rgba(201, 169, 76, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(spot.x - spot.r, spot.y - spot.r, spot.r * 2, spot.r * 2);
    }

    const vignette = ctx.createRadialGradient(400, 350, 150, 400, 350, 500);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, 800, 600);
  }

  private drawArena(): void {
    const ctx = this.ctx;

    ctx.strokeStyle = 'rgba(201, 169, 76, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(200, 275, 400, 200);
    ctx.setLineDash([]);

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(201, 169, 76, 0.4)';
    ctx.textAlign = 'center';
    ctx.fillText('⚔ 投 掷 区 ⚔', 400, 295);
  }

  private drawCharacters(combat: CombatManager): void {
    this.drawPlayerSprite(combat);
    this.drawEnemySprite(combat);
  }

  private drawPlayerSprite(combat: CombatManager): void {
    const ctx = this.ctx;
    const cx = 120;
    const cy = 340;

    this.drawCharacterFrame(cx, cy, 100, 130, '#4A90D9');

    ctx.fillStyle = '#F5CBA7';
    ctx.fillRect(cx - 18, cy - 40, 36, 36);

    ctx.fillStyle = '#5D4E37';
    ctx.fillRect(cx - 20, cy - 48, 40, 14);
    ctx.fillRect(cx - 22, cy - 42, 6, 20);
    ctx.fillRect(cx + 16, cy - 42, 6, 20);

    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(cx - 10, cy - 32, 5, 5);
    ctx.fillRect(cx + 5, cy - 32, 5, 5);

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(cx - 7, cy - 20, 14, 3);

    ctx.fillStyle = '#5B4FC7';
    ctx.fillRect(cx - 28, cy - 4, 56, 44);
    ctx.fillStyle = '#3D35A0';
    ctx.fillRect(cx - 28, cy - 4, 56, 4);
    ctx.fillRect(cx - 4, cy - 4, 8, 44);

    ctx.fillStyle = '#C9A94C';
    ctx.fillRect(cx - 8, cy + 10, 16, 16);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx - 5, cy + 13, 10, 10);

    ctx.fillStyle = '#F5CBA7';
    ctx.fillRect(cx - 36, cy - 2, 10, 30);
    ctx.fillRect(cx + 26, cy - 2, 10, 30);

    ctx.fillStyle = '#808080';
    ctx.fillRect(cx + 34, cy - 50, 4, 78);
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(cx + 32, cy - 50, 8, 60);
    ctx.fillStyle = '#C9A94C';
    ctx.fillRect(cx + 30, cy + 8, 12, 6);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(cx + 32, cy + 14, 8, 14);

    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(cx - 24, cy + 40, 18, 26);
    ctx.fillRect(cx + 6, cy + 40, 18, 26);
    ctx.fillStyle = '#3E2723';
    ctx.fillRect(cx - 26, cy + 64, 22, 8);
    ctx.fillRect(cx + 4, cy + 64, 22, 8);

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = COLORS.goldBright;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(combat.player.name, cx, cy + 88);
    ctx.shadowBlur = 0;
  }

  private drawEnemySprite(combat: CombatManager): void {
    const ctx = this.ctx;
    const cx = 680;
    const cy = 340;

    this.drawCharacterFrame(cx, cy, 100, 130, '#E53935');

    ctx.fillStyle = '#6B1F5A';
    ctx.fillRect(cx - 22, cy - 42, 44, 40);

    ctx.fillStyle = '#4A0E3D';
    ctx.beginPath();
    ctx.moveTo(cx - 22, cy - 42);
    ctx.lineTo(cx - 32, cy - 60);
    ctx.lineTo(cx - 12, cy - 42);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 22, cy - 42);
    ctx.lineTo(cx + 32, cy - 60);
    ctx.lineTo(cx + 12, cy - 42);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FF2020';
    ctx.fillRect(cx - 12, cy - 28, 6, 8);
    ctx.fillRect(cx + 6, cy - 28, 6, 8);
    ctx.fillStyle = '#FFEB3B';
    ctx.fillRect(cx - 10, cy - 26, 3, 4);
    ctx.fillRect(cx + 8, cy - 26, 3, 4);

    ctx.fillStyle = '#2A0820';
    ctx.fillRect(cx - 14, cy - 14, 28, 6);
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(cx - 12 + i * 6, cy - 14, 3, 4);
    }

    ctx.fillStyle = '#3D1250';
    ctx.fillRect(cx - 32, cy - 4, 64, 48);
    ctx.fillStyle = '#5A1E6E';
    ctx.fillRect(cx - 32, cy - 4, 64, 5);

    ctx.fillStyle = '#8B0000';
    ctx.fillRect(cx - 14, cy + 6, 28, 22);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(cx - 9, cy + 10, 18, 3);
    ctx.fillRect(cx - 9, cy + 18, 18, 3);
    ctx.fillRect(cx - 3, cy + 10, 6, 14);

    ctx.fillStyle = '#6B1F5A';
    ctx.fillRect(cx - 42, cy, 12, 34);
    ctx.fillRect(cx + 30, cy, 12, 34);

    ctx.fillStyle = '#2A0820';
    ctx.fillRect(cx - 48, cy + 18, 10, 20);
    ctx.fillRect(cx + 38, cy + 18, 10, 20);
    ctx.fillStyle = '#4A0E3D';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - 49 + i * 3, cy + 8, 2, 12);
      ctx.fillRect(cx + 39 + i * 3, cy + 8, 2, 12);
    }

    ctx.fillStyle = '#3D1250';
    ctx.fillRect(cx - 26, cy + 44, 20, 24);
    ctx.fillRect(cx + 6, cy + 44, 20, 24);
    ctx.fillStyle = '#2A0820';
    ctx.fillRect(cx - 28, cy + 66, 24, 6);
    ctx.fillRect(cx + 4, cy + 66, 24, 6);

    const damaged = combat.enemy.hp < combat.enemy.maxHp * 0.5;
    if (damaged) {
      ctx.fillStyle = 'rgba(229, 57, 53, 0.3)';
      ctx.fillRect(cx - 32, cy - 50, 64, 124);
    }

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#E53935';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(combat.enemy.name, cx, cy + 88);
    ctx.shadowBlur = 0;
  }

  private drawCharacterFrame(cx: number, cy: number, w: number, h: number, color: string): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const halfH = h / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(cx - halfW - 4, cy - halfH - 4, w + 8, h + 8);

    const gradient = ctx.createLinearGradient(cx - halfW, cy - halfH, cx + halfW, cy + halfH);
    gradient.addColorStop(0, '#1C1228');
    gradient.addColorStop(0.5, '#2A1B38');
    gradient.addColorStop(1, '#1C1228');
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - halfW, cy - halfH, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - halfW, cy - halfH, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - halfW + 2, cy - halfH + 2, w - 4, h - 4);
  }

  private drawPlayerDice(dice: DiceState[]): void {
    for (const d of dice) {
      this.draw3DDice(d);
    }
  }

  private draw3DDice(dice: DiceState): void {
    const ctx = this.ctx;
    const colors = DICE_COLORS[dice.type];
    const size = 44;
    const x = dice.x;
    const y = dice.y;

    const rotYRad = (dice.rotationY * Math.PI) / 180;
    const rotXRad = (dice.rotationX * Math.PI) / 180;

    const cosY = Math.cos(rotYRad);
    const sinY = Math.sin(rotYRad);
    const cosX = Math.cos(rotXRad);
    const sinX = Math.sin(rotXRad);

    const offset = size / 2;
    const depthScale = 0.85;

    const faces: {
      points: { x: number; y: number; z: number }[];
      value: number;
      shade: number;
      visible: boolean;
    }[] = [];

    const addFace = (
      p1x: number, p1y: number, p1z: number,
      p2x: number, p2y: number, p2z: number,
      p3x: number, p3y: number, p3z: number,
      p4x: number, p4y: number, p4z: number,
      value: number, shade: number
    ) => {
      const transform = (px: number, py: number, pz: number) => {
        let x1 = px * cosY - pz * sinY;
        let z1 = px * sinY + pz * cosY;
        let y1 = py * cosX - z1 * sinX;
        let z2 = py * sinX + z1 * cosX;
        const scale = 1 / (1 + z2 * 0.003);
        return { x: x * 0 + x1 * scale, y: y * 0 + y1 * scale, z: z2 };
      };

      const tp1 = transform(p1x, p1y, p1z);
      const tp2 = transform(p2x, p2y, p2z);
      const tp3 = transform(p3x, p3y, p3z);
      const tp4 = transform(p4x, p4y, p4z);

      const ax = tp2.x - tp1.x, ay = tp2.y - tp1.y;
      const bx = tp3.x - tp1.x, by = tp3.y - tp1.y;
      const cross = ax * by - ay * bx;

      faces.push({
        points: [tp1, tp2, tp3, tp4],
        value,
        shade,
        visible: cross > 0
      });
    };

    const s = offset;
    addFace(-s, -s, -s, s, -s, -s, s, s, -s, -s, s, -s, 1, 0.0);
    addFace(s, -s, s, -s, -s, s, -s, s, s, s, s, s, 6, 0.0);
    addFace(-s, -s, s, -s, -s, -s, -s, s, -s, -s, s, s, 2, -0.15);
    addFace(s, -s, -s, s, -s, s, s, s, s, s, s, -s, 5, -0.15);
    addFace(-s, -s, s, s, -s, s, s, -s, -s, -s, -s, -s, 3, 0.15);
    addFace(-s, s, -s, s, s, -s, s, s, s, -s, s, s, 4, -0.25);

    faces.sort((a, b) => {
      const za = a.points.reduce((sum, p) => sum + p.z, 0) / 4;
      const zb = b.points.reduce((sum, p) => sum + p.z, 0) / 4;
      return za - zb;
    });

    for (const face of faces) {
      if (!face.visible && !dice.isRolling) continue;

      ctx.beginPath();
      ctx.moveTo(x + face.points[0].x, y + face.points[0].y);
      for (let i = 1; i < 4; i++) {
        ctx.lineTo(x + face.points[i].x, y + face.points[i].y);
      }
      ctx.closePath();

      let faceColor = colors.main;
      if (face.shade !== 0) {
        faceColor = this.shadeColor(colors.main, face.shade);
      }
      if (!face.visible && dice.isRolling) {
        faceColor = this.shadeColor(colors.main, -0.35);
      }

      ctx.fillStyle = faceColor;
      ctx.fill();

      ctx.strokeStyle = colors.dark;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (face.visible || dice.isRolling) {
        const cxx = (face.points[0].x + face.points[2].x) / 2;
        const cyy = (face.points[0].y + face.points[2].y) / 2;
        this.drawDicePips(x + cxx, y + cyy, face.value, size * depthScale, colors.face, dice.isRolling);
      }
    }

    if (dice.settled && dice.isCritical) {
      const glowPulse = Math.sin(this.time * 0.006) * 0.3 + 0.7;
      ctx.save();
      ctx.globalAlpha = glowPulse * 0.6;
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
      glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
      glowGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
      glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(x - size * 2, y - size * 2, size * 4, size * 4);
      ctx.restore();
    }

    if (dice.showParticles) {
      this.drawDiceParticles(dice);
    }
  }

  private drawDicePips(cx: number, cy: number, value: number, size: number, color: string, rolling: boolean): void {
    const ctx = this.ctx;
    const pipSize = Math.max(3, size * 0.12);
    const positions = this.getPipPositions(value, size);

    ctx.fillStyle = color;
    if (rolling) ctx.globalAlpha = 0.7;

    for (const pos of positions) {
      ctx.beginPath();
      ctx.arc(cx + pos.x, cy + pos.y, pipSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private getPipPositions(value: number, size: number): { x: number; y: number }[] {
    const s = size * 0.32;
    switch (value) {
      case 1:
        return [{ x: 0, y: 0 }];
      case 2:
        return [{ x: -s, y: -s }, { x: s, y: s }];
      case 3:
        return [{ x: -s, y: -s }, { x: 0, y: 0 }, { x: s, y: s }];
      case 4:
        return [{ x: -s, y: -s }, { x: s, y: -s }, { x: -s, y: s }, { x: s, y: s }];
      case 5:
        return [{ x: -s, y: -s }, { x: s, y: -s }, { x: 0, y: 0 }, { x: -s, y: s }, { x: s, y: s }];
      case 6:
        return [{ x: -s, y: -s }, { x: s, y: -s }, { x: -s, y: 0 }, { x: s, y: 0 }, { x: -s, y: s }, { x: s, y: s }];
      default:
        return [];
    }
  }

  private drawDiceParticles(dice: DiceState): void {
    const ctx = this.ctx;
    for (const p of dice.particles) {
      const px = dice.x + p.x;
      const py = dice.y + p.y;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = Math.max(0, p.alpha * 0.4);
      ctx.beginPath();
      ctx.arc(px, py, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawEnemyDiceIcons(enemyDice: { type: DiceType; value: number }[]): void {
    const ctx = this.ctx;
    const startX = 600;
    const y = 500;
    const spacing = 42;

    for (let i = 0; i < enemyDice.length; i++) {
      const d = enemyDice[i];
      const cx = startX + i * spacing;
      const colors = DICE_COLORS[d.type];
      const size = 28;

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(cx - size / 2 - 2, y - size / 2 - 2, size + 4, size + 4);

      ctx.fillStyle = colors.main;
      ctx.fillRect(cx - size / 2, y - size / 2, size, size);
      ctx.strokeStyle = colors.dark;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - size / 2, y - size / 2, size, size);

      ctx.fillStyle = colors.light;
      ctx.fillRect(cx - size / 2, y - size / 2, size, 3);
      ctx.fillRect(cx - size / 2, y - size / 2, 3, size);

      const pips = this.getPipPositions(d.value, size);
      ctx.fillStyle = colors.face;
      for (const p of pips) {
        ctx.beginPath();
        ctx.arc(cx + p.x, y + p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawStatsUI(combat: CombatManager): void {
    this.drawPlayerStats(combat);
    this.drawEnemyStats(combat);
  }

  private drawPlayerStats(combat: CombatManager): void {
    const ctx = this.ctx;
    const x = 40;
    let y = 485;

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText('HP', x, y);
    ctx.shadowBlur = 0;

    this.drawHealthBar(x + 28, y - 10, 150, 14, combat.player.hp, combat.player.maxHp, combat.isPlayerHpLow());
    y += 18;

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText(`${Math.ceil(combat.player.hp)}/${combat.player.maxHp}`, x + 28, y);
    y += 14;

    ctx.fillStyle = '#1E88E5';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(`🛡 ${(combat.player.defense * combat.player.armorCoef).toFixed(1)}`, x, y);
    y += 14;

    ctx.fillStyle = COLORS.gold;
    ctx.fillText('EN', x, y);
    this.drawEnergyBar(x + 28, y - 10, 150, 10, combat.player.energy, combat.player.maxEnergy);

    if (combat.buffs.empowerRemaining > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.fillText('⚡力量强化', x + 190, 495);
    }
  }

  private drawEnemyStats(combat: CombatManager): void {
    const ctx = this.ctx;
    const x = 560;
    let y = 485;

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = '#E53935';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText('HP', x, y);
    ctx.shadowBlur = 0;

    const enemyHpLow = combat.enemy.hp / combat.enemy.maxHp <= 0.3;
    this.drawHealthBar(x + 28, y - 10, 150, 14, combat.enemy.hp, combat.enemy.maxHp, enemyHpLow, true);
    y += 18;

    ctx.fillStyle = COLORS.textDim;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText(`${Math.ceil(combat.enemy.hp)}/${combat.enemy.maxHp}`, x + 28, y);

    if (combat.buffs.weakenRemaining > 0) {
      ctx.fillStyle = '#FF6F00';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('破甲中 ⚠', x + 178, 495);
    }
  }

  private drawHealthBar(x: number, y: number, w: number, h: number, current: number, max: number, lowHp: boolean, enemy: boolean = false): void {
    const ctx = this.ctx;
    const ratio = Math.max(0, current / max);
    const fillW = Math.max(0, w * ratio);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

    ctx.fillStyle = '#0a0610';
    ctx.fillRect(x, y, w, h);

    let color1: string, color2: string;
    if (lowHp) {
      this.hpLowBlinkPhase += 0.15;
      const blink = (Math.sin(this.hpLowBlinkPhase) + 1) / 2;
      color1 = `rgb(${200 + 55 * blink}, ${50}, ${50})`;
      color2 = `rgb(${150 + 50 * blink}, ${20}, ${20})`;
    } else if (enemy) {
      color1 = '#EF5350';
      color2 = '#C62828';
    } else {
      color1 = '#66BB6A';
      color2 = '#2E7D32';
    }

    if (fillW > 0) {
      const gradient = ctx.createRadialGradient(x + fillW / 2, y + h / 2, 0, x + fillW / 2, y + h / 2, fillW);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, fillW, h);

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x, y, fillW, Math.floor(h / 3));
    }

    ctx.strokeStyle = COLORS.goldDim;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  private drawEnergyBar(x: number, y: number, w: number, h: number, current: number, max: number): void {
    const ctx = this.ctx;
    const ratio = Math.max(0, current / max);
    const fillW = Math.max(0, w * ratio);

    ctx.fillStyle = '#0a0610';
    ctx.fillRect(x, y, w, h);

    if (fillW > 0) {
      const gradient = ctx.createLinearGradient(x, y, x + fillW, y);
      gradient.addColorStop(0, '#8B7030');
      gradient.addColorStop(0.5, '#C9A94C');
      gradient.addColorStop(1, '#FFD700');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, fillW, h);

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x, y, fillW, Math.floor(h / 3));
    }

    ctx.strokeStyle = COLORS.goldDim;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
  }

  private drawSkillSlots(combat: CombatManager): void {
    const ctx = this.ctx;
    const slotPositions = [
      { x: 310, y: 560, type: 'heal' as SkillType, icon: '❤', name: '治疗' },
      { x: 400, y: 560, type: 'empower' as SkillType, icon: '⚔', name: '强化' },
      { x: 490, y: 560, type: 'weaken' as SkillType, icon: '💢', name: '削弱' }
    ];

    const slotRadius = 22;
    for (const slot of slotPositions) {
      const skill = combat.skills.find(s => s.type === slot.type)!;
      const r = slotRadius;
      const onCooldown = skill.cooldownRemaining > 0;
      const canUse = combat.canSelectSkill(slot.type);
      const isSelected = combat.selectedSkill === slot.type;
      const isTurn3Plus = combat.currentTurn >= 3;

      ctx.save();

      ctx.beginPath();
      ctx.arc(slot.x, slot.y, r + 3, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.5)' : 'rgba(0,0,0,0.6)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(slot.x, slot.y, r, 0, Math.PI * 2);
      ctx.fillStyle = onCooldown || !isTurn3Plus ? '#2a1b38' : (isSelected ? '#3D2A50' : '#2A1B38');
      ctx.fill();
      ctx.strokeStyle = isSelected ? COLORS.goldBright : (canUse ? COLORS.gold : COLORS.goldDim);
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      if (onCooldown) {
        const cooldownProgress = 1 - (skill.cooldownRemaining / (skill.cooldownMax + 1));
        ctx.beginPath();
        ctx.moveTo(slot.x, slot.y);
        ctx.arc(slot.x, slot.y, r - 2, -Math.PI / 2, -Math.PI / 2 + cooldownProgress * Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(100, 80, 40, 0.6)';
        ctx.fill();

        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillStyle = COLORS.textDim;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(skill.cooldownRemaining.toString(), slot.x, slot.y);
      } else {
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = !isTurn3Plus ? '#555' : (slot.type === 'heal' ? '#E53935' : slot.type === 'empower' ? '#FFD700' : '#FF6F00');
        ctx.fillText(slot.icon, slot.x, slot.y - 1);

        ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = !isTurn3Plus ? '#444' : COLORS.text;
        ctx.fillText(slot.name, slot.x, slot.y + r + 10);

        if (!isTurn3Plus) {
          ctx.font = '6px "Press Start 2P", monospace';
          ctx.fillStyle = '#555';
          ctx.fillText('T3解锁', slot.x, slot.y - r - 6);
        }
      }

      ctx.restore();
    }
    this.skillSlots = slotPositions.map(s => ({
      x: s.x, y: s.y, r: slotRadius + 5, type: s.type, skill: combat.skills.find(ss => ss.type === s.type)!
    }));
  }

  private drawTurnInfo(combat: CombatManager): void {
    const ctx = this.ctx;
    const y = 20;

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = COLORS.goldBright;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText(`第 ${combat.currentTurn} 回合`, 400, y);
    ctx.shadowBlur = 0;

    const phaseText = this.getPhaseText(combat.currentPhase);
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(phaseText, 400, y + 18);
  }

  private getPhaseText(phase: GamePhase): string {
    switch (phase) {
      case 'select': return '选择骰子 / 点击掷骰';
      case 'rolling': return '骰子投掷中...';
      case 'resolving': return '结算中...';
      case 'enemy_turn': return '敌方回合...';
      case 'game_over': return '战斗结束';
      default: return '';
    }
  }

  private drawButtons(_combat: CombatManager): void {
    this.buttons = [];
  }

  private drawRollButton(combat: CombatManager): void {
    const ctx = this.ctx;
    const btnX = 400;
    const btnY = 500;
    const btnW = 120;
    const btnH = 32;

    const canRoll = combat.currentPhase === 'select';
    const hovered = this.buttons.find(b => b.label === 'ROLL')?.hovered ?? false;

    this.buttons.push({
      x: btnX - btnW / 2,
      y: btnY - btnH / 2,
      w: btnW,
      h: btnH,
      label: 'ROLL',
      action: () => { },
      hovered,
      enabled: canRoll
    });

    ctx.save();

    ctx.shadowColor = hovered && canRoll ? 'rgba(255, 215, 0, 0.7)' : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = hovered && canRoll ? 15 : 5;

    const gradient = ctx.createLinearGradient(btnX - btnW / 2, btnY - btnH / 2, btnX + btnW / 2, btnY + btnH / 2);
    if (canRoll) {
      gradient.addColorStop(0, hovered ? '#8B7030' : '#6B5020');
      gradient.addColorStop(0.5, hovered ? '#D4B45C' : '#C9A94C');
      gradient.addColorStop(1, hovered ? '#8B7030' : '#6B5020');
    } else {
      gradient.addColorStop(0, '#2a1b38');
      gradient.addColorStop(0.5, '#3D2A50');
      gradient.addColorStop(1, '#2a1b38');
    }
    ctx.fillStyle = gradient;

    this.roundRect(ctx, btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
    ctx.fill();

    ctx.strokeStyle = hovered && canRoll ? COLORS.goldBright : (canRoll ? COLORS.gold : '#555');
    ctx.lineWidth = 2;
    this.roundRect(ctx, btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillStyle = canRoll ? (hovered ? '#FFEB3B' : '#2A1B38') : '#666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = canRoll && !hovered ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = canRoll && !hovered ? 2 : 3;
    ctx.fillText(canRoll ? '🎲 掷 骰' : '等待中...', btnX, btnY);

    ctx.restore();
  }

  public setSummaryText(text: string, currentTime: number): void {
    this.summaryText = {
      text,
      startTime: currentTime,
      duration: 2500,
      alpha: 0
    };
  }

  private drawSummaryText(currentTime: number): void {
    if (!this.summaryText) return;

    const ctx = this.ctx;
    const s = this.summaryText;
    const elapsed = currentTime - s.startTime;
    const progress = Math.min(elapsed / s.duration, 1);

    let alpha: number;
    let expandProgress: number;
    if (progress < 0.1) {
      alpha = progress / 0.1;
      expandProgress = progress / 0.1;
    } else if (progress < 0.75) {
      alpha = 1;
      expandProgress = 1;
    } else {
      alpha = 1 - (progress - 0.75) / 0.25;
      expandProgress = 1;
    }

    if (alpha <= 0.01 || progress >= 1) {
      this.summaryText = null;
      return;
    }

    const y = 60;
    const maxWidth = 600;
    const text = s.text;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);

    ctx.font = '10px "Press Start 2P", monospace';
    const fullWidth = Math.min(ctx.measureText(text).width + 40, maxWidth);
    const displayWidth = fullWidth * expandProgress;

    const bgGradient = ctx.createLinearGradient(400 - displayWidth / 2, y - 15, 400 + displayWidth / 2, y + 15);
    bgGradient.addColorStop(0, 'rgba(42, 27, 56, 0.95)');
    bgGradient.addColorStop(0.5, 'rgba(60, 40, 80, 0.98)');
    bgGradient.addColorStop(1, 'rgba(42, 27, 56, 0.95)');
    ctx.fillStyle = bgGradient;

    this.roundRect(ctx, 400 - displayWidth / 2, y - 16, displayWidth, 32, 6);
    ctx.fill();

    ctx.strokeStyle = COLORS.goldBright;
    ctx.lineWidth = 2;
    this.roundRect(ctx, 400 - displayWidth / 2, y - 16, displayWidth, 32, 6);
    ctx.stroke();

    if (expandProgress > 0.5) {
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(201, 169, 76, 0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(text, 400, y + 1);
    }

    ctx.restore();
  }

  private drawGameOverPanel(combat: CombatManager): void {
    const ctx = this.ctx;
    const isVictory = combat.winner === 'player';
    const duration = combat.getCombatDuration();
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, 800, 600);

    const panelX = 200;
    const panelY = 100;
    const panelW = 400;
    const panelH = 400;

    const panelGrad = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGrad.addColorStop(0, '#2A1B38');
    panelGrad.addColorStop(0.5, '#3D2A50');
    panelGrad.addColorStop(1, '#2A1B38');
    ctx.fillStyle = panelGrad;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = isVictory ? COLORS.goldBright : '#E53935';
    ctx.lineWidth = 3;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.stroke();

    ctx.shadowColor = isVictory ? 'rgba(255, 215, 0, 0.8)' : 'rgba(229, 57, 53, 0.8)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = isVictory ? 'rgba(255, 215, 0, 0.5)' : 'rgba(229, 57, 53, 0.5)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, panelX + 5, panelY + 5, panelW - 10, panelH - 10, 10);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '20px "Press Start 2P", monospace';
    ctx.fillStyle = isVictory ? COLORS.goldBright : '#E53935';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(isVictory ? '🎉 胜 利 🎉' : '💀 战 败 💀', 400, panelY + 55);
    ctx.shadowBlur = 0;

    const dividerY = panelY + 85;
    ctx.strokeStyle = 'rgba(201, 169, 76, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(panelX + 30, dividerY);
    ctx.lineTo(panelX + panelW - 30, dividerY);
    ctx.stroke();
    ctx.setLineDash([]);

    const statsY = dividerY + 40;
    const lineHeight = 32;
    const leftX = panelX + 50;
    const rightX = panelX + panelW - 50;

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('战斗时长', leftX, statsY);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`${minutes}分${seconds}秒`, rightX, statsY);

    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('总回合数', leftX, statsY + lineHeight);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`${combat.stats.totalTurns}`, rightX, statsY + lineHeight);

    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('造成总伤害', leftX, statsY + lineHeight * 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#66BB6A';
    ctx.fillText(`${combat.stats.totalDamageDealt}`, rightX, statsY + lineHeight * 2);

    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('承受总伤害', leftX, statsY + lineHeight * 3);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#EF5350';
    ctx.fillText(`${combat.stats.totalDamageTaken}`, rightX, statsY + lineHeight * 3);

    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('剩余生命', leftX, statsY + lineHeight * 4);
    ctx.textAlign = 'right';
    ctx.fillStyle = isVictory ? '#66BB6A' : '#888';
    ctx.fillText(`${Math.max(0, Math.ceil(combat.player.hp))}/${combat.player.maxHp}`, rightX, statsY + lineHeight * 4);

    const btnY = panelY + panelH - 60;
    const btnW = 180;
    const btnH = 40;
    const btnHovered = this.buttons.find(b => b.label === 'RESTART')?.hovered ?? false;

    this.buttons.push({
      x: 400 - btnW / 2,
      y: btnY - btnH / 2,
      w: btnW,
      h: btnH,
      label: 'RESTART',
      action: () => { },
      hovered: btnHovered,
      enabled: true
    });

    ctx.shadowColor = btnHovered ? 'rgba(255, 215, 0, 0.8)' : 'rgba(201, 169, 76, 0.4)';
    ctx.shadowBlur = btnHovered ? 20 : 8;

    const btnGrad = ctx.createLinearGradient(400 - btnW / 2, btnY - btnH / 2, 400 + btnW / 2, btnY + btnH / 2);
    btnGrad.addColorStop(0, btnHovered ? '#8B7030' : '#6B5020');
    btnGrad.addColorStop(0.5, btnHovered ? '#FFD700' : '#C9A94C');
    btnGrad.addColorStop(1, btnHovered ? '#8B7030' : '#6B5020');
    ctx.fillStyle = btnGrad;
    this.roundRect(ctx, 400 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    ctx.fill();

    ctx.strokeStyle = btnHovered ? '#FFF' : COLORS.goldBright;
    ctx.lineWidth = 2;
    this.roundRect(ctx, 400 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = '11px "Press Start 2P", monospace';
    ctx.fillStyle = btnHovered ? '#2A1B38' : '#1a0f28';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄 再来一局', 400, btnY);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private shadeColor(color: string, percent: number): string {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent);
    const R = f >> 16;
    const G = (f >> 8) & 0x00FF;
    const B = f & 0x0000FF;
    return (
      '#' +
      (0x1000000 +
        (Math.round((t - R) * p) + R) * 0x10000 +
        (Math.round((t - G) * p) + G) * 0x100 +
        (Math.round((t - B) * p) + B)
      ).toString(16).slice(1)
    );
  }

  public handleMouseMove(mx: number, my: number): void {
    for (const btn of this.buttons) {
      btn.hovered = mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h && btn.enabled;
    }
  }

  public handleClick(mx: number, my: number, _combat: CombatManager): 'roll' | 'restart' | SkillType | null {
    for (const btn of this.buttons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h && btn.enabled) {
        if (btn.label === 'ROLL') return 'roll';
        if (btn.label === 'RESTART') return 'restart';
      }
    }

    for (const slot of this.skillSlots) {
      const dx = mx - slot.x;
      const dy = my - slot.y;
      if (dx * dx + dy * dy <= slot.r * slot.r) {
        return slot.type;
      }
    }

    return null;
  }

  public triggerCriticalEffect(): void {
    const container = document.getElementById('game-container');
    const canvas = document.getElementById('game-canvas');
    if (container) {
      container.classList.remove('screen-shake');
      void container.offsetWidth;
      container.classList.add('screen-shake');
    }
    if (canvas) {
      canvas.classList.remove('gold-flash');
      void canvas.offsetWidth;
      canvas.classList.add('gold-flash');
    }
  }
}
