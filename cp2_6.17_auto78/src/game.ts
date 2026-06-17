import { Character, CHAR_WIDTH } from './entities';
import type { HitEvent } from './entities';
import { InputManager } from './input';
import { Renderer } from './renderer';
import type { VisualEffect } from './renderer';

const GAME_DURATION = 60000;
const WARNING_START = 30000;
const WARNING_DURATION = 5000;
const MAX_EFFECTS = 16;

export type GameStatus = 'playing' | 'ended';

export class Game {
  public p1: Character;
  public p2: Character;
  public status: GameStatus;
  public winnerText: string | null;

  private input: InputManager;
  private renderer: Renderer;
  private effects: VisualEffect[];
  private effectPool: VisualEffect[];
  private timeLeft: number;
  private warningShown: boolean;
  private warningAge: number;
  private restartHovered: boolean;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.p1 = new Character(120, '#3a7bff', 1, 1);
    this.p2 = new Character(640, '#ff3a5c', 2, -1);
    this.input = new InputManager();
    this.renderer = new Renderer(ctx);
    this.effects = [];
    this.effectPool = [];
    for (let i = 0; i < MAX_EFFECTS; i++) {
      this.effectPool.push({
        type: 'hit',
        x: 0,
        y: 0,
        age: 0,
        duration: 0,
        frame: 0
      });
    }
    this.timeLeft = GAME_DURATION;
    this.warningShown = false;
    this.warningAge = 0;
    this.status = 'playing';
    this.winnerText = null;
    this.restartHovered = false;

    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
  }

  public start(): void {
    this.input.attach();
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('click', this.handleClick);
  }

  public stop(): void {
    this.input.detach();
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('click', this.handleClick);
  }

  public reset(): void {
    this.p1.reset(120, 1);
    this.p2.reset(640, -1);
    this.effects.length = 0;
    this.timeLeft = GAME_DURATION;
    this.warningShown = false;
    this.warningAge = 0;
    this.status = 'playing';
    this.winnerText = null;
    this.restartHovered = false;
    this.renderer.resetHpDisplay();
  }

  public update(dt: number): void {
    if (this.status !== 'playing') {
      this.updateEffects(dt);
      return;
    }

    this.timeLeft -= dt;

    if (this.timeLeft <= WARNING_START && !this.warningShown) {
      this.warningShown = true;
      this.warningAge = 0;
    }
    if (this.warningShown && this.warningAge < WARNING_DURATION) {
      this.warningAge += dt;
    }

    const p1Actions = this.input.getP1Actions();
    const p2Actions = this.input.getP2Actions();

    const inputProxy = {
      consumeAttack: (p: 1 | 2) => this.input.consumeAttack(p),
      consumeSkill: (p: 1 | 2) => this.input.consumeSkill(p)
    };

    const hit1 = this.p1.update(dt, p1Actions, this.p2, inputProxy);
    const hit2 = this.p2.update(dt, p2Actions, this.p1, inputProxy);

    this.resolveBodyCollision();

    if (hit1) this.processHit(hit1);
    if (hit2) this.processHit(hit2);

    this.updateEffects(dt);

    if (this.p1.isDead() && this.p2.isDead()) {
      this.endGame('DRAW!');
    } else if (this.p1.isDead()) {
      this.endGame('P2 WINS!');
    } else if (this.p2.isDead()) {
      this.endGame('P1 WINS!');
    } else if (this.timeLeft <= 0) {
      this.resolveTimeUp();
    }
  }

  public render(dt: number): void {
    this.renderer.render(
      dt,
      this.p1,
      this.p2,
      this.effects,
      Math.max(0, this.timeLeft),
      this.warningShown,
      this.warningAge,
      this.status === 'ended',
      this.winnerText,
      this.restartHovered
    );
  }

  private resolveBodyCollision(): void {
    const left = this.p1.x < this.p2.x ? this.p1 : this.p2;
    const right = left === this.p1 ? this.p2 : this.p1;
    const overlap = left.x + CHAR_WIDTH - right.x;
    if (overlap > 0) {
      const shift = overlap / 2;
      left.x -= shift;
      right.x += shift;
      if (left.x < 0) {
        right.x += -left.x;
        left.x = 0;
      }
      if (right.x + CHAR_WIDTH > 800) {
        left.x -= (right.x + CHAR_WIDTH - 800);
        right.x = 800 - CHAR_WIDTH;
      }
    }
  }

  private processHit(hit: HitEvent): void {
    this.spawnHitEffect(hit.x, hit.y);
    if (hit.isSkill) {
      this.renderer.triggerFlash();
    } else {
      this.renderer.triggerScreenShake();
    }
  }

  private spawnHitEffect(x: number, y: number): void {
    let fx: VisualEffect | undefined;
    if (this.effectPool.length > 0) {
      fx = this.effectPool.pop()!;
    } else {
      for (let i = this.effects.length - 1; i >= 0; i--) {
        if (this.effects[i].age >= this.effects[i].duration) {
          fx = this.effects.splice(i, 1)[0];
          break;
        }
      }
    }
    if (!fx) {
      fx = { type: 'hit', x: 0, y: 0, age: 0, duration: 0, frame: 0 };
    }
    fx.type = 'hit';
    fx.x = x;
    fx.y = y;
    fx.age = 0;
    fx.duration = 150;
    fx.frame = 0;
    this.effects.push(fx);
  }

  private updateEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.age += dt;
      fx.frame = Math.floor((fx.age / fx.duration) * 3);
      if (fx.age >= fx.duration) {
        this.effects.splice(i, 1);
        if (this.effectPool.length < MAX_EFFECTS) {
          this.effectPool.push(fx);
        }
      }
    }
  }

  private resolveTimeUp(): void {
    if (this.p1.hp > this.p2.hp) {
      this.endGame('P1 WINS!');
    } else if (this.p2.hp > this.p1.hp) {
      this.endGame('P2 WINS!');
    } else {
      this.endGame('DRAW!');
    }
  }

  private endGame(text: string): void {
    this.status = 'ended';
    this.winnerText = text;
  }

  private getCanvasMouse(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.status !== 'ended') return;
    const { x, y } = this.getCanvasMouse(e);
    this.restartHovered = this.renderer.isRestartButton(x, y);
    this.canvas.style.cursor = this.restartHovered ? 'pointer' : 'default';
  }

  private handleClick(e: MouseEvent): void {
    if (this.status !== 'ended') return;
    const { x, y } = this.getCanvasMouse(e);
    if (this.renderer.isRestartButton(x, y)) {
      this.reset();
    }
  }
}
