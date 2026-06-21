import Phaser from 'phaser';
import { GlobalSettings } from '../main';
import { LightManager, Wall, LightSource } from '../utils/LightManager';
import { Player } from '../entities/Player';
import { Guard, GuardState } from '../entities/Guard';
import { v4 as uuidv4 } from 'uuid';

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class GameScene extends Phaser.Scene {
  private lightManager!: LightManager;
  private player!: Player;
  private guards: Guard[] = [];
  private walls: Wall[] = [];
  private rooms: Room[] = [];
  private mapGraphics: Phaser.GameObjects.Graphics | null = null;
  private lightGraphics: Phaser.GameObjects.Graphics | null = null;
  private uiGraphics: Phaser.GameObjects.Graphics | null = null;
  private uiText: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;
  private targetZone: { x: number; y: number; width: number; height: number } | null = null;
  private gameStartTime: number = 0;
  private gameCompleted: boolean = false;
  private worldWidth: number = 2560;
  private worldHeight: number = 1440;
  private fadeGraphics: Phaser.GameObjects.Graphics | null = null;
  private completionTime: number = 0;
  private dustZones: Phaser.Geom.Rectangle[] = [];
  private wallPhysicsGroup: Phaser.Physics.Arcade.StaticGroup | null = null;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

    this.initGraphics();
    this.generateLevel();
    this.initLightManager();
    this.initPlayer();
    this.initGuards();
    this.initUI();
    this.setupCamera();
    this.setupEventListeners();

    this.gameStartTime = this.time.now;
    this.gameCompleted = false;
  }

  private initGraphics(): void {
    this.mapGraphics = this.add.graphics();
    this.lightGraphics = this.add.graphics();
    this.uiGraphics = this.add.graphics();
    this.fadeGraphics = this.add.graphics();

    this.fadeGraphics.setScrollFactor(0);
    this.fadeGraphics.setDepth(100);
    this.uiGraphics.setScrollFactor(0);
    this.uiGraphics.setDepth(50);
  }

  private generateLevel(): void {
    this.walls = [];
    this.rooms = [];
    this.dustZones = [];

    const numRooms = 5 + Math.floor(Math.random() * 3);
    const roomMargin = 100;

    for (let i = 0; i < numRooms; i++) {
      const room = this.generateRoom(i, numRooms);
      this.rooms.push(room);
    }

    this.generateCorridors();
    this.generateDustZones();
    this.generateTargetZone();
    this.createPhysicsWalls();
    this.renderMap();
  }

  private generateRoom(index: number, total: number): Room {
    const minWidth = 250;
    const maxWidth = 450;
    const minHeight = 200;
    const maxHeight = 350;

    const width = minWidth + Math.random() * (maxWidth - minWidth);
    const height = minHeight + Math.random() * (maxHeight - minHeight);

    const xSpacing = (this.worldWidth - 200) / total;
    const x = 100 + index * xSpacing + (xSpacing - width) / 2 + (Math.random() - 0.5) * 60;
    const y = 100 + Math.random() * (this.worldHeight - height - 200);

    const room: Room = {
      x: Math.max(60, Math.floor(x)),
      y: Math.max(60, Math.floor(y)),
      width: Math.floor(width),
      height: Math.floor(height)
    };

    const wallThickness = 16;

    this.walls.push({
      x: room.x - wallThickness,
      y: room.y - wallThickness,
      width: room.width + wallThickness * 2,
      height: wallThickness
    });

    this.walls.push({
      x: room.x - wallThickness,
      y: room.y + room.height,
      width: room.width + wallThickness * 2,
      height: wallThickness
    });

    this.walls.push({
      x: room.x - wallThickness,
      y: room.y,
      width: wallThickness,
      height: room.height
    });

    this.walls.push({
      x: room.x + room.width,
      y: room.y,
      width: wallThickness,
      height: room.height
    });

    return room;
  }

  private generateCorridors(): void {
    for (let i = 0; i < this.rooms.length - 1; i++) {
      const roomA = this.rooms[i];
      const roomB = this.rooms[i + 1];

      const startX = roomA.x + roomA.width;
      const startY = roomA.y + roomA.height / 2;
      const endX = roomB.x;
      const endY = roomB.y + roomB.height / 2;

      const corridorWidth = 80;
      const midX = (startX + endX) / 2;

      const wallThickness = 16;

      this.walls.push({
        x: startX - wallThickness,
        y: startY - corridorWidth / 2 - wallThickness,
        width: midX - startX + wallThickness,
        height: wallThickness
      });

      this.walls.push({
        x: startX - wallThickness,
        y: startY + corridorWidth / 2,
        width: midX - startX + wallThickness,
        height: wallThickness
      });

      this.walls.push({
        x: midX - wallThickness,
        y: Math.min(startY, endY) - corridorWidth / 2 - wallThickness,
        width: wallThickness,
        height: Math.abs(endY - startY) + corridorWidth + wallThickness * 2
      });

      this.walls.push({
        x: midX + corridorWidth / 2,
        y: Math.min(startY, endY) - corridorWidth / 2 - wallThickness,
        width: wallThickness,
        height: Math.abs(endY - startY) + corridorWidth + wallThickness * 2
      });

      this.walls.push({
        x: midX - wallThickness,
        y: endY - corridorWidth / 2 - wallThickness,
        width: endX - midX + wallThickness,
        height: wallThickness
      });

      this.walls.push({
        x: midX - wallThickness,
        y: endY + corridorWidth / 2,
        width: endX - midX + wallThickness,
        height: wallThickness
      });
    }
  }

  private generateDustZones(): void {
    for (const room of this.rooms) {
      if (Math.random() > 0.3) {
        const dustX = room.x + 40 + Math.random() * (room.width - 100);
        const dustY = room.y + 40 + Math.random() * (room.height - 100);
        const dustW = 60 + Math.random() * 100;
        const dustH = 60 + Math.random() * 100;
        this.dustZones.push(new Phaser.Geom.Rectangle(dustX, dustY, dustW, dustH));
      }
    }
  }

  private generateTargetZone(): void {
    const lastRoom = this.rooms[this.rooms.length - 1];
    this.targetZone = {
      x: lastRoom.x + lastRoom.width / 2 - 40,
      y: lastRoom.y + lastRoom.height / 2 - 40,
      width: 80,
      height: 80
    };
  }

  private createPhysicsWalls(): void {
    this.wallPhysicsGroup = this.physics.add.staticGroup();

    for (const wall of this.walls) {
      const rect = this.add.rectangle(
        wall.x + wall.width / 2,
        wall.y + wall.height / 2,
        wall.width,
        wall.height
      );
      rect.setVisible(false);
      this.wallPhysicsGroup.add(rect);
    }
  }

  private initLightManager(): void {
    this.lightManager = new LightManager(this, this.worldWidth, this.worldHeight);
    this.lightManager.setWalls(this.walls);

    for (let i = 0; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      const numLights = 1 + Math.floor(Math.random() * 3);

      for (let j = 0; j < numLights; j++) {
        const lightType = Math.random() > 0.5 ? 'point' : 'cone';
        const isWarm = Math.random() > 0.4;
        const color = isWarm ? 0xffd47a : 0xd0e8ff;
        const oscillate = Math.random() > 0.5;

        const lx = room.x + 50 + Math.random() * (room.width - 100);
        const ly = room.y + 50 + Math.random() * (room.height - 100);

        const light: LightSource = {
          id: uuidv4(),
          x: lx,
          y: ly,
          radius: 150 + Math.random() * 100,
          color: color,
          intensity: 0.7 + Math.random() * 0.3,
          type: lightType as 'point' | 'cone',
          angle: lightType === 'cone' ? Math.random() * Math.PI * 2 : undefined,
          coneAngle: lightType === 'cone' ? Math.PI / 2 + Math.random() * Math.PI / 3 : undefined,
          oscillate: oscillate,
          oscSpeed: oscillate ? 0.5 + Math.random() * 1.5 : undefined,
          oscPhase: Math.random() * Math.PI * 2,
          oscRange: lightType === 'cone' ? Math.PI / 4 : undefined
        };

        this.lightManager.addLight(light);
      }
    }
  }

  private initPlayer(): void {
    const firstRoom = this.rooms[0];
    const startX = firstRoom.x + firstRoom.width / 2;
    const startY = firstRoom.y + firstRoom.height / 2;

    this.player = new Player(this, startX, startY, this.lightManager);

    if (this.wallPhysicsGroup) {
      this.physics.add.collider(this.player, this.wallPhysicsGroup);
    }
  }

  private initGuards(): void {
    this.guards = [];

    for (let i = 1; i < this.rooms.length; i++) {
      const room = this.rooms[i];
      const numGuards = i === this.rooms.length - 1 ? 2 : 1;

      for (let j = 0; j < numGuards; j++) {
        const patrolPoints = this.generatePatrolPoints(room);

        const guard = new Guard(
          this,
          patrolPoints[0].x,
          patrolPoints[0].y,
          this.lightManager,
          this.walls,
          patrolPoints
        );

        guard.setPlayer(this.player);
        this.guards.push(guard);

        if (this.wallPhysicsGroup) {
          this.physics.add.collider(guard, this.wallPhysicsGroup);
        }
      }
    }
  }

  private generatePatrolPoints(room: Room): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const margin = 60;

    const numPoints = 2 + Math.floor(Math.random() * 2);

    for (let i = 0; i < numPoints; i++) {
      points.push({
        x: room.x + margin + Math.random() * (room.width - margin * 2),
        y: room.y + margin + Math.random() * (room.height - margin * 2)
      });
    }

    return points;
  }

  private initUI(): void {
    this.uiText = this.add.text(20, 20, '', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#88ff88'
    });
    this.uiText.setScrollFactor(0);
    this.uiText.setDepth(51);

    this.statusText = this.add.text(0, 0, '潜行', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#88ff88',
      align: 'right'
    });
    this.statusText.setScrollFactor(0);
    this.statusText.setDepth(51);
    this.statusText.setOrigin(1, 0);

    this.timerText = this.add.text(20, 50, '', {
      fontFamily: 'Courier New',
      fontSize: '14px',
      color: '#aaaaaa'
    });
    this.timerText.setScrollFactor(0);
    this.timerText.setDepth(51);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBackgroundColor('#0a0a12');
  }

  private setupEventListeners(): void {
    this.events.on('noiseThrown', (x: number, y: number) => {
      for (const guard of this.guards) {
        guard.investigateNoise(x, y, GlobalSettings.NOISE_DURATION);
      }
    });

    this.events.on('playerAlerted', (x: number, y: number) => {
      for (const guard of this.guards) {
        const dist = Phaser.Math.Distance.Between(
          guard.x, guard.y, x, y
        );
        if (dist < 400) {
          guard.investigateNoise(x, y, 3000);
        }
      }
    });
  }

  update(time: number, delta: number): void {
    if (this.gameCompleted) return;

    this.player.update(delta, time);

    for (const guard of this.guards) {
      guard.update(delta, time);
    }

    this.lightManager.updateLights(delta);

    this.renderLights();
    this.updateUI();
    this.checkGoal();
  }

  private renderLights(): void {
    if (!this.lightGraphics) return;

    this.lightGraphics.clear();
    this.lightManager.renderLights(this.lightGraphics);
    this.lightGraphics.setBlendMode(Phaser.BlendModes.ADD);
  }

  private renderMap(): void {
    if (!this.mapGraphics) return;

    this.mapGraphics.clear();

    this.mapGraphics.fillStyle(0x12121a);
    this.mapGraphics.fillRect(0, 0, this.worldWidth, this.worldHeight);

    for (const dust of this.dustZones) {
      this.mapGraphics.fillStyle(0x1a1a25, 1);
      this.mapGraphics.fillRect(dust.x, dust.y, dust.width, dust.height);
    }

    for (const wall of this.walls) {
      this.mapGraphics.fillStyle(0x2a2a3a, 1);
      this.mapGraphics.fillRect(wall.x, wall.y, wall.width, wall.height);

      this.mapGraphics.lineStyle(1, 0x3a3a4a, 1);
      this.mapGraphics.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }

    this.mapGraphics.lineStyle(2, 0x444455, 1);
    this.mapGraphics.strokeRect(2, 2, this.worldWidth - 4, this.worldHeight - 4);

    if (this.targetZone) {
      this.mapGraphics.save();
      this.mapGraphics.fillStyle(0x00ff88, 0.15);
      this.mapGraphics.fillRect(
        this.targetZone.x,
        this.targetZone.y,
        this.targetZone.width,
        this.targetZone.height
      );
      this.mapGraphics.lineStyle(2, 0x00ff88, 0.6);
      this.mapGraphics.strokeRect(
        this.targetZone.x,
        this.targetZone.y,
        this.targetZone.width,
        this.targetZone.height
      );
      this.mapGraphics.restore();

      this.mapGraphics.save();
      this.mapGraphics.fillStyle(0x00ff88, 0.8);
      this.mapGraphics.fillCircle(
        this.targetZone.x + this.targetZone.width / 2,
        this.targetZone.y + this.targetZone.height / 2,
        15
      );
      this.mapGraphics.restore();
    }
  }

  private updateUI(): void {
    if (!this.uiGraphics || !this.uiText || !this.statusText || !this.timerText) return;

    const elapsed = (this.time.now - this.gameStartTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    this.timerText.setText(`时间: ${minutes}:${seconds.toString().padStart(2, '0')}`);

    const maxAlert = Math.max(
      ...this.guards.map(g => g.getAlertLevel()),
      0
    );

    const alertRatio = maxAlert / 100;

    const barWidth = 200;
    const barHeight = 12;
    const barX = this.cameras.main.width - barWidth - 20;
    const barY = 20;

    this.uiGraphics.clear();

    this.uiGraphics.save();
    this.uiGraphics.fillStyle(0x222222, 0.8);
    this.uiGraphics.fillRect(barX, barY, barWidth, barHeight);
    this.uiGraphics.restore();

    if (alertRatio > 0) {
      const gradientSteps = 20;
      for (let i = 0; i < gradientSteps; i++) {
        const ratio = (i / gradientSteps) * alertRatio;
        const x = barX + barWidth * ratio;
        const w = barWidth * (alertRatio / gradientSteps) + 1;

        const r = Math.floor(255 * ratio);
        const g = Math.floor(255 * (1 - ratio));
        const b = 0;

        this.uiGraphics.save();
        this.uiGraphics.fillStyle(
          Phaser.Display.Color.GetColor(r, g, b),
          0.9
        );
        this.uiGraphics.fillRect(x, barY, w, barHeight);
        this.uiGraphics.restore();
      }
    }

    this.uiGraphics.lineStyle(1, 0x666666, 0.8);
    this.uiGraphics.strokeRect(barX, barY, barWidth, barHeight);

    let status = '潜行';
    let statusColor = '#88ff88';
    const maxState = this.getMaxGuardState();

    if (this.player.getIsAlerted()) {
      status = '警报';
      statusColor = '#ff4444';
    } else if (maxState === GuardState.CHASING) {
      status = '追捕';
      statusColor = '#ff2222';
    } else if (maxState === GuardState.SUSPICIOUS || maxState === GuardState.INVESTIGATING) {
      status = '警觉';
      statusColor = '#ffaa00';
    }

    this.statusText.setText(status);
    this.statusText.setColor(statusColor);
    this.statusText.setPosition(this.cameras.main.width - 20, 40);

    this.uiText.setText(`诱饵: ${3 - this.player.getNoiseDecoys().length}/3`);
  }

  private getMaxGuardState(): GuardState {
    const statePriority: { [key in GuardState]: number } = {
      [GuardState.PATROLLING]: 0,
      [GuardState.RETURNING]: 1,
      [GuardState.INVESTIGATING]: 2,
      [GuardState.SUSPICIOUS]: 3,
      [GuardState.CHASING]: 4
    };

    let maxState = GuardState.PATROLLING;
    let maxPriority = 0;

    for (const guard of this.guards) {
      const state = guard.getState();
      const priority = statePriority[state];
      if (priority > maxPriority) {
        maxPriority = priority;
        maxState = state;
      }
    }

    return maxState;
  }

  private checkGoal(): void {
    if (!this.targetZone || this.gameCompleted) return;

    const playerRect = new Phaser.Geom.Rectangle(
      this.player.x - 10,
      this.player.y - 10,
      20,
      20
    );

    const targetRect = new Phaser.Geom.Rectangle(
      this.targetZone.x,
      this.targetZone.y,
      this.targetZone.width,
      this.targetZone.height
    );

    if (Phaser.Geom.Intersects.RectangleToRectangle(playerRect, targetRect)) {
      this.completeMission();
    }
  }

  private completeMission(): void {
    this.gameCompleted = true;
    this.completionTime = (this.time.now - this.gameStartTime) / 1000;

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2000,
      onUpdate: (tween) => {
        const value = tween.getValue();
        this.renderVignette(value !== null ? value : 0);
      },
      onComplete: () => {
        this.showCompletionScreen();
      }
    });
  }

  private renderVignette(progress: number): void {
    if (!this.fadeGraphics) return;

    this.fadeGraphics.clear();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const maxRadius = Math.sqrt(w * w + h * h) / 2;
    const radius = maxRadius * (1 - progress);

    const cx = w / 2;
    const cy = h / 2;

    this.fadeGraphics.save();

    this.fadeGraphics.fillStyle(0x000000, 1);
    this.fadeGraphics.fillRect(0, 0, w, h);

    this.fadeGraphics.setBlendMode(Phaser.BlendModes.ERASE);

    for (let i = 0; i < 10; i++) {
      const r = radius * (1 - i * 0.03);
      const alpha = 0.1 + i * 0.08;
      this.fadeGraphics.fillStyle(0x000000, alpha);
      this.fadeGraphics.fillCircle(cx, cy, r);
    }

    this.fadeGraphics.restore();
  }

  private showCompletionScreen(): void {
    const minutes = Math.floor(this.completionTime / 60);
    const seconds = Math.floor(this.completionTime % 60);

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const completeText = this.add.text(
      centerX,
      centerY - 40,
      '任务完成',
      {
        fontFamily: 'Courier New',
        fontSize: '48px',
        color: '#00ff88',
        align: 'center'
      }
    );
    completeText.setScrollFactor(0);
    completeText.setDepth(101);
    completeText.setOrigin(0.5);

    const timeText = this.add.text(
      centerX,
      centerY + 20,
      `用时: ${minutes}:${seconds.toString().padStart(2, '0')}`,
      {
        fontFamily: 'Courier New',
        fontSize: '24px',
        color: '#88ffaa',
        align: 'center'
      }
    );
    timeText.setScrollFactor(0);
    timeText.setDepth(101);
    timeText.setOrigin(0.5);

    const hintText = this.add.text(
      centerX,
      centerY + 80,
      '按 R 重新开始',
      {
        fontFamily: 'Courier New',
        fontSize: '18px',
        color: '#666666',
        align: 'center'
      }
    );
    hintText.setScrollFactor(0);
    hintText.setDepth(101);
    hintText.setOrigin(0.5);

    this.input.keyboard!.on('keydown-R', () => {
      this.scene.restart();
    });
  }
}

export default GameScene;
