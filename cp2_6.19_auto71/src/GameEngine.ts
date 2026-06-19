import { ShipManager } from './ShipManager';
import { Renderer } from './Renderer';
import { InputHandler } from './InputHandler';

class GameEngine {
  private canvas: HTMLCanvasElement;
  private shipManager: ShipManager;
  private renderer: Renderer;
  private inputHandler: InputHandler;
  private lastTime: number = 0;
  private elapsedTime: number = 0;
  private waveTime: number = 0;
  private shatterFlash: number = 0;
  private running: boolean = false;
  private animationId: number = 0;
  private totalEnemyCount: number = 5;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');
    this.canvas = canvas;

    this.shipManager = new ShipManager();
    this.renderer = new Renderer(canvas);
    this.inputHandler = new InputHandler(canvas);

    this.init();
  }

  private init(): void {
    this.shipManager.init(this.canvas.width, this.canvas.height);
    this.totalEnemyCount = this.shipManager.ships.filter(s => s.team === 'enemy').length;
    this.elapsedTime = 0;
    this.waveTime = 0;
    this.shatterFlash = 0;
    this.lastTime = performance.now();
    this.running = true;
    this.loop();
  }

  private loop(): void {
    if (!this.running) return;
    this.animationId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    const dt = Math.min(50, now - this.lastTime);
    this.lastTime = now;
    this.elapsedTime += dt;
    this.waveTime += dt;

    if (this.shatterFlash > 0) {
      this.shatterFlash = Math.max(0, this.shatterFlash - dt / 400);
    }

    const actions = this.inputHandler.pollActions();
    if (actions.moveTarget) {
      this.shipManager.setFleetTarget(actions.moveTarget.x, actions.moveTarget.y);
    }
    if (actions.changeFormation) {
      this.shipManager.applyFormation(actions.changeFormation, true);
    }
    if (actions.activateFocusFire) {
      this.shipManager.activateFocusFire(5000);
    }

    const updateResult = this.shipManager.update(dt, this.canvas.width, this.canvas.height);
    if (updateResult.playerShipSunk) {
      this.shatterFlash = 1;
      const center = this.shipManager.getFleetCenter();
      this.shipManager.spawnShatterEffect(
        this.canvas.width / 2,
        this.canvas.height / 2
      );
      void center;
    }

    const playerHp = this.shipManager.getTotalPlayerHp();

    this.renderer.render(
      this.shipManager.ships,
      this.shipManager.projectiles,
      this.shipManager.particles,
      {
        formation: this.shipManager.formation,
        isFocusFire: this.shipManager.isFocusFire,
        focusFireTimer: this.shipManager.focusFireTimer,
        killCount: this.shipManager.killCount,
        elapsedTime: this.elapsedTime,
        totalEnemyCount: this.totalEnemyCount,
        destroyedPlayerShipIds: this.shipManager.destroyedPlayerShips,
        playerHp,
        waveTime: this.waveTime,
        shatterFlash: this.shatterFlash
      }
    );

    const aliveEnemies = this.shipManager.ships.filter(s => s.team === 'enemy' && s.isAlive).length;
    const alivePlayers = this.shipManager.ships.filter(s => s.team === 'player' && s.isAlive).length;
    if (aliveEnemies === 0 || alivePlayers === 0) {
      setTimeout(() => {
        if (confirm(aliveEnemies === 0 ? '胜利！所有敌舰已被击沉！是否重新开始？' : '战败！舰队已被歼灭。是否重新开始？')) {
          this.init();
        } else {
          this.running = false;
        }
      }, 500);
    }
  }

  destroy(): void {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.inputHandler.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
