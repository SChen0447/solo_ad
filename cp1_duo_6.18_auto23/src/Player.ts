import {
  ElementType,
  Position,
  PlayerState,
  Fireball,
  IceWall,
  Lightning,
  ELEMENT_COLORS,
  Fragment
} from './types';

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const PLAYER_RADIUS = 12;
const MOVE_SPEED = 3;
const FORM_COOLDOWN = 30;
const SKILL_COOLDOWN = 60;
const MAX_LEVEL = 3;
const FRAGMENTS_PER_LEVEL = 5;

export class Player {
  state: PlayerState;
  private fireballIdCounter = 0;
  private iceWallIdCounter = 0;
  private lightningIdCounter = 0;

  constructor(startX: number, startY: number) {
    this.state = {
      position: { x: startX, y: startY },
      health: 100,
      maxHealth: 100,
      currentForm: 'fire',
      formLevels: { fire: 1, ice: 1, lightning: 1 },
      fragments: { fire: 0, ice: 0, lightning: 0 },
      formCooldown: 0,
      formCooldownMax: FORM_COOLDOWN,
      skillCooldown: 0,
      skillCooldownMax: SKILL_COOLDOWN,
      auraRotation: 0,
      facingAngle: 0
    };
  }

  update(keys: Set<string>, deltaTime: number): void {
    const s = this.state;
    let dx = 0, dy = 0;

    if (keys.has('w') || keys.has('W')) dy -= 1;
    if (keys.has('s') || keys.has('S')) dy += 1;
    if (keys.has('a') || keys.has('A')) dx -= 1;
    if (keys.has('d') || keys.has('D')) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
      s.facingAngle = Math.atan2(dy, dx);
    }

    s.position.x += dx * MOVE_SPEED;
    s.position.y += dy * MOVE_SPEED;

    s.position.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_WIDTH - PLAYER_RADIUS, s.position.x));
    s.position.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_HEIGHT - PLAYER_RADIUS, s.position.y));

    if (s.currentForm === 'fire') {
      s.auraRotation += 0.05;
    } else if (s.currentForm === 'ice') {
      s.auraRotation -= 0.05;
    }

    if (s.formCooldown > 0) s.formCooldown--;
    if (s.skillCooldown > 0) s.skillCooldown--;
  }

  switchForm(): void {
    if (this.state.formCooldown > 0) return;

    const forms: ElementType[] = ['fire', 'ice', 'lightning'];
    const currentIndex = forms.indexOf(this.state.currentForm);
    this.state.currentForm = forms[(currentIndex + 1) % forms.length];
    this.state.formCooldown = FORM_COOLDOWN;
  }

  useSkill(): Fireball | IceWall | Lightning | null {
    if (this.state.skillCooldown > 0) return null;
    this.state.skillCooldown = SKILL_COOLDOWN;

    const s = this.state;
    const level = s.formLevels[s.currentForm];
    const damageMultiplier = 1 + (level - 1) * 0.2;
    const rangeMultiplier = 1 + (level - 1) * 0.2;

    switch (s.currentForm) {
      case 'fire':
        return this.createFireball(damageMultiplier, rangeMultiplier);
      case 'ice':
        return this.createIceWall(rangeMultiplier);
      case 'lightning':
        return this.createLightning(damageMultiplier, rangeMultiplier);
    }
  }

  private createFireball(damageMult: number, rangeMult: number): Fireball {
    const s = this.state;
    const speed = 5;
    const vx = Math.cos(s.facingAngle) * speed;
    const vy = Math.sin(s.facingAngle) * speed;

    return {
      id: this.fireballIdCounter++,
      position: { x: s.position.x, y: s.position.y },
      velocity: { x: vx, y: vy },
      radius: 8,
      damage: 1 * damageMult,
      range: 300 * rangeMult,
      traveled: 0
    };
  }

  private createIceWall(rangeMult: number): IceWall {
    const s = this.state;
    const distance = 50;
    const wallX = s.position.x + Math.cos(s.facingAngle) * distance;
    const wallY = s.position.y + Math.sin(s.facingAngle) * distance;

    return {
      id: this.iceWallIdCounter++,
      position: { x: wallX, y: wallY },
      width: 60 * rangeMult,
      height: 10,
      duration: 90,
      maxDuration: 90,
      angle: s.facingAngle
    };
  }

  private createLightning(damageMult: number, rangeMult: number): Lightning {
    const s = this.state;
    const length = 150 * rangeMult;
    const endX = s.position.x + Math.cos(s.facingAngle) * length;
    const endY = s.position.y + Math.sin(s.facingAngle) * length;

    const segments: Position[] = [];
    const segmentCount = 8;
    const perpAngle = s.facingAngle + Math.PI / 2;

    for (let i = 1; i <= segmentCount; i++) {
      const t = i / segmentCount;
      const baseX = s.position.x + (endX - s.position.x) * t;
      const baseY = s.position.y + (endY - s.position.y) * t;
      const offset = (Math.random() - 0.5) * 20;
      segments.push({
        x: baseX + Math.cos(perpAngle) * offset,
        y: baseY + Math.sin(perpAngle) * offset
      });
    }

    return {
      id: this.lightningIdCounter++,
      start: { x: s.position.x, y: s.position.y },
      end: { x: endX, y: endY },
      segments,
      duration: 10,
      maxDuration: 10,
      damage: 1 * damageMult
    };
  }

  takeDamage(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
  }

  collectFragment(fragment: Fragment): void {
    const s = this.state;
    s.fragments[fragment.element]++;
    s.fragments[fragment.element] = Math.min(s.fragments[fragment.element], FRAGMENTS_PER_LEVEL * MAX_LEVEL);

    while (s.fragments[fragment.element] >= FRAGMENTS_PER_LEVEL && s.formLevels[fragment.element] < MAX_LEVEL) {
      s.fragments[fragment.element] -= FRAGMENTS_PER_LEVEL;
      s.formLevels[fragment.element]++;
    }
  }

  getPosition(): Position {
    return { ...this.state.position };
  }

  getRadius(): number {
    return PLAYER_RADIUS;
  }

  getCurrentColor(): string {
    return ELEMENT_COLORS[this.state.currentForm];
  }

  isLightningFlashing(): boolean {
    return this.state.currentForm === 'lightning' && Math.floor(this.state.auraRotation * 10) % 2 === 0;
  }
}
