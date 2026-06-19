import { TableGeometry } from './engine/TableGeometry';
import { BallManager } from './engine/BallManager';
import { PhysicsEngine } from './engine/PhysicsEngine';
import { GameUI } from './ui/GameUI';

const TARGET_FPS = 60;
const FRAME_DURATION = 1000 / TARGET_FPS;

class Game {
  private geometry: TableGeometry;
  private ballManager: BallManager;
  private physics: PhysicsEngine;
  private ui: GameUI;
  private lastFrameTime: number = 0;
  private lastPhysicsTime: number = 0;
  private accumulator: number = 0;
  private ballPottedThisTurn: boolean = false;
  private strikeThisTurn: boolean = false;

  constructor() {
    this.geometry = new TableGeometry();
    this.ballManager = new BallManager(this.geometry);
    this.physics = new PhysicsEngine(this.ballManager, this.geometry);

    const container = document.getElementById('app');
    if (!container) {
      throw new Error('Container #app not found');
    }

    this.ui = new GameUI(container, this.ballManager, this.geometry, this.physics);

    this.ui.setOnStrike((dx: number, dy: number, power: number) => {
      this.handleStrike(dx, dy, power);
    });

    this.ui.setOnReset(() => {
      this.resetGame();
    });

    this.ui.setOnRestart(() => {
      this.resetGame();
    });

    this.ui.setOnRerack(() => {
      this.rerackGame();
    });
  }

  private rerackGame(): void {
    this.ballManager.rerack();
    this.ui.rerackGame();
    this.ballPottedThisTurn = false;
    this.strikeThisTurn = false;
  }

  private handleStrike(dx: number, dy: number, power: number): void {
    this.physics.strikeCueBall(dx, dy, power);
    this.ballPottedThisTurn = false;
    this.strikeThisTurn = true;
    this.lastPhysicsTime = performance.now();
  }

  private resetGame(): void {
    this.ballManager.reset();
    this.ui.resetGame();
    this.ballPottedThisTurn = false;
    this.strikeThisTurn = false;
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.lastPhysicsTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    const frameDelta = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    const state = this.ui.getGameState();

    if (state.phase === 'moving' && !state.gameOver) {
      const physicsDelta = currentTime - this.lastPhysicsTime;
      this.lastPhysicsTime = currentTime;
      this.accumulator += physicsDelta;

      while (this.accumulator >= FRAME_DURATION) {
        const events = this.physics.step(currentTime - this.accumulator);
        if (events.length > 0) {
          const anyPotted = this.ui.processPocketEvents(events);
          if (anyPotted) {
            this.ballPottedThisTurn = true;
          }
        }
        this.accumulator -= FRAME_DURATION;
      }

      if (this.physics.areAllBallsResting()) {
        if (this.strikeThisTurn) {
          this.strikeThisTurn = false;
          if (!this.ballPottedThisTurn && !this.ui.getGameState().gameOver) {
            this.ui.switchPlayer(true);
          }
          this.ballPottedThisTurn = false;
        }
        this.ui.endTurnIfResting();
      }
    } else {
      this.lastPhysicsTime = currentTime;
      this.accumulator = 0;
    }

    const dt = Math.min(frameDelta / 1000, 0.1);
    this.ui.render(dt);

    requestAnimationFrame(this.loop.bind(this));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
