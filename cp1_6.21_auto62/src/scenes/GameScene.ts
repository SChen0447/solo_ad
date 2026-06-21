import Phaser from 'phaser';
import { generateDungeon, Room, Corridor, BSPResult } from '../utils/BSPGenerator';

const TILE_SIZE = 32;
const GRID_WIDTH = 50;
const GRID_HEIGHT = 40;
const COLOR_BG = 0x1a1a2e;
const COLOR_WALL = 0x16213e;
const COLOR_FLOOR = 0x0f3460;
const COLOR_ENTRANCE = 0x00b4d8;
const COLOR_EXIT = 0xe94560;
const COLOR_PLAYER = 0xffffff;
const COLOR_CORRIDOR_FLOOR = 0x0f3460;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const MOVE_DURATION = 200;
const MINIMAP_SIZE = 200;

export default class GameScene extends Phaser.Scene {
  private dungeon!: BSPResult;
  private playerGridX: number = 0;
  private playerGridY: number = 0;
  private playerPixelX: number = 0;
  private playerPixelY: number = 0;
  private isMoving: boolean = false;
  private moveTween?: Phaser.Tweens.Tween;

  private mapGraphics!: Phaser.GameObjects.Graphics;
  private playerSprite!: Phaser.GameObjects.Container;
  private playerCube!: Phaser.GameObjects.Graphics;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapBg!: Phaser.GameObjects.Graphics;
  private minimapText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private vignetteGraphics!: Phaser.GameObjects.Graphics;
  private fogGraphics!: Phaser.GameObjects.Graphics;

  private minimapRoomTexts: Phaser.GameObjects.Text[] = [];

  private exploredRooms: Set<number> = new Set();
  private revealedTiles: Set<string> = new Set();

  private currentZoom: number = 1;

  private isGenerating: boolean = false;
  private generatedRoomsCount: number = 0;
  private dissolvingRooms: Map<number, { tiles: { x: number; y: number; delay: number }[]; progress: number }> = new Map();

  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyPlus!: Phaser.Input.Keyboard.Key;
  private keyMinus!: Phaser.Input.Keyboard.Key;

  private moveQueue: { dx: number; dy: number }[] = [];

  private minimapDirty: boolean = true;
  private lastPlayerGridX: number = -1;
  private lastPlayerGridY: number = -1;
  private lastExploredCount: number = 0;
  private fogTime: number = 0;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG);

    this.mapGraphics = this.add.graphics();
    this.fogGraphics = this.add.graphics();
    this.playerSprite = this.add.container(0, 0);
    this.playerCube = this.add.graphics();
    this.playerSprite.add(this.playerCube);
    this.playerSprite.setDepth(100);

    this.drawPlayerCube();

    this.minimapBg = this.add.graphics();
    this.minimapGraphics = this.add.graphics();
    this.minimapBg.setScrollFactor(0);
    this.minimapGraphics.setScrollFactor(0);
    this.minimapBg.setDepth(200);
    this.minimapGraphics.setDepth(201);

    const { width } = this.scale;

    this.minimapText = this.add.text(width - MINIMAP_SIZE / 2 - 15, 15, 'MAP', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#00b4d8',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(202);

    this.progressText = this.add.text(width - MINIMAP_SIZE / 2 - 15, 15 + MINIMAP_SIZE + 8, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#888888',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(202);

    this.vignetteGraphics = this.add.graphics();
    this.vignetteGraphics.setScrollFactor(0);
    this.vignetteGraphics.setDepth(300);
    this.drawVignette();

    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyPlus = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS);
    this.keyMinus = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS);

    this.input.keyboard!.on('keydown-EQUAL', () => {
      this.handleZoom(0.1);
    });

    this.input.keyboard!.on('keydown-MINUS', () => {
      this.handleZoom(-0.1);
    });

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
      this.handleZoom(deltaY > 0 ? -0.1 : 0.1);
    });

    this.scale.on('resize', this.onResize, this);

    this.generateDungeonAnimated();

    this.cameras.main.zoom = this.currentZoom;
  }

  private drawPlayerCube(): void {
    this.playerCube.clear();
    const size = TILE_SIZE * 0.6;
    const half = size / 2;

    this.playerCube.fillStyle(COLOR_PLAYER, 1);
    this.playerCube.fillRect(-half, -half, size, size);

    this.playerCube.lineStyle(2, 0x00b4d8, 0.8);
    this.playerCube.strokeRect(-half, -half, size, size);
  }

  private drawVignette(): void {
    const { width, height } = this.scale;
    this.vignetteGraphics.clear();

    const gradientSize = Math.min(width, height) * 0.1;

    for (let i = 0; i < 20; i++) {
      const alpha = (i / 20) * 0.6;
      const inset = gradientSize * (1 - i / 20);
      this.vignetteGraphics.lineStyle(inset * 0.5, COLOR_BG, alpha);
      this.vignetteGraphics.strokeRect(
        inset / 2,
        inset / 2,
        width - inset,
        height - inset
      );
    }
  }

  private onResize(): void {
    this.drawVignette();
    this.positionMinimap();
    this.minimapDirty = true;
  }

  private positionMinimap(): void {
    const { width } = this.scale;

    this.minimapText.setPosition(width - MINIMAP_SIZE / 2 - 15, 15);
    this.progressText.setPosition(width - MINIMAP_SIZE / 2 - 15, 15 + MINIMAP_SIZE + 8);

    this.drawMinimapBackground();
  }

  private drawMinimapBackground(): void {
    const { width } = this.scale;
    const x = width - MINIMAP_SIZE - 15;
    const y = 35;
    const radius = 12;

    this.minimapBg.clear();
    this.minimapBg.fillStyle(0x000000, 0.7);

    this.minimapBg.beginPath();
    this.minimapBg.moveTo(x + radius, y);
    this.minimapBg.lineTo(x + MINIMAP_SIZE - radius, y);
    this.minimapBg.arc(x + MINIMAP_SIZE - radius, y + radius, radius, -Math.PI / 2, 0);
    this.minimapBg.lineTo(x + MINIMAP_SIZE, y + MINIMAP_SIZE - radius);
    this.minimapBg.arc(x + MINIMAP_SIZE - radius, y + MINIMAP_SIZE - radius, radius, 0, Math.PI / 2);
    this.minimapBg.lineTo(x + radius, y + MINIMAP_SIZE);
    this.minimapBg.arc(x + radius, y + MINIMAP_SIZE - radius, radius, Math.PI / 2, Math.PI);
    this.minimapBg.lineTo(x, y + radius);
    this.minimapBg.arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2);
    this.minimapBg.closePath();
    this.minimapBg.fillPath();

    this.minimapBg.lineStyle(2, 0x00b4d8, 0.6);
    this.minimapBg.strokePath();
  }

  private generateDungeonAnimated(): void {
    this.isGenerating = true;
    this.generatedRoomsCount = 0;
    this.dungeon = generateDungeon(GRID_WIDTH, GRID_HEIGHT);

    const entranceRoom = this.dungeon.rooms.find((r) => r.isEntrance)!;
    this.playerGridX = entranceRoom.centerX;
    this.playerGridY = entranceRoom.centerY;
    this.playerPixelX = this.playerGridX * TILE_SIZE + TILE_SIZE / 2;
    this.playerPixelY = this.playerGridY * TILE_SIZE + TILE_SIZE / 2;
    this.playerSprite.setPosition(this.playerPixelX, this.playerPixelY);

    this.cameras.main.startFollow(this.playerSprite, true, 0.1, 0.1);

    this.exploreRoom(entranceRoom.id);

    const totalRooms = this.dungeon.rooms.length;
    let currentRoom = 1;

    const showNextRoom = () => {
      if (currentRoom < totalRooms) {
        this.generatedRoomsCount = currentRoom + 1;
        currentRoom++;
        this.drawMap();
        this.time.delayedCall(150, showNextRoom);
      } else {
        this.isGenerating = false;
        this.drawMap();
      }
    };

    this.generatedRoomsCount = 1;
    this.drawMap();
    this.time.delayedCall(150, showNextRoom);
  }

  private drawMap(): void {
    this.mapGraphics.clear();

    this.mapGraphics.fillStyle(COLOR_BG, 1);
    this.mapGraphics.fillRect(0, 0, GRID_WIDTH * TILE_SIZE, GRID_HEIGHT * TILE_SIZE);

    for (let i = 0; i < this.generatedRoomsCount && i < this.dungeon.rooms.length; i++) {
      const room = this.dungeon.rooms[i];
      this.drawRoom(room);
    }

    if (!this.isGenerating) {
      for (const corridor of this.dungeon.corridors) {
        this.drawCorridor(corridor);
      }
    }
  }

  private drawRoom(room: Room): void {
    const x = room.x * TILE_SIZE;
    const y = room.y * TILE_SIZE;
    const w = room.width * TILE_SIZE;
    const h = room.height * TILE_SIZE;

    this.mapGraphics.fillStyle(COLOR_WALL, 1);
    this.mapGraphics.fillRect(x - TILE_SIZE, y - TILE_SIZE, w + TILE_SIZE * 2, h + TILE_SIZE * 2);

    this.mapGraphics.fillStyle(COLOR_FLOOR, 1);
    this.mapGraphics.fillRect(x, y, w, h);

    if (room.isEntrance) {
      this.mapGraphics.lineStyle(3, COLOR_ENTRANCE, 1);
      this.mapGraphics.strokeRect(x + 2, y + 2, w - 4, h - 4);
    } else if (room.isExit) {
      this.mapGraphics.lineStyle(3, COLOR_EXIT, 1);
      this.mapGraphics.strokeRect(x + 2, y + 2, w - 4, h - 4);
    }

    for (const item of room.items) {
      const ix = item.x * TILE_SIZE + TILE_SIZE / 2;
      const iy = item.y * TILE_SIZE + TILE_SIZE / 2;
      if (item.type === 'coin') {
        this.mapGraphics.fillStyle(0xffd700, 1);
        this.mapGraphics.fillCircle(ix, iy, 5);
      } else if (item.type === 'chest') {
        this.mapGraphics.fillStyle(0x8b4513, 1);
        this.mapGraphics.fillRect(ix - 8, iy - 6, 16, 12);
        this.mapGraphics.fillStyle(0xffd700, 1);
        this.mapGraphics.fillRect(ix - 2, iy - 6, 4, 12);
      }
    }
  }

  private drawCorridor(corridor: Corridor): void {
    for (const point of corridor.points) {
      const x = point.x * TILE_SIZE;
      const y = point.y * TILE_SIZE;

      this.mapGraphics.fillStyle(COLOR_WALL, 1);
      this.mapGraphics.fillRect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);

      this.mapGraphics.fillStyle(COLOR_CORRIDOR_FLOOR, 1);
      this.mapGraphics.fillRect(x - TILE_SIZE / 2 + 4, y - TILE_SIZE / 2 + 4, TILE_SIZE - 8, TILE_SIZE - 8);
    }
  }

  private drawFog(): void {
    if (this.isGenerating) return;

    this.fogGraphics.clear();
    this.fogGraphics.setDepth(50);

    for (const corridor of this.dungeon.corridors) {
      for (let i = 0; i < corridor.points.length; i++) {
        const point = corridor.points[i];
        const x = point.x * TILE_SIZE;
        const y = point.y * TILE_SIZE;

        const distFromStart = i;
        const distFromEnd = corridor.points.length - 1 - i;
        const minDist = Math.min(distFromStart, distFromEnd);
        const baseAlpha = 0.3 + Math.min(0.3, minDist * 0.05);

        const pulse = Math.sin(this.fogTime * 0.002 + point.x * 0.5 + point.y * 0.3) * 0.1;
        const alpha = Math.min(0.6, Math.max(0.2, baseAlpha + pulse));

        this.fogGraphics.fillStyle(COLOR_BG, alpha);
        this.fogGraphics.fillRect(
          x - TILE_SIZE / 2 + 2,
          y - TILE_SIZE / 2 + 2,
          TILE_SIZE - 4,
          TILE_SIZE - 4
        );
      }
    }
  }

  private updateMinimap(): void {
    if (!this.minimapDirty && 
        this.lastPlayerGridX === this.playerGridX && 
        this.lastPlayerGridY === this.playerGridY &&
        this.lastExploredCount === this.exploredRooms.size) {
      return;
    }

    this.minimapDirty = false;
    this.lastPlayerGridX = this.playerGridX;
    this.lastPlayerGridY = this.playerGridY;
    this.lastExploredCount = this.exploredRooms.size;

    for (const text of this.minimapRoomTexts) {
      text.destroy();
    }
    this.minimapRoomTexts = [];

    this.minimapGraphics.clear();

    const { width } = this.scale;
    const mapX = width - MINIMAP_SIZE - 15;
    const mapY = 35;

    const allRooms = this.dungeon.rooms;
    if (allRooms.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const room of allRooms) {
      minX = Math.min(minX, room.x);
      minY = Math.min(minY, room.y);
      maxX = Math.max(maxX, room.x + room.width);
      maxY = Math.max(maxY, room.y + room.height);
    }

    const mapWidth = maxX - minX;
    const mapHeight = maxY - minY;
    const scale = Math.min((MINIMAP_SIZE - 20) / mapWidth, (MINIMAP_SIZE - 20) / mapHeight);
    const offsetX = mapX + (MINIMAP_SIZE - mapWidth * scale) / 2;
    const offsetY = mapY + (MINIMAP_SIZE - mapHeight * scale) / 2;

    this.minimapGraphics.fillStyle(0x000000, 1);
    this.minimapGraphics.fillRect(mapX + 8, mapY + 8, MINIMAP_SIZE - 16, MINIMAP_SIZE - 16);

    for (const room of allRooms) {
      if (!this.exploredRooms.has(room.id)) {
        continue;
      }

      const rx = offsetX + (room.x - minX) * scale;
      const ry = offsetY + (room.y - minY) * scale;
      const rw = room.width * scale;
      const rh = room.height * scale;

      let color = COLOR_FLOOR;
      if (room.isEntrance) color = COLOR_ENTRANCE;
      else if (room.isExit) color = COLOR_EXIT;

      this.minimapGraphics.fillStyle(color, 0.7);
      this.minimapGraphics.fillRect(rx, ry, rw, rh);

      this.minimapGraphics.lineStyle(1, 0xffffff, 0.5);
      this.minimapGraphics.strokeRect(rx, ry, rw, rh);

      const textSize = Math.max(8, Math.floor(Math.min(rw, rh) * 0.6));
      const roomNum = this.add.text(rx + rw / 2, ry + rh / 2, String(room.id + 1), {
        fontFamily: 'monospace',
        fontSize: `${textSize}px`,
        color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(203);
      this.minimapRoomTexts.push(roomNum);

      for (const item of room.items) {
        const ix = offsetX + (item.x - minX) * scale;
        const iy = offsetY + (item.y - minY) * scale;
        if (item.type === 'coin') {
          this.minimapGraphics.fillStyle(0xffd700, 1);
          this.minimapGraphics.fillCircle(ix, iy, 2);
        } else if (item.type === 'chest') {
          this.minimapGraphics.fillStyle(0x8b4513, 1);
          this.minimapGraphics.fillRect(ix - 2, iy - 2, 4, 4);
        }
      }
    }

    const px = offsetX + (this.playerGridX - minX) * scale;
    const py = offsetY + (this.playerGridY - minY) * scale;
    this.minimapGraphics.fillStyle(COLOR_PLAYER, 1);
    this.minimapGraphics.fillCircle(px, py, 3);

    const explored = this.exploredRooms.size;
    const total = this.dungeon.rooms.length;
    const percent = Math.floor((explored / total) * 100);
    this.progressText.setText(`探索: ${explored}/${total} (${percent}%)`);
  }

  private handleZoom(delta: number): void {
    const newZoom = Phaser.Math.Clamp(this.currentZoom + delta, ZOOM_MIN, ZOOM_MAX);
    if (newZoom !== this.currentZoom) {
      this.currentZoom = newZoom;
      this.tweens.add({
        targets: this.cameras.main,
        zoom: this.currentZoom,
        duration: 150,
        ease: 'Power2',
      });
    }
  }

  private canMoveTo(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
      return false;
    }

    for (const room of this.dungeon.rooms) {
      if (
        gridX >= room.x &&
        gridX < room.x + room.width &&
        gridY >= room.y &&
        gridY < room.y + room.height
      ) {
        return true;
      }
    }

    for (const corridor of this.dungeon.corridors) {
      for (const point of corridor.points) {
        if (point.x === gridX && point.y === gridY) {
          return true;
        }
      }
    }

    return false;
  }

  private tryMove(dx: number, dy: number): void {
    if (this.isMoving || this.isGenerating) {
      this.moveQueue.push({ dx, dy });
      return;
    }

    const newX = this.playerGridX + dx;
    const newY = this.playerGridY + dy;

    if (this.canMoveTo(newX, newY)) {
      this.isMoving = true;
      this.playerGridX = newX;
      this.playerGridY = newY;

      const targetPixelX = newX * TILE_SIZE + TILE_SIZE / 2;
      const targetPixelY = newY * TILE_SIZE + TILE_SIZE / 2;

      this.moveTween = this.tweens.add({
        targets: this.playerSprite,
        x: targetPixelX,
        y: targetPixelY,
        duration: MOVE_DURATION,
        ease: 'Linear',
        onComplete: () => {
          this.isMoving = false;
          this.playerPixelX = targetPixelX;
          this.playerPixelY = targetPixelY;
          this.checkRoomExploration();
          this.processMoveQueue();
        },
      });
    } else {
      this.processMoveQueue();
    }
  }

  private processMoveQueue(): void {
    if (this.moveQueue.length > 0 && !this.isMoving && !this.isGenerating) {
      const move = this.moveQueue.shift()!;
      this.tryMove(move.dx, move.dy);
    }
  }

  private checkRoomExploration(): void {
    for (const room of this.dungeon.rooms) {
      if (
        this.playerGridX >= room.x &&
        this.playerGridX < room.x + room.width &&
        this.playerGridY >= room.y &&
        this.playerGridY < room.y + room.height
      ) {
        if (!this.exploredRooms.has(room.id)) {
          this.exploreRoom(room.id);
        }
        break;
      }
    }
  }

  private exploreRoom(roomId: number): void {
    if (this.exploredRooms.has(roomId)) return;

    const room = this.dungeon.rooms.find((r) => r.id === roomId);
    if (!room) return;

    this.exploredRooms.add(roomId);
    this.minimapDirty = true;

    const tiles: { x: number; y: number; delay: number }[] = [];
    for (let dy = 0; dy < room.height; dy++) {
      for (let dx = 0; dx < room.width; dx++) {
        const tx = room.x + dx;
        const ty = room.y + dy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delay = dist * 30 + Math.random() * 50;
        tiles.push({ x: tx, y: ty, delay });
        this.revealedTiles.add(`${tx},${ty}`);
      }
    }

    this.dissolvingRooms.set(roomId, { tiles, progress: 0 });
  }

  update(_time: number, delta: number): void {
    if (this.isGenerating) return;

    this.fogTime += delta;

    if (Phaser.Input.Keyboard.JustDown(this.keyW)) {
      this.tryMove(0, -1);
    } else if (Phaser.Input.Keyboard.JustDown(this.keyS)) {
      this.tryMove(0, 1);
    } else if (Phaser.Input.Keyboard.JustDown(this.keyA)) {
      this.tryMove(-1, 0);
    } else if (Phaser.Input.Keyboard.JustDown(this.keyD)) {
      this.tryMove(1, 0);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyPlus)) {
      this.handleZoom(0.1);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyMinus)) {
      this.handleZoom(-0.1);
    }

    this.playerCube.rotation += delta * 0.002;

    this.updateDissolveEffect(delta);
    this.drawFog();
    this.updateMinimap();
  }

  private updateDissolveEffect(delta: number): void {
    if (this.dissolvingRooms.size === 0) return;

    const toRemove: number[] = [];

    for (const [roomId, data] of this.dissolvingRooms) {
      data.progress += delta;

      for (const tile of data.tiles) {
        if (data.progress >= tile.delay) {
          const tx = tile.x * TILE_SIZE;
          const ty = tile.y * TILE_SIZE;
          const alpha = Math.min(1, (data.progress - tile.delay) / 100);

          if (alpha >= 1) {
            this.mapGraphics.fillStyle(COLOR_FLOOR, 1);
            this.mapGraphics.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          } else {
            const pixelSize = Math.max(2, TILE_SIZE * (1 - alpha) * 0.5);
            const cols = Math.ceil(TILE_SIZE / pixelSize);
            const rows = Math.ceil(TILE_SIZE / pixelSize);

            for (let py = 0; py < rows; py++) {
              for (let px = 0; px < cols; px++) {
                if (Math.random() < alpha) {
                  this.mapGraphics.fillStyle(COLOR_FLOOR, 1);
                  this.mapGraphics.fillRect(
                    tx + px * pixelSize,
                    ty + py * pixelSize,
                    pixelSize,
                    pixelSize
                  );
                }
              }
            }
          }
        }
      }

      if (data.progress > 500) {
        toRemove.push(roomId);
      }
    }

    for (const id of toRemove) {
      this.dissolvingRooms.delete(id);
    }
  }
}
