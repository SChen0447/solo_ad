import Phaser from 'phaser';
import { BulletModule, type BulletConfig } from '../modules/BulletModule';
import { PlayerModule, type KeyBinding } from '../modules/PlayerModule';
import { RecorderModule, type TrackPoint, type CollisionEvent } from '../modules/RecorderModule';
import { ControlPanel } from '../ui/ControlPanel';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const defaultKeyBinding: KeyBinding = {
  up: 'w',
  down: 's',
  left: 'a',
  right: 'd',
  action: 'Space'
};

export class BulletScene extends Phaser.Scene {
  private bulletModule!: BulletModule;
  private playerModule!: PlayerModule;
  private recorderModule!: RecorderModule;
  private controlPanel!: ControlPanel;
  
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private replayGraphics!: Phaser.GameObjects.Graphics;
  
  private flashTimer: number = 0;
  private fpsText!: Phaser.GameObjects.Text;
  private lastFpsUpdate: number = 0;
  private frameCount: number = 0;
  private currentFps: number = 0;

  constructor() {
    super({ key: 'BulletScene' });
  }

  create(): void {
    this.createBackground();
    this.createOverlay();
    this.createReplayGraphics();
    
    this.bulletModule = new BulletModule(this);
    this.playerModule = new PlayerModule(this, defaultKeyBinding);
    this.recorderModule = new RecorderModule();
    
    const leftPanel = document.getElementById('left-panel')!;
    const rightPanel = document.getElementById('right-panel')!;
    
    this.controlPanel = new ControlPanel(
      leftPanel,
      rightPanel,
      {
        onPatternChange: (config: Partial<BulletConfig>) => {
          this.bulletModule.setPattern(config);
        },
        onKeyBindingChange: (binding: KeyBinding) => {
          this.playerModule.setKeyBinding(binding);
        },
        onReplaySpeedChange: (speed: number) => {
          this.recorderModule.setReplaySpeed(speed);
        },
        onStartReplay: () => {
          this.startReplay();
        },
        onStopReplay: () => {
          this.recorderModule.stopReplay();
        }
      },
      defaultKeyBinding,
      this.bulletModule.getCurrentConfig()
    );

    this.createFpsCounter();
    this.setupResponsiveCanvas();
  }

  private createBackground(): void {
    this.bgGraphics = this.add.graphics();
    
    this.bgGraphics.fillGradientStyle(0x1a1a2e, 0x16213e, 0x16213e, 0x1a1a2e, 1);
    this.bgGraphics.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    this.bgGraphics.lineStyle(1, 0xffffff, 0.1);
    const gridSize = 40;
    
    for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
      this.bgGraphics.beginPath();
      this.bgGraphics.moveTo(x, 0);
      this.bgGraphics.lineTo(x, CANVAS_HEIGHT);
      this.bgGraphics.strokePath();
    }
    
    for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
      this.bgGraphics.beginPath();
      this.bgGraphics.moveTo(0, y);
      this.bgGraphics.lineTo(CANVAS_WIDTH, y);
      this.bgGraphics.strokePath();
    }

    const centerGlow = this.add.graphics();
    centerGlow.fillStyle(0x00d2ff, 0.05);
    centerGlow.beginPath();
    centerGlow.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 200, 0, Math.PI * 2);
    centerGlow.fillPath();
  }

  private createOverlay(): void {
    this.overlayGraphics = this.add.graphics();
    this.overlayGraphics.setDepth(100);
  }

  private createReplayGraphics(): void {
    this.replayGraphics = this.add.graphics();
    this.replayGraphics.setDepth(50);
  }

  private createFpsCounter(): void {
    this.fpsText = this.add.text(10, 10, 'FPS: 60', {
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: '12px',
      color: '#00d2ff'
    });
    this.fpsText.setDepth(200);
  }

  private setupResponsiveCanvas(): void {
    const updateCanvasScale = () => {
      const canvasWrapper = document.getElementById('canvas-wrapper');
      const canvas = this.game.canvas;
      
      if (window.innerWidth > 900) {
        canvas.style.width = '800px';
        canvas.style.height = '600px';
      } else {
        const targetWidth = window.innerWidth * 0.9;
        const scale = targetWidth / CANVAS_WIDTH;
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
      }
    };

    updateCanvasScale();
    window.addEventListener('resize', updateCanvasScale);
  }

  private startReplay(): void {
    if (!this.recorderModule.hasRecording()) return;
    this.playerModule.setPosition(400, 500);
    this.recorderModule.replay();
  }

  update(deltaTimeMs: number): void {
    const deltaTime = deltaTimeMs / 1000;
    
    this.frameCount++;
    this.lastFpsUpdate += deltaTime;
    if (this.lastFpsUpdate >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.lastFpsUpdate);
      this.fpsText.setText(`FPS: ${this.currentFps}`);
      this.frameCount = 0;
      this.lastFpsUpdate = 0;
    }

    if (this.playerModule.isActionKeyJustDown() && !this.recorderModule.isReplaying()) {
      if (this.recorderModule.isRecording()) {
        this.recorderModule.stopRecord();
      } else {
        this.recorderModule.startRecord();
      }
    }

    const isReplaying = this.recorderModule.isReplaying();
    let playerX: number;
    let playerY: number;

    if (isReplaying) {
      const trackPoint = this.recorderModule.getCurrentTrackPoint();
      if (trackPoint) {
        this.playerModule.setPosition(trackPoint.x, trackPoint.y);
        playerX = trackPoint.x;
        playerY = trackPoint.y;
      } else {
        playerX = this.playerModule.position.x;
        playerY = this.playerModule.position.y;
      }
      this.renderReplay();
    } else {
      this.playerModule.update(deltaTime);
      playerX = this.playerModule.position.x;
      playerY = this.playerModule.position.y;
    }

    this.bulletModule.update(deltaTime, playerX, playerY);

    let isColliding = false;
    if (!this.playerModule.isInvulnerable() && !isReplaying) {
      const hitBullet = this.bulletModule.checkCollision(playerX, playerY, this.playerModule.radius);
      if (hitBullet && hitBullet.color === '#ff4444') {
        isColliding = true;
        this.playerModule.incrementCollision();
        this.playerModule.triggerExplosion(playerX, playerY);
        this.flashTimer = 0.1;
      }
    }

    this.recorderModule.update(deltaTime, playerX, playerY, isColliding);

    if (this.flashTimer > 0) {
      this.flashTimer -= deltaTime;
      this.overlayGraphics.clear();
      this.overlayGraphics.fillStyle(0xff0000, Math.min(this.flashTimer * 10, 0.5));
      this.overlayGraphics.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (this.overlayGraphics) {
      this.overlayGraphics.clear();
    }

    if (!isReplaying) {
      this.replayGraphics.clear();
    }

    this.controlPanel.updateInfo(
      this.playerModule.survivalTime,
      this.playerModule.collisionCount,
      this.recorderModule.isRecording(),
      this.recorderModule.getRecordDuration(),
      this.recorderModule.isReplaying(),
      this.recorderModule.getReplayProgress(),
      this.recorderModule.hasRecording()
    );
  }

  private renderReplay(): void {
    this.replayGraphics.clear();
    
    const track = this.recorderModule.getFullTrack();
    const collisions = this.recorderModule.getFullCollisions();
    const progress = this.recorderModule.getReplayProgress();
    const currentIndex = Math.floor(track.length * progress);

    if (track.length > 1) {
      for (let i = 1; i <= currentIndex && i < track.length; i++) {
        const alpha = i / track.length;
        const lineAlpha = 0.3 + alpha * 0.5;
        
        this.replayGraphics.lineStyle(2, 0x4488ff, lineAlpha);
        this.replayGraphics.beginPath();
        this.replayGraphics.moveTo(track[i - 1].x, track[i - 1].y);
        this.replayGraphics.lineTo(track[i].x, track[i].y);
        this.replayGraphics.strokePath();
      }
    }

    for (const collision of collisions) {
      const collisionProgress = collision.timestamp / this.recorderModule.getReplayDuration();
      if (collisionProgress <= progress) {
        this.replayGraphics.lineStyle(2, 0xff4444, 0.8);
        const size = 8;
        this.replayGraphics.beginPath();
        this.replayGraphics.moveTo(collision.x - size, collision.y - size);
        this.replayGraphics.lineTo(collision.x + size, collision.y + size);
        this.replayGraphics.moveTo(collision.x + size, collision.y - size);
        this.replayGraphics.lineTo(collision.x - size, collision.y + size);
        this.replayGraphics.strokePath();
      }
    }
  }

  destroy(): void {
    this.bulletModule?.destroy();
    this.playerModule?.destroy();
    this.controlPanel?.destroy();
    this.bgGraphics?.destroy();
    this.overlayGraphics?.destroy();
    this.replayGraphics?.destroy();
  }
}
