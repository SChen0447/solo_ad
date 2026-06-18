import {
  GameState,
  InputState,
  AbilityType,
  Guard,
  CELL_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './types';
import { WorldModel } from './WorldModel';
import { Player } from './Player';
import { GuardAI } from './GuardAI';
import { SoundWaveSystem } from './SoundWave';
import { Renderer } from '../renderer/Renderer';
import { AudioManager } from '../audio/AudioManager';
import confetti from 'canvas-confetti';

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private world: WorldModel;
  private player: Player;
  private guardAI: GuardAI;
  private soundWave: SoundWaveSystem;
  private renderer: Renderer;
  private audio: AudioManager;

  private gameState: GameState = 'MENU';
  private input: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    pulse: false,
    ability: false,
  };

  private lastTime: number = 0;
  private running: boolean = false;
  private animationFrameId: number = 0;
  private hoveredAbility: number = -1;
  private selectedAbility: AbilityType | null = null;
  private fpsCounter: number = 0;
  private fpsTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.world = new WorldModel(1);
    this.player = new Player(this.world);
    this.guardAI = new GuardAI(this.world);
    this.soundWave = new SoundWaveSystem(this.world);
    this.renderer = new Renderer(canvas, this.world, this.soundWave, this.guardAI);
    this.audio = new AudioManager(this.world);

    this.setupCallbacks();
    this.setupEventListeners();
    this.resizeCanvas();
  }

  private setupCallbacks(): void {
    this.player.setCallbacks(
      () => this.onPlayerPulseFired(),
      () => this.onAbilityUsed(),
      () => this.onCoinCollected(),
    );
    this.guardAI.setCallbacks(
      () => this.onGuardAlert(),
      () => this.onGuardCaught(),
    );
    this.soundWave.setCallback(() => this.onPulseBounced());
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('resize', () => this.resizeCanvas());
    this.canvas.addEventListener('click', () => this.handleCanvasClick());
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    const maxW = container ? container.clientWidth : window.innerWidth;
    const maxH = container ? container.clientHeight : window.innerHeight;

    const gameW = GRID_WIDTH * CELL_SIZE;
    const gameH = GRID_HEIGHT * CELL_SIZE + 100;

    const scale = Math.min(maxW / (gameW + 40), maxH / (gameH + 40), 1.5);
    const w = Math.floor(gameW * scale);
    const h = Math.floor(gameH * scale);

    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = gameW;
    this.canvas.height = gameH;
    this.renderer.resize(gameW, gameH);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.audio.ensureInitialized();

    if (key === 'w' || key === 'arrowup') this.input.up = true;
    if (key === 's' || key === 'arrowdown') this.input.down = true;
    if (key === 'a' || key === 'arrowleft') this.input.left = true;
    if (key === 'd' || key === 'arrowright') this.input.right = true;
    if (key === ' ') {
      this.input.pulse = true;
      e.preventDefault();
    }
    if (key === 'e') this.input.ability = true;

    if (this.gameState === 'ABILITY_SELECT') {
      if (key === '1') this.selectAbility(0);
      if (key === '2') this.selectAbility(1);
      if (key === '3') this.selectAbility(2);
    }

    if (this.gameState === 'MENU' && (key === 'enter' || key === ' ')) {
      this.goToAbilitySelect();
    }

    if (this.gameState === 'LEVEL_COMPLETE' && key === 'enter') {
      this.nextLevel();
    }

    if (this.gameState === 'GAME_OVER' && key === 'r') {
      this.restartLevel();
    }

    if (this.gameState === 'VICTORY' && key === 'enter') {
      this.restartGame();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') this.input.up = false;
    if (key === 's' || key === 'arrowdown') this.input.down = false;
    if (key === 'a' || key === 'arrowleft') this.input.left = false;
    if (key === 'd' || key === 'arrowright') this.input.right = false;
    if (key === ' ') this.input.pulse = false;
    if (key === 'e') this.input.ability = false;
  }

  private handleCanvasClick(): void {
    this.audio.init();
    this.audio.ensureInitialized();

    if (this.gameState === 'MENU') {
      this.goToAbilitySelect();
    } else if (this.gameState === 'ABILITY_SELECT') {
      if (this.hoveredAbility >= 0 && this.hoveredAbility < 3) {
        this.selectAbility(this.hoveredAbility);
      }
    } else if (this.gameState === 'LEVEL_COMPLETE') {
      this.nextLevel();
    } else if (this.gameState === 'GAME_OVER') {
      this.restartLevel();
    } else if (this.gameState === 'VICTORY') {
      this.restartGame();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.gameState !== 'ABILITY_SELECT') {
      this.hoveredAbility = -1;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const panelW = 560;
    const panelH = 360;
    const py = centerY - panelH / 2 + 100;
    const cardW = 150;
    const cardH = 200;
    const startX = centerX - (cardW * 3 + 40) / 2;

    this.hoveredAbility = -1;
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (cardW + 20);
      if (mx >= cx && mx <= cx + cardW && my >= py && my <= py + cardH) {
        this.hoveredAbility = i;
        break;
      }
    }
  }

  private selectAbility(index: number): void {
    const abilities: AbilityType[] = ['SONIC_BOOST', 'INVISIBILITY_CLOAK', 'AGILITY_BOOTS'];
    this.selectedAbility = abilities[index];
    this.world.setAbility(this.selectedAbility);
    this.startLevel(1);
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameState = 'MENU';
    this.tick();
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.audio.destroy();
  }

  private tick = (): void => {
    if (!this.running) return;

    const now = performance.now();
    let delta = (now - this.lastTime) / 1000;
    if (delta > 0.05) delta = 0.05;
    this.lastTime = now;

    this.fpsCounter++;
    this.fpsTime += delta;
    if (this.fpsTime >= 1) {
      this.fpsCounter = 0;
      this.fpsTime = 0;
    }

    this.update(delta);
    this.render(delta);

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private update(delta: number): void {
    if (this.gameState === 'PLAYING') {
      this.player.update(delta, this.input);
      this.guardAI.update(delta);
      this.soundWave.update(delta);
      this.world.updateAbility(delta);
      this.world.updateTime(delta);
      this.audio.updateGuardProximity(delta);

      if (this.world.isAtExit()) {
        this.onLevelComplete();
      }
      if (this.world.isTimeUp()) {
        this.onGameOver();
      }
    }
  }

  private render(delta: number): void {
    this.renderer.render(this.gameState, delta, this.selectedAbility, this.hoveredAbility);

    if (this.gameState === 'MENU') {
      this.drawMenu();
    }

    if (this.gameState === 'VICTORY') {
      this.drawVictory();
    }
  }

  private drawMenu(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.canvas.getContext('2d')!;

    ctx.save();
    ctx.fillStyle = 'rgba(10, 11, 26, 0.85)';
    ctx.fillRect(0, 0, w, h);

    const titleY = h / 2 - 100;
    const time = performance.now() / 1000;
    const pulse = (Math.sin(time * 2) + 1) * 0.5;

    const titleGlow = ctx.createRadialGradient(w / 2, titleY + 20, 0, w / 2, titleY + 20, 300);
    titleGlow.addColorStop(0, `rgba(120, 100, 220, ${0.3 + pulse * 0.2})`);
    titleGlow.addColorStop(1, 'rgba(120, 100, 220, 0)');
    ctx.fillStyle = titleGlow;
    ctx.fillRect(0, titleY - 100, w, 300);

    ctx.font = '28px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#C8B0FF';
    ctx.strokeStyle = '#6A4AAA';
    ctx.lineWidth = 3;
    ctx.strokeText('回声寻路', w / 2, titleY);
    ctx.fillText('回声寻路', w / 2, titleY);

    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = '#8899CC';
    ctx.fillText('ECHO  PATHFINDER', w / 2, titleY + 45);

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = `rgba(200, 200, 230, ${0.6 + pulse * 0.4})`;
    ctx.fillText('[ 点击 或 按 ENTER 开始 ]', w / 2, h / 2 + 50);

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#6677AA';
    const instructions = [
      'WASD / 方向键 移动',
      '空格键 发射声波脉冲',
      'E 键 使用能力',
      '躲避守卫 找到出口',
    ];
    for (let i = 0; i < instructions.length; i++) {
      ctx.fillText(instructions[i], w / 2, h / 2 + 110 + i * 22);
    }

    ctx.restore();
  }

  private drawVictory(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.canvas.getContext('2d')!;
    const time = performance.now() / 1000;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 10, 40, 0.75)';
    ctx.fillRect(0, 0, w, h);

    const pulse = (Math.sin(time * 3) + 1) * 0.5;
    ctx.font = '28px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `#FFD700`;
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 3;
    const title = '✦ 胜利! ✦';
    ctx.strokeText(title, w / 2, h / 2 - 40);
    ctx.fillText(title, w / 2, h / 2 - 40);

    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillStyle = '#C8C0E0';
    ctx.fillText(
      `共收集金币: ${this.world.getTotalCoinsCollected()}`,
      w / 2,
      h / 2 + 20,
    );

    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = `rgba(180, 200, 230, ${0.6 + pulse * 0.4})`;
    ctx.fillText('[ 点击 或 按 ENTER 重新开始 ]', w / 2, h / 2 + 80);

    ctx.restore();
  }

  private goToAbilitySelect(): void {
    this.audio.init();
    this.gameState = 'ABILITY_SELECT';
  }

  private startLevel(levelId: number): void {
    this.world.loadLevel(levelId);
    if (this.selectedAbility) {
      this.world.setAbility(this.selectedAbility);
    }
    this.guardAI = new GuardAI(this.world);
    this.soundWave = new SoundWaveSystem(this.world);
    this.renderer = new Renderer(this.canvas, this.world, this.soundWave, this.guardAI);
    this.setupCallbacks();
    this.gameState = 'PLAYING';
    this.audio.init();
    this.resizeCanvas();
  }

  private onPlayerPulseFired(): void {
    const pos = this.world.getPlayerPosition();
    const dir = this.player.getLastMovementDirection();
    const config = this.player.getPulseConfig();
    this.soundWave.firePulse(pos, dir, config.speedMultiplier, config.extraBounces);
    this.audio.playPulseSound(1, config.speedMultiplier);
  }

  private onPulseBounced(): void {
    this.audio.playBounceSound(0.8);
  }

  private onAbilityUsed(): void {
    this.audio.playAbilitySound();
  }

  private onCoinCollected(): void {
    this.audio.playCoinSound();
  }

  private onGuardAlert(): void {
    this.audio.playGuardAlertSound();
  }

  private onGuardCaught(): void {
    this.onGameOver();
  }

  private onLevelComplete(): void {
    if (this.gameState !== 'PLAYING') return;

    this.audio.playVictorySound();
    const currentLevel = this.world.getLevelId();

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFE880', '#FFA500', '#FFFFFF', '#8866FF'],
    });
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFE880'],
      });
    }, 200);
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFE880'],
      });
    }, 400);

    if (currentLevel >= 5) {
      setTimeout(() => {
        this.gameState = 'VICTORY';
        confetti({
          particleCount: 200,
          spread: 120,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FFE880', '#FFA500', '#FFFFFF', '#8866FF', '#FF88AA'],
        });
      }, 1500);
    } else {
      this.gameState = 'LEVEL_COMPLETE';
    }
  }

  private nextLevel(): void {
    const next = this.world.getLevelId() + 1;
    if (next > 5) {
      this.gameState = 'VICTORY';
    } else {
      this.startLevel(next);
    }
  }

  private onGameOver(): void {
    if (this.gameState !== 'PLAYING') return;
    this.gameState = 'GAME_OVER';
    this.audio.playGameOverSound();
  }

  private restartLevel(): void {
    const current = this.world.getLevelId();
    this.startLevel(current);
  }

  private restartGame(): void {
    this.world = new WorldModel(1);
    this.selectedAbility = null;
    this.player = new Player(this.world);
    this.guardAI = new GuardAI(this.world);
    this.soundWave = new SoundWaveSystem(this.world);
    this.renderer = new Renderer(this.canvas, this.world, this.soundWave, this.guardAI);
    this.audio = new AudioManager(this.world);
    this.setupCallbacks();
    this.gameState = 'MENU';
    this.resizeCanvas();
  }

  public getGameState(): GameState {
    return this.gameState;
  }
}
