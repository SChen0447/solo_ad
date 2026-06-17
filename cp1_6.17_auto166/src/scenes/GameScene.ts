import Phaser from 'phaser';
import { Player } from '../sprites/Player';
import { Obstacle, ObstaclePool, ObstacleType } from '../sprites/Obstacle';

interface PendingWarning {
  type: ObstacleType;
  x: number;
  spawnY: number;
  timer: number;
  warning: Obstacle;
}

export class GameScene extends Phaser.Scene {
  private player1!: Player;
  private player2!: Player;
  private obstaclePool!: ObstaclePool;
  private groundLevel: number = 0;
  private scrollSpeed: number = 100;
  private initialScrollSpeed: number = 100;
  private finalScrollSpeed: number = 200;
  private gameTime: number = 0;
  private gameDuration: number = 120000;
  private survivalTime: number = 0;
  private score: number = 0;
  private scoreTimer: number = 0;
  private spawnTimer: number = 0;
  private spawnInterval: number = 1200;
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private isVictory: boolean = false;
  private pendingWarnings: PendingWarning[] = [];
  private warningLeadTime: number = 2000;
  private finishSpawned: boolean = false;
  private finishLineY: number = -200;

  private p1Hearts: Phaser.GameObjects.Graphics[] = [];
  private p2Hearts: Phaser.GameObjects.Graphics[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private lossText!: Phaser.GameObjects.Text;
  private gameOverPanel!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#222222');

    this.groundLevel = this.cameras.main.height - 80;
    this.gameTime = 0;
    this.survivalTime = 0;
    this.score = 0;
    this.scoreTimer = 0;
    this.spawnTimer = 0;
    this.isPaused = false;
    this.isGameOver = false;
    this.isVictory = false;
    this.finishSpawned = false;
    this.pendingWarnings = [];
    this.scrollSpeed = this.initialScrollSpeed;

    this.createPlayers();
    this.obstaclePool = new ObstaclePool(this, 40);
    this.createHUD();
    this.createLossText();
    this.setupCollisions();
    this.setupKeyboardExit();
  }

  private createPlayers(): void {
    const centerX = this.cameras.main.width / 2;
    const spawnY = this.groundLevel - 20;

    this.player1 = new Player(this, {
      x: centerX - 60,
      y: spawnY,
      color: 0x3498DB,
      playerIndex: 1,
      controls: { left: 'A', right: 'D', up: 'W', down: 'S' }
    });
    this.player1.setDepth(5);
    this.player1.isOnGround = true;

    this.player2 = new Player(this, {
      x: centerX + 60,
      y: spawnY,
      color: 0xE74C3C,
      playerIndex: 2,
      controls: { left: 'LEFT', right: 'RIGHT', up: 'UP', down: 'DOWN' }
    });
    this.player2.setDepth(5);
    this.player2.isOnGround = true;
  }

  private createHUD(): void {
    for (let i = 0; i < 3; i++) {
      const g = this.add.graphics();
      g.setScrollFactor(0);
      g.setDepth(20);
      this.p1Hearts.push(g);
    }
    for (let i = 0; i < 3; i++) {
      const g = this.add.graphics();
      g.setScrollFactor(0);
      g.setDepth(20);
      this.p2Hearts.push(g);
    }
    this.updateHearts();

    this.scoreText = this.add.text(this.cameras.main.width / 2, 20, '得分: 0', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });
    this.scoreText.setOrigin(0.5, 0);
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(20);
    this.scoreText.setStroke('#000000', 2);

    this.timeText = this.add.text(this.cameras.main.width / 2, 50, '时间: 0s', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });
    this.timeText.setOrigin(0.5, 0);
    this.timeText.setScrollFactor(0);
    this.timeText.setDepth(20);
    this.timeText.setStroke('#000000', 2);
  }

  private drawHeart(g: Phaser.GameObjects.Graphics, x: number, y: number, full: boolean, damaged: boolean, scale: number = 1): void {
    g.clear();
    const size = 16 * scale;
    g.save();
    g.translateCanvas(x, y);
    g.scaleCanvas(scale, scale);

    if (full) {
      g.fillStyle(damaged ? 0xaaaaaa : 0xe74c3c, 1);
      g.fillRoundedRect(-12, -10, 10, 10, 2);
      g.fillRoundedRect(2, -10, 10, 10, 2);
      g.fillRoundedRect(-10, -4, 20, 12, 2);
      g.beginPath();
      g.moveTo(-10, 4);
      g.lineTo(0, 14);
      g.lineTo(10, 4);
      g.closePath();
      g.fillPath();
    } else {
      g.lineStyle(2, 0xc0392b, 1);
      g.strokeRoundedRect(-12, -10, 10, 10, 2);
      g.strokeRoundedRect(2, -10, 10, 10, 2);
      g.strokeRoundedRect(-10, -4, 20, 12, 2);
      g.beginPath();
      g.moveTo(-10, 4);
      g.lineTo(0, 14);
      g.lineTo(10, 4);
      g.closePath();
      g.strokePath();
    }
    g.restore();
  }

  private updateHearts(): void {
    for (let i = 0; i < 3; i++) {
      const full = i < this.player1.lives;
      const damaged = !full && i < this.player1.maxLives;
      const scale = full ? 1 : 0.8;
      this.drawHeart(this.p1Hearts[i], 30 + i * 28, 30, full, damaged, scale);
    }
    for (let i = 0; i < 3; i++) {
      const full = i < this.player2.lives;
      const damaged = !full && i < this.player2.maxLives;
      const scale = full ? 1 : 0.8;
      this.drawHeart(this.p2Hearts[i], this.cameras.main.width - 30 - (2 - i) * 28, 30, full, damaged, scale);
    }
  }

  private createLossText(): void {
    this.lossText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, '', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#C0392B',
      fontStyle: 'bold'
    });
    this.lossText.setOrigin(0.5);
    this.lossText.setScrollFactor(0);
    this.lossText.setDepth(30);
    this.lossText.setVisible(false);
  }

  private showLossText(): void {
    this.lossText.setText('失去一条命！');
    this.lossText.setVisible(true);
    this.lossText.setAlpha(1);
    this.lossText.setScale(0.5);

    this.tweens.add({
      targets: this.lossText,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });

    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: this.lossText,
        alpha: 0,
        duration: 200,
        ease: 'Cubic.easeIn',
        onComplete: () => this.lossText.setVisible(false)
      });
    });
  }

  private setupCollisions(): void {
    this.physics.add.overlap(this.player1, this.obstaclePool.getActive(), this.handlePlayer1Obstacle, undefined, this);
    this.physics.add.overlap(this.player2, this.obstaclePool.getActive(), this.handlePlayer2Obstacle, undefined, this);
  }

  private handlePlayer1Obstacle(p: Phaser.GameObjects.GameObject, o: Phaser.GameObjects.GameObject): void {
    this.handleObstacleCollision(this.player1, o as Obstacle);
  }

  private handlePlayer2Obstacle(p: Phaser.GameObjects.GameObject, o: Phaser.GameObjects.GameObject): void {
    this.handleObstacleCollision(this.player2, o as Obstacle);
  }

  private handleObstacleCollision(player: Player, obstacle: Obstacle): void {
    if (this.isPaused || this.isGameOver) return;
    if (!obstacle.isPoolActive()) return;

    switch (obstacle.obstacleType) {
      case 'spike':
        this.handleDamage(player, obstacle);
        break;
      case 'enemy':
        if (player.isInvincible) {
          this.obstaclePool.release(obstacle);
          this.addScore(20);
        } else {
          this.handleDamage(player, obstacle);
        }
        break;
      case 'star':
        player.pickInvincible();
        this.obstaclePool.release(obstacle);
        this.addScore(5);
        break;
      case 'speedBoost':
        player.pickSpeedBoost();
        this.obstaclePool.release(obstacle);
        this.addScore(5);
        break;
      case 'shield':
        player.pickShield();
        this.obstaclePool.release(obstacle);
        this.addScore(5);
        break;
      case 'platform':
        break;
      case 'finishFlag':
        this.triggerVictory();
        break;
    }
  }

  private handleDamage(player: Player, obstacle: Obstacle): void {
    if (player.isInvincible) return;
    const wasAlive = player.lives > 0;
    const damaged = player.takeDamage();

    if (damaged) {
      this.updateHearts();
      if (player.lives <= 0 && wasAlive) {
        this.handlePlayerDeath(player);
      } else {
        this.showLossText();
      }
    }
  }

  private handlePlayerDeath(player: Player): void {
    this.isPaused = true;
    this.showLossText();

    this.time.delayedCall(1000, () => {
      const centerX = this.cameras.main.width / 2;
      const respawnY = Math.min(this.cameras.main.height / 2, this.groundLevel - 20);
      player.respawn(centerX, respawnY);
      this.updateHearts();
      this.isPaused = false;
    });
  }

  private addScore(amount: number): void {
    this.score += amount;
    this.scoreText.setText(`得分: ${this.score}`);
  }

  private setupKeyboardExit(): void {
    const esc = this.input.keyboard?.addKey('ESC');
    esc?.on('down', () => {
      this.scene.start('MenuScene');
    });
  }

  public update(time: number, delta: number): void {
    if (this.isGameOver) return;

    if (!this.isPaused) {
      this.gameTime += delta;
      this.survivalTime += delta;
      this.updateScrollSpeed();
      this.updateSpawning(delta);
      this.updatePendingWarnings(delta);
      this.updateGroundCollision();
      this.cleanupOffscreen();
      this.checkVictorySpawn();
    }

    this.player1.update(time, delta);
    this.player2.update(time, delta);
    this.obstaclePool.updateAll(time, delta);
    this.obstaclePool.setScrollVelocityForAll(this.scrollSpeed);
    this.updateHUD();
    this.updateActiveColliders();
  }

  private updateScrollSpeed(): void {
    const progress = Math.min(this.gameTime / 60000, 1);
    this.scrollSpeed = this.initialScrollSpeed + (this.finalScrollSpeed - this.initialScrollSpeed) * progress;
  }

  private updateSpawning(delta: number): void {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval && !this.finishSpawned) {
      this.spawnTimer = 0;
      this.scheduleObstacle();
      this.spawnInterval = Phaser.Math.Between(800, 1500);
    }
  }

  private scheduleObstacle(): void {
    const types: ObstacleType[] = ['spike', 'spike', 'platform', 'star', 'speedBoost', 'shield', 'enemy'];
    const type = Phaser.Utils.Array.GetRandom(types) as ObstacleType;
    const width = this.cameras.main.width;

    let x: number;
    switch (type) {
      case 'platform':
        x = Phaser.Math.Between(80, width - 80);
        break;
      case 'spike':
        x = Phaser.Math.Between(40, width - 40);
        break;
      default:
        x = Phaser.Math.Between(30, width - 30);
        break;
    }

    const spawnY = this.cameras.main.height + 50;

    const warning = this.obstaclePool.acquire({ type: 'warning', x: x, y: -30 });
    if (type === 'platform') {
      warning.setDisplaySize(60, 20);
    } else {
      warning.setDisplaySize(20, 20);
    }

    this.pendingWarnings.push({
      type,
      x,
      spawnY,
      timer: this.warningLeadTime,
      warning
    });
  }

  private updatePendingWarnings(delta: number): void {
    for (let i = this.pendingWarnings.length - 1; i >= 0; i--) {
      const pw = this.pendingWarnings[i];
      pw.timer -= delta;

      const progress = 1 - pw.timer / this.warningLeadTime;
      const targetY = -30 + (this.cameras.main.height + 50 - (-30)) * progress * 0.15;
      pw.warning.setY(targetY);

      if (pw.timer <= 0) {
        this.obstaclePool.release(pw.warning);
        this.obstaclePool.acquire({ type: pw.type, x: pw.x, y: pw.spawnY });
        this.pendingWarnings.splice(i, 1);
      }
    }
  }

  private updateGroundCollision(): void {
    const checkGround = (player: Player): void => {
      if (player.isDead) return;
      const playerBottom = player.y + 8;
      if (playerBottom >= this.groundLevel) {
        if (!player.isOnGround && player.body.velocity.y > 0) {
          player.playLandingDust();
        }
        player.y = this.groundLevel - 8;
        player.setVelocityY(0);
        player.isOnGround = true;
      } else {
        player.isOnGround = false;
      }

      player.body.velocity.y += 800 * (this.game.loop.delta / 1000);

      if (player.x < 10) player.x = 10;
      if (player.x > this.cameras.main.width - 10) player.x = this.cameras.main.width - 10;
    };

    checkGround(this.player1);
    checkGround(this.player2);
  }

  private cleanupOffscreen(): void {
    const bottomLimit = this.cameras.main.height + 100;
    this.obstaclePool.getActive().forEach(o => {
      if (o.y > bottomLimit) {
        this.obstaclePool.release(o);
      }
    });
  }

  private checkVictorySpawn(): void {
    if (this.finishSpawned) return;
    if (this.gameTime >= this.gameDuration) {
      this.finishSpawned = true;
      const w = this.obstaclePool.acquire({
        type: 'warning',
        x: this.cameras.main.width / 2,
        y: -60
      });
      w.setDisplaySize(100, 30);

      this.time.delayedCall(this.warningLeadTime, () => {
        this.obstaclePool.release(w);
        this.obstaclePool.acquire({
          type: 'finishFlag',
          x: this.cameras.main.width / 2,
          y: this.cameras.main.height + 30
        });
      });
    }
  }

  private triggerVictory(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.isVictory = true;
    this.showGameOverPanel(true);
  }

  private updateHUD(): void {
    this.timeText.setText(`时间: ${Math.floor(this.survivalTime / 1000)}s`);

    this.scoreTimer += this.game.loop.delta;
    if (this.scoreTimer >= 5000) {
      this.scoreTimer -= 5000;
      this.addScore(10);
    }
  }

  private updateActiveColliders(): void {
    const active = this.obstaclePool.getActive();
    (this.physics.world as Phaser.Physics.Arcade.World).colliders?.forEach((c) => {
      if (c.object2 === this.obstaclePool.getActive()) {
        (c as any).object2 = active;
      }
    });
  }

  private showGameOverPanel(victory: boolean): void {
    this.isPaused = true;
    this.gameOverPanel = this.add.container(this.cameras.main.width / 2, this.cameras.main.height + 300);
    this.gameOverPanel.setDepth(100);
    this.gameOverPanel.setScrollFactor(0);

    const cardW = 400;
    const cardH = 300;

    const bg = this.add.rectangle(0, 0, cardW, cardH, 0x000000, 0.8);
    bg.setStrokeStyle(2, 0xffffff, 0.5);
    bg.setRadius(12);

    const shadow = this.add.rectangle(5, 5, cardW, cardH, 0x000000, 0.3);
    shadow.setRadius(12);

    const titleText = victory ? '胜利！' : '游戏结束';
    const titleColor = victory ? '#2ECC71' : '#E74C3C';
    const title = this.add.text(0, -cardH / 2 + 40, titleText, {
      fontFamily: 'sans-serif',
      fontSize: '36px',
      color: titleColor,
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    const finalScore = this.add.text(0, -cardH / 2 + 90, `最终得分: ${this.score}`, {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      color: '#FFFFFF'
    });
    finalScore.setOrigin(0.5);

    const finalTime = this.add.text(0, -cardH / 2 + 125, `生存时间: ${Math.floor(this.survivalTime / 1000)}秒`, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#CCCCCC'
    });
    finalTime.setOrigin(0.5);

    const deaths1 = this.add.text(-100, -cardH / 2 + 165, `P1 死亡: ${this.player1.deaths}次`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#3498DB'
    });
    deaths1.setOrigin(0, 0.5);

    const deaths2 = this.add.text(100, -cardH / 2 + 165, `P2 死亡: ${this.player2.deaths}次`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#E74C3C'
    });
    deaths2.setOrigin(1, 0.5);

    const restartBtn = this.add.text(0, 20, '重新开始', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#FF6F00',
      fontStyle: 'bold'
    });
    restartBtn.setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerover', () => {
      restartBtn.setColor('#FF9800');
      restartBtn.setScale(1.05);
    });
    restartBtn.on('pointerout', () => {
      restartBtn.setColor('#FF6F00');
      restartBtn.setScale(1);
    });
    restartBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: restartBtn,
        scale: 0.9,
        duration: 100,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: restartBtn,
            scale: 1,
            duration: 100,
            ease: 'Cubic.easeIn',
            onComplete: () => this.scene.restart()
          });
        }
      });
    });

    const menuBtn = this.add.text(0, 70, '返回主菜单', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#757575'
    });
    menuBtn.setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerover', () => {
      menuBtn.setColor('#FFFFFF');
      menuBtn.setScale(1.05);
    });
    menuBtn.on('pointerout', () => {
      menuBtn.setColor('#757575');
      menuBtn.setScale(1);
    });
    menuBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: menuBtn,
        scale: 0.9,
        duration: 100,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: menuBtn,
            scale: 1,
            duration: 100,
            ease: 'Cubic.easeIn',
            onComplete: () => this.scene.start('MenuScene')
          });
        }
      });
    });

    this.gameOverPanel.add([shadow, bg, title, finalScore, finalTime, deaths1, deaths2, restartBtn, menuBtn]);

    this.tweens.add({
      targets: this.gameOverPanel,
      y: this.cameras.main.height / 2,
      duration: 500,
      ease: 'Cubic.easeOut'
    });
  }
}
