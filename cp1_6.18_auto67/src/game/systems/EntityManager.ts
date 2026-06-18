import { Player } from '../entities/Player';
import { Fragment } from '../entities/Fragment';
import { Asteroid } from '../entities/Asteroid';
import { ScoreManager } from '../systems/ScoreManager';
import { DifficultyManager } from '../systems/DifficultyManager';
import { AudioEngine } from '../../audio/AudioEngine';
import { VisualEffects } from '../render/VisualEffects';
import { DifficultyConfig, PLAYER_SIZE, CANVAS_H } from '../../types';

export class EntityManager {
  player: Player;
  fragments: Fragment[] = [];
  asteroids: Asteroid[] = [];
  scoreManager: ScoreManager;
  difficultyManager: DifficultyManager;
  audioEngine: AudioEngine;
  vfx: VisualEffects;

  fragmentSpawnTimer: number = 0;
  asteroidSpawnTimer: number = 0;
  difficultyConfig: DifficultyConfig;
  gameTime: number = 0;
  gameOver: boolean = false;
  gameOverTimer: number = 0;
  restarting: boolean = false;
  restartFadeAlpha: number = 0;

  constructor() {
    this.player = new Player(200, 520);
    this.scoreManager = new ScoreManager();
    this.difficultyManager = new DifficultyManager();
    this.audioEngine = new AudioEngine();
    this.vfx = new VisualEffects();
    this.difficultyConfig = this.difficultyManager.currentConfig;
  }

  init() {
    this.audioEngine.init();
  }

  update(dt: number, now: number) {
    if (this.gameOver) {
      this.gameOverTimer += dt;
      this.vfx.update(dt);
      return;
    }

    if (this.restarting) {
      this.restartFadeAlpha += dt * 0.5;
      if (this.restartFadeAlpha >= 1) {
        this.resetGame();
        this.restarting = false;
        this.restartFadeAlpha = 0;
      }
      return;
    }

    this.gameTime += dt;

    this.difficultyConfig = this.difficultyManager.update(dt, this.scoreManager.combo);
    this.scoreManager.update(dt, now);

    this.player.move(dt);

    this.fragmentSpawnTimer += dt * 1000;
    if (this.fragmentSpawnTimer >= this.difficultyConfig.fragmentSpawnInterval) {
      this.fragmentSpawnTimer = 0;
      if (this.fragments.length < this.difficultyConfig.maxFragments) {
        this.fragments.push(Fragment.spawnFromEdge());
      }
    }

    this.asteroidSpawnTimer += dt * 1000;
    if (this.asteroidSpawnTimer >= this.difficultyConfig.asteroidSpawnInterval) {
      this.asteroidSpawnTimer = 0;
      if (this.asteroids.length < this.difficultyConfig.maxAsteroids) {
        this.asteroids.push(Asteroid.spawn(this.difficultyConfig.asteroidSpeed));
      }
    }

    for (const frag of this.fragments) {
      frag.update(dt);
    }
    this.fragments = this.fragments.filter(f => f.alive);

    for (const ast of this.asteroids) {
      ast.update(dt);
    }
    this.asteroids = this.asteroids.filter(a => a.alive);

    this.checkCollisions(now);

    if (!this.player.alive) {
      this.gameOver = true;
      this.gameOverTimer = 0;
      this.vfx.triggerGameOverFlash();
      this.audioEngine.triggerGameOverSound();
    }

    this.vfx.update(dt);
  }

  private checkCollisions(now: number) {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      if (frag.greyed) continue;
      const result = this.player.collect(frag.x, frag.y, frag.color);
      if (result === 'match') {
        const matched = this.scoreManager.addScore(true, now);
        if (matched) {
          this.vfx.renderComboBurst(frag.x, frag.y, this.scoreManager.combo, frag.getCoreColor());
          this.audioEngine.triggerCollectSound(frag.color);
          if (this.scoreManager.combo > 1) {
            this.audioEngine.triggerComboSound(this.scoreManager.combo);
          }
          frag.alive = false;
        }
      } else if (result === 'mismatch') {
        this.scoreManager.addScore(false, now);
        frag.makeGrey();
        this.audioEngine.triggerFailSound();
        this.vfx.renderComboBurst(frag.x, frag.y, 0, '#888888');
      }
    }

    for (const ast of this.asteroids) {
      if (ast.collidesWith(this.player.x, this.player.y, PLAYER_SIZE)) {
        this.player.takeDamage();
        this.vfx.renderScreenShake(0.5, 0.3);
        this.audioEngine.triggerHitSound();
        ast.alive = false;
      }
    }
    this.asteroids = this.asteroids.filter(a => a.alive);
  }

  requestRestart() {
    if (this.gameOver && !this.restarting) {
      this.restarting = true;
      this.restartFadeAlpha = 0;
    }
  }

  private resetGame() {
    this.player.reset();
    this.fragments = [];
    this.asteroids = [];
    this.scoreManager.reset();
    this.difficultyManager.reset();
    this.difficultyConfig = this.difficultyManager.currentConfig;
    this.vfx.reset();
    this.fragmentSpawnTimer = 0;
    this.asteroidSpawnTimer = 0;
    this.gameTime = 0;
    this.gameOver = false;
    this.gameOverTimer = 0;
  }
}
