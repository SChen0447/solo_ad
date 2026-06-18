import {
  Vec2,
  InputState,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PULSE_COOLDOWN,
  CELL_SIZE,
  AbilityType,
} from './types';
import { WorldModel } from './WorldModel';

export class Player {
  private world: WorldModel;
  private pulseCooldown: number = 0;
  private lastMovementDir: Vec2 = { x: 1, y: 0 };
  private abilityKeyPressed: boolean = false;
  private pulseKeyPressed: boolean = false;
  private onPulseFired: (() => void) | null = null;
  private onAbilityUsed: (() => void) | null = null;
  private onCoinCollected: ((index: number) => void) | null = null;

  constructor(world: WorldModel) {
    this.world = world;
  }

  public setCallbacks(
    onPulseFired: () => void,
    onAbilityUsed: () => void,
    onCoinCollected: (index: number) => void,
  ): void {
    this.onPulseFired = onPulseFired;
    this.onAbilityUsed = onAbilityUsed;
    this.onCoinCollected = onCoinCollected;
  }

  public update(delta: number, input: InputState): void {
    this.updateMovement(delta, input);
    this.updatePulseCooldown(delta);
    this.handlePulseInput(input);
    this.handleAbilityInput(input);
    this.checkCoinCollisions();
  }

  private updateMovement(delta: number, input: InputState): void {
    let dx = 0;
    let dy = 0;

    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    if (dx !== 0 || dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
      this.lastMovementDir = { x: dx, y: dy };
    }

    let speed = PLAYER_SPEED;
    if (this.world.getAbilityType() === 'AGILITY_BOOTS') {
      speed *= 1.3;
    }

    const pos = this.world.getPlayerPosition();
    let newX = pos.x + dx * speed * delta;
    let newY = pos.y + dy * speed * delta;

    if (!this.checkCollision(newX, pos.y)) {
      pos.x = newX;
    }
    if (!this.checkCollision(pos.x, newY)) {
      pos.y = newY;
    }

    this.world.setPlayerPosition(pos);
  }

  private checkCollision(x: number, y: number): boolean {
    const radius = PLAYER_RADIUS;
    const checkPoints = [
      { x: x - radius, y: y - radius },
      { x: x + radius, y: y - radius },
      { x: x - radius, y: y + radius },
      { x: x + radius, y: y + radius },
      { x, y: y - radius },
      { x, y: y + radius },
      { x: x - radius, y },
      { x: x + radius, y },
    ];

    for (const p of checkPoints) {
      if (this.world.isWall(p.x, p.y)) {
        return true;
      }
    }
    return false;
  }

  private updatePulseCooldown(delta: number): void {
    if (this.pulseCooldown > 0) {
      this.pulseCooldown = Math.max(0, this.pulseCooldown - delta);
    }
  }

  private handlePulseInput(input: InputState): void {
    if (input.pulse && !this.pulseKeyPressed) {
      this.pulseKeyPressed = true;
      if (this.pulseCooldown <= 0) {
        this.firePulse();
      }
    }
    if (!input.pulse) {
      this.pulseKeyPressed = false;
    }
  }

  private handleAbilityInput(input: InputState): void {
    if (input.ability && !this.abilityKeyPressed) {
      this.abilityKeyPressed = true;
      if (this.world.useAbility() && this.onAbilityUsed) {
        this.onAbilityUsed();
      }
    }
    if (!input.ability) {
      this.abilityKeyPressed = false;
    }
  }

  private firePulse(): void {
    this.pulseCooldown = PULSE_COOLDOWN;
    if (this.onPulseFired) {
      this.onPulseFired();
    }
  }

  private checkCoinCollisions(): void {
    const pos = this.world.getPlayerPosition();
    const coins = this.world.getCoins();
    for (let i = 0; i < coins.length; i++) {
      if (coins[i].collected) continue;
      const dx = pos.x - coins[i].position.x;
      const dy = pos.y - coins[i].position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PLAYER_RADIUS + 8) {
        this.world.collectCoin(i);
        if (this.onCoinCollected) {
          this.onCoinCollected(i);
        }
      }
    }
  }

  public getPulseCooldown(): number {
    return this.pulseCooldown;
  }

  public getPulseCooldownProgress(): number {
    return PULSE_COOLDOWN > 0 ? 1 - this.pulseCooldown / PULSE_COOLDOWN : 1;
  }

  public getLastMovementDirection(): Vec2 {
    return { ...this.lastMovementDir };
  }

  public getSpeedMultiplier(): number {
    if (this.world.getAbilityType() === 'AGILITY_BOOTS') {
      return 1.3;
    }
    return 1.0;
  }

  public getPulseConfig(): { speedMultiplier: number; extraBounces: number } {
    if (this.world.getAbilityType() === 'SONIC_BOOST') {
      return { speedMultiplier: 1.2, extraBounces: 1 };
    }
    return { speedMultiplier: 1.0, extraBounces: 0 };
  }

  public getAbilityType(): AbilityType | null {
    return this.world.getAbilityType();
  }

  public isInvisible(): boolean {
    return this.world.isPlayerInvisible();
  }

  public getInvisibilityProgress(): number {
    return this.world.getInvisibilityProgress();
  }
}
