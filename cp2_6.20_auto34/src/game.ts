import { Level, TILE_SIZE, LEVEL_PIXEL_WIDTH, LEVEL_PIXEL_HEIGHT } from './level';
import { Player, Particle } from './player';

export type GameState = 'menu' | 'playing' | 'rewind' | 'dead' | 'gameover' | 'win';

export interface WinParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export class Game {
  level: Level;
  player: Player;
  state: GameState;
  lives: number;
  gameTime: number;

  input: {
    left: boolean;
    right: boolean;
    jump: boolean;
    slow: boolean;
    interact: boolean;
    rewind: boolean;
    rewindQ: boolean;
    rewindW: boolean;
    rewindE: boolean;
  };

  lastCheckpoint: { x: number; y: number };

  deathFlashTime: number;
  rewindFlashTime: number;
  rewindProgress: number;

  winParticles: WinParticle[] = [];
  winTextTime: number;
  winTransitionTime: number;

  gameOverTextTime: number;

  constructor() {
    this.level = new Level();
    this.player = new Player(this.level.spawnPoint.x, this.level.spawnPoint.y);
    this.state = 'menu';
    this.lives = 3;
    this.gameTime = 0;

    this.input = {
      left: false,
      right: false,
      jump: false,
      slow: false,
      interact: false,
      rewind: false,
      rewindQ: false,
      rewindW: false,
      rewindE: false,
    };

    this.lastCheckpoint = { ...this.level.spawnPoint };

    this.deathFlashTime = 0;
    this.rewindFlashTime = 0;
    this.rewindProgress = 0;

    this.winTextTime = 0;
    this.winTransitionTime = 0;
    this.gameOverTextTime = 0;
  }

  startGame() {
    this.state = 'playing';
    this.lives = 3;
    this.gameTime = 0;
    this.level = new Level();
    this.player.reset(this.level.spawnPoint.x, this.level.spawnPoint.y);
    this.lastCheckpoint = { ...this.level.spawnPoint };
    this.winParticles = [];
    this.winTextTime = 0;
    this.gameOverTextTime = 0;
  }

  restartGame() {
    this.startGame();
  }

  update(dt: number) {
    if (this.state === 'menu') {
      if (this.input.jump) {
        this.startGame();
      }
      return;
    }

    if (this.state === 'gameover') {
      this.gameOverTextTime += dt;
      if (this.gameOverTextTime >= 2) {
        this.startGame();
      }
      return;
    }

    if (this.state === 'win') {
      this.winTextTime += dt;
      for (let i = this.winParticles.length - 1; i >= 0; i--) {
        const p = this.winParticles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt;
        if (p.life <= 0) {
          this.winParticles.splice(i, 1);
        }
      }
      if (this.winTextTime >= 2) {
        this.state = 'menu';
      }
      return;
    }

    if (this.deathFlashTime > 0) {
      this.deathFlashTime -= dt;
    }

    if (this.rewindFlashTime > 0) {
      this.rewindFlashTime -= dt;
    }

    if (this.state === 'rewind') {
      this.updateRewind(dt);
      return;
    }

    this.gameTime += dt;

    this.level.update(dt);

    this.player.update(
      dt,
      this.input,
      (x, w, pb, cb, vy) => this.level.getGroundY(x, w, pb, cb, vy),
      (x, y, w, h, vx) => this.level.checkWallCollision(x, y, w, h, vx),
      (x, y, w, h, vy) => this.level.checkCeilingCollision(x, y, w, h, vy)
    );

    this.handlePushBox(dt);

    this.player.recordHistory(this.gameTime);

    const checkpoint = this.level.checkCheckpointCollision(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    );
    if (checkpoint && !checkpoint.activated) {
      checkpoint.activated = true;
      checkpoint.glowTime = 0.5;
      this.lastCheckpoint = {
        x: checkpoint.x * TILE_SIZE,
        y: checkpoint.y * TILE_SIZE - TILE_SIZE * 0.2,
      };
    }

    if (
      this.level.checkSpikeCollision(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height
      ) ||
      this.player.isFallingOut()
    ) {
      this.die();
      return;
    }

    if (
      this.level.checkGoalCollision(
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height
      )
    ) {
      this.win();
      return;
    }

    if (this.input.rewind) {
      this.enterRewindMode();
    }
  }

  updateRewind(dt: number) {
    const historyDuration = this.player.getHistoryDuration();
    if (historyDuration <= 0) {
      this.exitRewindMode();
      return;
    }

    const latestTime = this.player.getLatestHistoryTime();
    const currentRewindTime = latestTime - this.rewindProgress * historyDuration;

    if (this.input.rewindQ) {
      this.performRewind(0.5);
      this.input.rewindQ = false;
    }
    if (this.input.rewindW) {
      this.performRewind(2);
      this.input.rewindW = false;
    }
    if (this.input.rewindE) {
      this.performRewind(5);
      this.input.rewindE = false;
    }

    if (!this.input.rewind) {
      this.exitRewindMode();
    }
  }

  enterRewindMode() {
    if (this.player.history.length < 2) return;
    this.state = 'rewind';
    this.rewindProgress = 0;
  }

  exitRewindMode() {
    this.state = 'playing';
  }

  performRewind(amount: number) {
    const historyDuration = this.player.getHistoryDuration();
    if (historyDuration <= 0) return;

    const latestTime = this.player.getLatestHistoryTime();
    const targetTime = latestTime - amount;

    const success = this.player.rewindTo(targetTime);
    if (success) {
      this.rewindFlashTime = 0.3;
      this.gameTime = targetTime;
    }

    const newDuration = this.player.getHistoryDuration();
    const maxDuration = 30;
    this.rewindProgress = 1 - newDuration / maxDuration;
  }

  handlePushBox(dt: number) {
    const pushBox = this.level.pushBox;
    const player = this.player;

    if (!this.input.interact) return;

    const nearThreshold = 8;

    const yOverlap =
      player.y + player.height > pushBox.y + 2 &&
      player.y < pushBox.y + pushBox.height - 2;

    if (!yOverlap) return;

    const playerRight = player.x + player.width;
    const playerLeft = player.x;
    const boxRight = pushBox.x + pushBox.width;
    const boxLeft = pushBox.x;

    const onRightSide = Math.abs(playerLeft - boxRight) < nearThreshold;
    const onLeftSide = Math.abs(playerRight - boxLeft) < nearThreshold;

    let pushDirection = 0;

    if (this.input.right && onLeftSide) {
      pushDirection = 1;
    } else if (this.input.left && onRightSide) {
      pushDirection = -1;
    } else if (onLeftSide && !onRightSide) {
      pushDirection = 1;
    } else if (onRightSide && !onLeftSide) {
      pushDirection = -1;
    }

    if (pushDirection !== 0) {
      const speed = this.input.slow ? player.slowSpeed : player.moveSpeed;
      pushBox.velX = (pushDirection * speed) / 60;

      const pushAmount = pushDirection * speed * dt;
      const newBoxX = pushBox.x + pushAmount;

      let canPush = true;
      for (const plat of this.level.platforms) {
        const platX = plat.x * TILE_SIZE;
        const platY = plat.y * TILE_SIZE;
        const platW = plat.width * TILE_SIZE;
        const platH = plat.height * TILE_SIZE;

        if (
          newBoxX + pushBox.width > platX &&
          newBoxX < platX + platW &&
          pushBox.y + pushBox.height > platY + 1 &&
          pushBox.y < platY + platH - 1
        ) {
          canPush = false;
          break;
        }
      }

      if (newBoxX < 0 || newBoxX + pushBox.width > LEVEL_PIXEL_WIDTH) {
        canPush = false;
      }

      if (canPush) {
        pushBox.x = newBoxX;
      }
    }
  }

  die() {
    this.lives--;
    this.deathFlashTime = 0.2;

    if (this.lives <= 0) {
      this.state = 'gameover';
      this.gameOverTextTime = 0;
    } else {
      this.respawn();
    }
  }

  respawn() {
    this.player.x = this.lastCheckpoint.x;
    this.player.y = this.lastCheckpoint.y;
    this.player.velX = 0;
    this.player.velY = 0;
    this.player.history = [];
    this.player.particles = [];
    this.player.jumpsLeft = this.player.maxJumps;
  }

  win() {
    this.state = 'win';
    this.winTextTime = 0;
    this.spawnWinParticles();
  }

  spawnWinParticles() {
    const gx = this.level.goal.x * TILE_SIZE + TILE_SIZE / 2;
    const gy = this.level.goal.y * TILE_SIZE + TILE_SIZE / 2;

    const colors = ['#ff4444', '#ffaa00', '#ffff44', '#44ff44', '#44aaff', '#aa44ff', '#ff44aa'];

    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 300;
      const size = 5 + Math.random() * 10;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.winParticles.push({
        x: gx,
        y: gy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: size,
        color: color,
        life: 1.5,
        maxLife: 1.5,
      });
    }
  }

  handleKeyDown(e: KeyboardEvent) {
    switch (e.code) {
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = true;
        break;
      case 'KeyW':
      case 'ArrowUp':
        if (this.state === 'rewind') {
          this.input.rewindW = true;
        }
        break;
      case 'Space':
        this.input.jump = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.slow = true;
        break;
      case 'Tab':
        this.input.rewind = true;
        e.preventDefault();
        break;
      case 'KeyQ':
        if (this.state === 'rewind') {
          this.input.rewindQ = true;
        }
        break;
      case 'KeyE':
        if (this.state === 'rewind') {
          this.input.rewindE = true;
        } else {
          this.input.interact = true;
        }
        break;
    }
  }

  handleKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case 'KeyA':
      case 'ArrowLeft':
        this.input.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.input.right = false;
        break;
      case 'KeyW':
      case 'ArrowUp':
        this.input.rewindW = false;
        break;
      case 'Space':
        this.input.jump = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.input.slow = false;
        break;
      case 'Tab':
        this.input.rewind = false;
        e.preventDefault();
        break;
      case 'KeyQ':
        this.input.rewindQ = false;
        break;
      case 'KeyE':
        this.input.rewindE = false;
        this.input.interact = false;
        break;
    }
  }
}
