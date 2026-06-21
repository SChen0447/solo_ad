import Phaser from 'phaser';
import { TileType, LevelData, GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, GRAVITY, JUMP_FORCE, MOVE_SPEED, PLAYER_RADIUS } from '../types';

export class TestScene extends Phaser.Scene {
  private levelData!: LevelData;
  private player!: Phaser.Physics.Arcade.Sprite;
  private groundTiles!: Phaser.Physics.Arcade.StaticGroup;
  private platformTiles!: Phaser.Physics.Arcade.StaticGroup;
  private trapTiles: Phaser.GameObjects.Rectangle[] = [];
  private checkpointTiles: { x: number; y: number; activated: boolean; obj: Phaser.GameObjects.Arc }[] = [];
  private startPosition!: { x: number; y: number };
  private lastCheckpoint!: { x: number; y: number };
  private isGravityControl: boolean = true;
  private gravitySensitivity: number = 0.5;
  private deviceOrientation: { gamma: number; beta: number } = { gamma: 0, beta: 0 };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapPlayer!: Phaser.GameObjects.Arc;
  private controlModeText!: Phaser.GameObjects.Text;
  private transitionText!: Phaser.GameObjects.Text;
  private dustParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private isJumping: boolean = false;
  private wasOnGround: boolean = false;
  private playerTextureKey: string = 'playerCircle';
  private worldStartX: number = 20;
  private worldStartY: number = 20;
  private trapPulseValue: number = 0;
  private checkpointPulseValue: number = 0;

  constructor() {
    super('TestScene');
  }

  init(data: { levelData: LevelData }): void {
    this.levelData = data.levelData;
  }

  preload(): void {
  }

  create(): void {
    this.physics.world.gravity.y = GRAVITY;
    
    this.groundTiles = this.physics.add.staticGroup();
    this.platformTiles = this.physics.add.staticGroup();
    
    this.createPlayerTexture();
    this.loadLevel();
    this.createPlayer();
    this.setupInput();
    this.setupDeviceOrientation();
    this.createMinimap();
    this.createUI();
    this.createDustParticles();
    this.createPulseAnimations();
    
    this.physics.add.collider(this.player, this.groundTiles);
    this.physics.add.collider(this.player, this.platformTiles);
  }

  private createPlayerTexture(): void {
    const graphics = this.make.graphics();
    const center = PLAYER_RADIUS;
    const size = PLAYER_RADIUS * 2;
    
    for (let i = 0; i <= 360; i += 10) {
      const rad = Phaser.Math.DegToRad(i);
      const x = center + Math.cos(rad) * PLAYER_RADIUS;
      const y = center + Math.sin(rad) * PLAYER_RADIUS;
      const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2);
      const t = dist / PLAYER_RADIUS;
      const r = Phaser.Math.Linear(255, 255, 1 - t);
      const g = Phaser.Math.Linear(140, 255, 1 - t);
      const b = Phaser.Math.Linear(0, 0, 1 - t);
      graphics.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      graphics.fillCircle(x, y, 2);
    }
    
    graphics.generateTexture(this.playerTextureKey, size, size);
  }

  private loadLevel(): void {
    const tiles = this.levelData.tiles;
    let foundStart = false;
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = tiles[y][x];
        const px = this.worldStartX + x * TILE_SIZE + TILE_SIZE / 2;
        const py = this.worldStartY + y * TILE_SIZE + TILE_SIZE / 2;
        
        if (!foundStart && (tile.type === TileType.GROUND || tile.type === TileType.PLATFORM)) {
          this.startPosition = {
            x: this.worldStartX + x * TILE_SIZE + TILE_SIZE / 2,
            y: this.worldStartY + y * TILE_SIZE - PLAYER_RADIUS - 5
          };
          this.lastCheckpoint = { ...this.startPosition };
          foundStart = true;
        }
        
        switch (tile.type) {
          case TileType.GROUND:
            this.createGroundTile(px, py);
            break;
          case TileType.PLATFORM:
            this.createPlatformTile(px, py);
            break;
          case TileType.TRAP:
            this.createTrapTile(px, py);
            break;
          case TileType.CHECKPOINT:
            this.createCheckpointTile(px, py, x, y);
            break;
        }
      }
    }
    
    if (!foundStart) {
      this.startPosition = {
        x: this.worldStartX + TILE_SIZE / 2,
        y: this.worldStartY + TILE_SIZE / 2
      };
      this.lastCheckpoint = { ...this.startPosition };
    }
  }

  private createGroundTile(px: number, py: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x8B4513, 1);
    graphics.fillRect(px - TILE_SIZE / 2 + 1, py - TILE_SIZE / 2 + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    graphics.lineStyle(2, 0xCD853F, 0.6);
    for (let i = 0; i < 6; i++) {
      const offset = i * 10 - 20;
      graphics.beginPath();
      graphics.moveTo(px - TILE_SIZE / 2 + offset, py + TILE_SIZE / 2);
      graphics.lineTo(px - TILE_SIZE / 2 + offset + 20, py - TILE_SIZE / 2);
      graphics.strokePath();
    }
    
    const tile = this.physics.add.staticSprite(px, py, '');
    tile.setDisplaySize(TILE_SIZE - 2, TILE_SIZE - 2);
    tile.setSize(TILE_SIZE - 2, TILE_SIZE - 2);
    tile.visible = false;
    this.groundTiles.push(this.physics.add.staticGroup([tile]));
  }

  private createPlatformTile(px: number, py: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x87CEEB, 0.8);
    graphics.fillRect(px - TILE_SIZE / 2 + 2, py - 5, TILE_SIZE - 4, 10);
    graphics.lineStyle(1, 0xADD8E6, 1);
    graphics.strokeRect(px - TILE_SIZE / 2 + 2, py - 5, TILE_SIZE - 4, 10);
    
    const tile = this.physics.add.staticSprite(px, py - 5, '');
    tile.setDisplaySize(TILE_SIZE - 4, 10);
    tile.setSize(TILE_SIZE - 4, 10);
    tile.visible = false;
    this.platformTiles.push(this.physics.add.staticGroup([tile]));
  }

  private createTrapTile(px: number, py: number): void {
    const rect = this.add.rectangle(px, py, TILE_SIZE - 8, TILE_SIZE - 8);
    rect.setStrokeStyle(3, 0xff0000, 0.8);
    this.trapTiles.push(rect);
  }

  private createCheckpointTile(px: number, py: number, gridX: number, gridY: number): void {
    const circle = this.add.circle(px, py, 12, 0x00ff00, 0.6);
    this.checkpointTiles.push({
      x: gridX,
      y: gridY,
      activated: false,
      obj: circle
    });
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(this.startPosition.x, this.startPosition.y, this.playerTextureKey);
    this.player.setCircle(PLAYER_RADIUS);
    this.player.setBounce(0);
    this.player.setCollideWorldBounds(false);
    this.player.setFriction(0.1, 0);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    this.input.on('pointerdown', () => {
      this.tryJump();
    });
  }

  private setupDeviceOrientation(): void {
    const handler = (event: DeviceOrientationEvent) => {
      if (event.gamma !== null) {
        this.deviceOrientation.gamma = event.gamma;
      }
      if (event.beta !== null) {
        this.deviceOrientation.beta = event.beta;
      }
    };
    
    window.addEventListener('deviceorientation', handler, true);
    
    this.events.once('shutdown', () => {
      window.removeEventListener('deviceorientation', handler);
    });
  }

  private createMinimap(): void {
    const minimapX = 650;
    const minimapY = 30;
    const minimapScale = 0.12;
    
    this.minimapGraphics = this.add.graphics();
    
    const bg = this.add.rectangle(
      minimapX + (GRID_WIDTH * TILE_SIZE * minimapScale) / 2,
      minimapY + (GRID_HEIGHT * TILE_SIZE * minimapScale) / 2,
      GRID_WIDTH * TILE_SIZE * minimapScale + 4,
      GRID_HEIGHT * TILE_SIZE * minimapScale + 4,
      0x1a1a2a,
      0.9
    );
    bg.setStrokeStyle(1, 0x4fc3f7, 0.6);
    
    this.minimapPlayer = this.add.circle(minimapX, minimapY, 3, 0xff8800, 1);
    
    this.updateMinimap();
  }

  private updateMinimap(): void {
    const minimapX = 650;
    const minimapY = 30;
    const minimapScale = 0.12;
    
    this.minimapGraphics.clear();
    
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const tile = this.levelData.tiles[y][x];
        const px = minimapX + x * TILE_SIZE * minimapScale;
        const py = minimapY + y * TILE_SIZE * minimapScale;
        const size = TILE_SIZE * minimapScale;
        
        switch (tile.type) {
          case TileType.GROUND:
            this.minimapGraphics.fillStyle(0x888888, 1);
            this.minimapGraphics.fillRect(px, py, size, size);
            break;
          case TileType.PLATFORM:
            this.minimapGraphics.fillStyle(0x87CEEB, 0.8);
            this.minimapGraphics.fillRect(px, py + size * 0.3, size, size * 0.4);
            break;
          case TileType.TRAP:
            this.minimapGraphics.fillStyle(0xff0000, 0.8);
            this.minimapGraphics.fillRect(px + 1, py + 1, size - 2, size - 2);
            break;
          case TileType.CHECKPOINT:
            const cp = this.checkpointTiles.find(c => c.x === x && c.y === y);
            this.minimapGraphics.fillStyle(cp?.activated ? 0x00ff00 : 0x006600, 0.8);
            this.minimapGraphics.fillCircle(px + size / 2, py + size / 2, size / 3);
            break;
        }
      }
    }
    
    const playerMapX = minimapX + (this.player.x - this.worldStartX) * minimapScale;
    const playerMapY = minimapY + (this.player.y - this.worldStartY) * minimapScale;
    this.minimapPlayer.setPosition(playerMapX, playerMapY);
  }

  private createUI(): void {
    const toggleBtn = this.add.rectangle(650, 560, 100, 30, 0x4fc3f7, 0.8);
    toggleBtn.setInteractive({ useHandCursor: true });
    
    const toggleText = this.add.text(650, 560, '切换控制', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    toggleText.setOrigin(0.5);
    
    toggleBtn.on('pointerover', () => {
      this.tweens.add({
        targets: [toggleBtn, toggleText],
        scale: 1.1,
        duration: 200
      });
    });
    
    toggleBtn.on('pointerout', () => {
      this.tweens.add({
        targets: [toggleBtn, toggleText],
        scale: 1,
        duration: 200
      });
    });
    
    toggleBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: [toggleBtn, toggleText],
        scale: 0.95,
        duration: 100,
        yoyo: true
      });
      this.toggleControlMode();
    });
    
    this.controlModeText = this.add.text(650, 520, '控制模式: 重力感应', {
      fontSize: '11px',
      color: '#4fc3f7',
      fontFamily: 'Arial',
      align: 'center'
    });
    this.controlModeText.setOrigin(0.5);
    
    const backBtn = this.add.rectangle(70, 560, 80, 30, 0xe74c3c, 0.8);
    backBtn.setInteractive({ useHandCursor: true });
    
    const backText = this.add.text(70, 560, '← 返回', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Arial'
    });
    backText.setOrigin(0.5);
    
    backBtn.on('pointerover', () => {
      this.tweens.add({
        targets: [backBtn, backText],
        scale: 1.1,
        duration: 200
      });
    });
    
    backBtn.on('pointerout', () => {
      this.tweens.add({
        targets: [backBtn, backText],
        scale: 1,
        duration: 200
      });
    });
    
    backBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: [backBtn, backText],
        scale: 0.95,
        duration: 100,
        yoyo: true
      });
      this.scene.start('EditorScene');
    });
    
    this.transitionText = this.add.text(400, 300, '', {
      fontSize: '24px',
      color: '#4fc3f7',
      fontFamily: 'Arial',
      align: 'center'
    });
    this.transitionText.setOrigin(0.5);
    this.transitionText.setAlpha(0);
  }

  private createDustParticles(): void {
    this.dustParticles = this.add.particles(0, 0, undefined, {
      color: [0xaaaaaa, 0x888888, 0x666666],
      scale: { min: 1, max: 2 },
      lifespan: 300,
      speed: { min: 20, max: 50 },
      angle: { min: -80, max: -100 },
      alpha: { start: 0.6, end: 0 },
      gravityY: 100,
      quantity: 0
    });
  }

  private createPulseAnimations(): void {
    this.tweens.add({
      targets: this,
      trapPulseValue: 1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        this.trapTiles.forEach(trap => {
          const glow = 0.5 + this.trapPulseValue * 0.5;
          trap.setStrokeStyle(3, 0xff0000, glow);
        });
      }
    });
    
    this.tweens.add({
      targets: this,
      checkpointPulseValue: 1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        this.checkpointTiles.forEach(cp => {
          const glow = cp.activated ? (0.8 + this.checkpointPulseValue * 0.2) : (0.4 + this.checkpointPulseValue * 0.2);
          cp.obj.setFillStyle(cp.activated ? 0x00ff00 : 0x006600, glow);
        });
      }
    });
  }

  private toggleControlMode(): void {
    this.isGravityControl = !this.isGravityControl;
    
    const modeText = this.isGravityControl ? '重力感应' : '键盘控制';
    this.controlModeText.setText(`控制模式: ${modeText}`);
    
    this.transitionText.setText(`已切换到${modeText}`);
    this.transitionText.setAlpha(1);
    
    this.tweens.add({
      targets: this.transitionText,
      alpha: 0,
      duration: 500,
      delay: 500
    });
  }

  private handlePlatformCollision(): void {
  }

  private tryJump(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body.touching.down || body.blocked.down) {
      this.player.setVelocityY(JUMP_FORCE);
      this.isJumping = true;
      this.tweens.add({
        targets: this.player,
        scaleY: 1.4,
        scaleX: 0.7,
        duration: 150,
        yoyo: true
      });
    }
  }

  private checkTrapCollision(): boolean {
    const playerBounds = this.player.getBounds();
    
    for (const trap of this.trapTiles) {
      const trapBounds = trap.getBounds();
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, trapBounds)) {
        return true;
      }
    }
    return false;
  }

  private checkCheckpointCollision(): void {
    const playerGridX = Math.floor((this.player.x - this.worldStartX) / TILE_SIZE);
    const playerGridY = Math.floor((this.player.y - this.worldStartY) / TILE_SIZE);
    
    for (const cp of this.checkpointTiles) {
      if (!cp.activated && Math.abs(cp.x - playerGridX) <= 1 && Math.abs(cp.y - playerGridY) <= 1) {
        const cpWorldX = this.worldStartX + cp.x * TILE_SIZE + TILE_SIZE / 2;
        const cpWorldY = this.worldStartY + cp.y * TILE_SIZE + TILE_SIZE / 2;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, cpWorldX, cpWorldY);
        
        if (dist < 30) {
          cp.activated = true;
          this.lastCheckpoint = { x: cpWorldX, y: cpWorldY - PLAYER_RADIUS - 5 };
        }
      }
    }
  }

  private checkOutOfBounds(): boolean {
    return (
      this.player.x < -50 ||
      this.player.x > this.worldStartX + GRID_WIDTH * TILE_SIZE + 50 ||
      this.player.y > this.worldStartY + GRID_HEIGHT * TILE_SIZE + 50
    );
  }

  private respawnPlayer(): void {
    this.player.setAlpha(0.3);
    this.player.setTint(0xff0000);
    
    this.tweens.add({
      targets: this.player,
      alpha: 1,
      duration: 100,
      repeat: 3,
      onComplete: () => {
        this.player.clearTint();
        this.player.setPosition(this.lastCheckpoint.x, this.lastCheckpoint.y);
        this.player.setVelocity(0, 0);
      }
    });
  }

  private emitDustParticles(): void {
    this.dustParticles.setPosition(this.player.x, this.player.y + PLAYER_RADIUS);
    this.dustParticles.explode(8);
  }

  update(_time: number, delta: number): void {
    if (!this.player || !this.player.body) return;
    
    void delta;
    let moveX = 0;
    
    if (this.isGravityControl) {
      moveX = (this.deviceOrientation.gamma / 45) * this.gravitySensitivity * MOVE_SPEED;
    } else {
      if (this.keyA.isDown || this.cursors.left.isDown) {
        moveX = -MOVE_SPEED;
      } else if (this.keyD.isDown || this.cursors.right.isDown) {
        moveX = MOVE_SPEED;
      }
    }
    
    this.player.setVelocityX(moveX);
    
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.tryJump();
    }
    
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body.touching.down || body.blocked.down;
    
    if (!this.wasOnGround && onGround && this.isJumping) {
      this.isJumping = false;
      this.emitDustParticles();
      
      this.tweens.add({
        targets: this.player,
        scaleY: 0.8,
        scaleX: 1.2,
        duration: 100,
        yoyo: true
      });
    }
    
    this.wasOnGround = onGround;
    
    if (this.checkTrapCollision() || this.checkOutOfBounds()) {
      this.respawnPlayer();
    }
    
    this.checkCheckpointCollision();
    this.updateMinimap();
  }
}
