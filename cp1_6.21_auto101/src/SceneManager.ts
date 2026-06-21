import Phaser from 'phaser';

export interface InteractionPoint {
  id: string;
  x: number;
  y: number;
  dialogId: string;
  label: string;
}

export interface SceneData {
  id: string;
  name: string;
  nameCn: string;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  tiles: number[][];
  interactionPoints: InteractionPoint[];
  playerStart: { x: number; y: number };
  nextSceneId?: string;
}

const TILE_SIZE = 16;
const MAP_COLS = 50;
const MAP_ROWS = 30;

function createEmptyMap(): number[][] {
  const tiles: number[][] = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_COLS; x++) {
      tiles[y][x] = 0;
    }
  }
  return tiles;
}

function createRoomMap(): number[][] {
  const tiles = createEmptyMap();
  for (let x = 0; x < MAP_COLS; x++) {
    tiles[2][x] = 1;
    tiles[MAP_ROWS - 3][x] = 1;
  }
  for (let y = 2; y < MAP_ROWS - 2; y++) {
    tiles[y][2] = 1;
    tiles[y][MAP_COLS - 3] = 1;
  }
  for (let x = 3; x < MAP_COLS - 3; x++) {
    tiles[3][x] = 2;
  }
  for (let x = 3; x < MAP_COLS - 3; x++) {
    tiles[MAP_ROWS - 4][x] = 2;
  }
  for (let y = 3; y < MAP_ROWS - 3; y++) {
    tiles[y][3] = 2;
    tiles[y][MAP_COLS - 4] = 2;
  }
  for (let y = 4; y < MAP_ROWS - 4; y++) {
    for (let x = 4; x < MAP_COLS - 4; x++) {
      tiles[y][x] = 3;
    }
  }
  for (let y = 4; y < 10; y++) {
    for (let x = 6; x < 12; x++) {
      tiles[y][x] = 4;
    }
  }
  tiles[9][8] = 5;
  tiles[9][9] = 5;
  for (let y = 15; y < 20; y++) {
    tiles[y][MAP_COLS - 8] = 6;
    tiles[y][MAP_COLS - 7] = 6;
  }
  tiles[14][MAP_COLS - 8] = 7;
  tiles[14][MAP_COLS - 7] = 7;
  for (let x = 15; x < 22; x++) {
    tiles[15][x] = 8;
    tiles[16][x] = 8;
  }
  tiles[2][10] = 9;
  tiles[2][11] = 9;
  tiles[2][MAP_COLS - 12] = 9;
  tiles[2][MAP_COLS - 11] = 9;
  return tiles;
}

function createHallwayMap(): number[][] {
  const tiles = createEmptyMap();
  for (let y = 4; y < MAP_ROWS - 4; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      if (y === 4 || y === MAP_ROWS - 5) {
        tiles[y][x] = 10;
      } else if (y === 5 || y === MAP_ROWS - 6) {
        tiles[y][x] = 11;
      } else {
        const pattern = (Math.floor(x / 2) + Math.floor(y / 2)) % 2;
        tiles[y][x] = pattern === 0 ? 12 : 13;
      }
    }
  }
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      tiles[y][x] = 14;
    }
  }
  for (let y = MAP_ROWS - 4; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      tiles[y][x] = 14;
    }
  }
  const paintingPositions = [8, 18, 28, 38];
  paintingPositions.forEach((px) => {
    for (let py = 1; py < 4; py++) {
      for (let pw = -1; pw <= 2; pw++) {
        tiles[py][px + pw] = 15;
      }
    }
    tiles[2][px] = 16;
    tiles[2][px + 1] = 16;
  });
  for (let y = 5; y < MAP_ROWS - 5; y++) {
    tiles[y][0] = 17;
    tiles[y][1] = 17;
    tiles[y][MAP_COLS - 2] = 17;
    tiles[y][MAP_COLS - 1] = 17;
  }
  for (let y = 10; y < 16; y++) {
    tiles[y][MAP_COLS - 3] = 18;
    tiles[y][MAP_COLS - 2] = 18;
  }
  tiles[9][MAP_COLS - 3] = 19;
  tiles[9][MAP_COLS - 2] = 19;
  return tiles;
}

function createOutdoorMap(): number[][] {
  const tiles = createEmptyMap();
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const pattern = (Math.floor(x / 2) + Math.floor(y / 3)) % 2;
      tiles[y][x] = pattern === 0 ? 20 : 21;
    }
  }
  for (let y = 5; y < 10; y++) {
    for (let x = 3; x < 10; x++) {
      tiles[y][x] = 22;
    }
  }
  for (let y = 5; y < 8; y++) {
    for (let x = 20; x < 27; x++) {
      tiles[y][x] = 22;
    }
  }
  for (let y = 18; y < 23; y++) {
    for (let x = 40; x < 47; x++) {
      tiles[y][x] = 22;
    }
  }
  const centerX = Math.floor(MAP_COLS / 2);
  const centerY = Math.floor(MAP_ROWS / 2);
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 4.5) {
        if (dist >= 3 && dist <= 4.5) {
          tiles[centerY + dy][centerX + dx] = 23;
        } else {
          tiles[centerY + dy][centerX + dx] = 24;
        }
      }
    }
  }
  tiles[centerY - 1][centerX] = 25;
  tiles[centerY][centerX] = 25;
  const fogPatches = [
    { x: 5, y: 2, w: 6, h: 3 },
    { x: 35, y: 3, w: 8, h: 4 },
    { x: 15, y: 24, w: 7, h: 3 },
  ];
  fogPatches.forEach((patch) => {
    for (let dy = 0; dy < patch.h; dy++) {
      for (let dx = 0; dx < patch.w; dx++) {
        const alpha = 0.5 + Math.random() * 0.3;
        if (alpha > 0.65) {
          tiles[patch.y + dy][patch.x + dx] = 26;
        }
      }
    }
  });
  for (let y = 1; y < MAP_ROWS - 1; y++) {
    tiles[y][0] = 27;
    tiles[y][MAP_COLS - 1] = 27;
  }
  for (let x = 0; x < MAP_COLS; x++) {
    tiles[0][x] = 27;
    tiles[MAP_ROWS - 1][x] = 27;
  }
  return tiles;
}

export const SCENES_DATA: Record<string, SceneData> = {
  room: {
    id: 'room',
    name: 'Room',
    nameCn: '神秘房间',
    mapWidth: MAP_COLS,
    mapHeight: MAP_ROWS,
    tileSize: TILE_SIZE,
    tiles: createRoomMap(),
    playerStart: { x: 25, y: 20 },
    interactionPoints: [
      { id: 'room_desk', x: 9, y: 11, dialogId: 'room_intro', label: '书桌' },
      { id: 'room_shelf', x: MAP_COLS - 8, y: 16, dialogId: 'room_choice', label: '书架' },
      { id: 'room_window', x: 11, y: 4, dialogId: 'room_choice', label: '窗户' },
    ],
    nextSceneId: 'hallway',
  },
  hallway: {
    id: 'hallway',
    name: 'Hallway',
    nameCn: '诡异走廊',
    mapWidth: MAP_COLS,
    mapHeight: MAP_ROWS,
    tileSize: TILE_SIZE,
    tiles: createHallwayMap(),
    playerStart: { x: 4, y: 15 },
    interactionPoints: [
      { id: 'hall_paint1', x: 8, y: 6, dialogId: 'hallway_intro', label: '肖像画' },
      { id: 'hall_paint2', x: 28, y: 6, dialogId: 'hallway_painting', label: '诡异画像' },
      { id: 'hall_door', x: MAP_COLS - 5, y: 14, dialogId: 'hallway_painting', label: '出口' },
    ],
    nextSceneId: 'outdoor',
  },
  outdoor: {
    id: 'outdoor',
    name: 'Outdoor',
    nameCn: '迷雾庭院',
    mapWidth: MAP_COLS,
    mapHeight: MAP_ROWS,
    tileSize: TILE_SIZE,
    tiles: createOutdoorMap(),
    playerStart: { x: 3, y: 15 },
    interactionPoints: [
      { id: 'out_fountain', x: MAP_COLS / 2, y: MAP_ROWS / 2, dialogId: 'outdoor_intro', label: '喷泉' },
      { id: 'out_tree1', x: 6, y: 8, dialogId: 'outdoor_fountain', label: '古树' },
      { id: 'out_figure', x: MAP_COLS / 2 + 3, y: MAP_ROWS / 2 - 2, dialogId: 'outdoor_fountain', label: '身影' },
    ],
  },
};

export const SCENE_ORDER = ['room', 'hallway', 'outdoor'];

export class SceneManager {
  private scene: Phaser.Scene;
  private currentSceneId: string = 'room';
  private tileMap: Phaser.Tilemaps.Tilemap | null = null;
  private tileset: Phaser.Tilemaps.Tileset | null = null;
  private tileLayer: Phaser.Tilemaps.TilemapLayer | null = null;
  private generatedTextureKey: string = 'generated_tiles';
  private interactionPointObjects: Phaser.GameObjects.Container[] = [];
  private pulseTweens: Phaser.Tweens.Tween[] = [];
  private mapGraphics!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  generateTilesetTexture(): void {
    const tileCount = 28;
    const texSize = TILE_SIZE;
    const graphics = this.scene.add.graphics();
    const canvas = this.scene.textures.createCanvas(this.generatedTextureKey, texSize * tileCount, texSize)!;
    const ctx = (canvas!.getSourceImage() as HTMLCanvasElement).getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const tileDrawers: Array<() => void> = [
      () => this.drawSolidTile(ctx, 0, '#2D2A34'),
      () => this.drawWallTile(ctx, 1),
      () => this.drawWallEdgeTile(ctx, 2),
      () => this.drawFloorTile(ctx, 3),
      () => this.drawBedTile(ctx, 4),
      () => this.drawPillowTile(ctx, 5),
      () => this.drawShelfTile(ctx, 6),
      () => this.drawBookTile(ctx, 7),
      () => this.drawRugTile(ctx, 8),
      () => this.drawWindowTile(ctx, 9),
      () => this.drawHallWallEdge(ctx, 10),
      () => this.drawHallWall(ctx, 11),
      () => this.drawHallFloor1(ctx, 12),
      () => this.drawHallFloor2(ctx, 13),
      () => this.drawHallCeiling(ctx, 14),
      () => this.drawFrameTile(ctx, 15),
      () => this.drawPaintingTile(ctx, 16),
      () => this.drawHallColumn(ctx, 17),
      () => this.drawDoorTile(ctx, 18),
      () => this.drawDoorTopTile(ctx, 19),
      () => this.drawGrass1(ctx, 20),
      () => this.drawGrass2(ctx, 21),
      () => this.drawBushTile(ctx, 22),
      () => this.drawFountainEdge(ctx, 23),
      () => this.drawFountainWater(ctx, 24),
      () => this.drawFountainCenter(ctx, 25),
      () => this.drawFogTile(ctx, 26),
      () => this.drawFenceTile(ctx, 27),
    ];

    tileDrawers.forEach((drawer) => drawer());
    graphics.destroy();
  }

  private drawSolidTile(ctx: CanvasRenderingContext2D, idx: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(idx * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
  }

  private drawWallTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#5D4537';
    ctx.fillRect(x + 1, 1, TILE_SIZE - 2, 2);
    ctx.fillRect(x + 1, 7, TILE_SIZE - 2, 2);
    ctx.fillStyle = '#3A2A1E';
    ctx.fillRect(x, 14, TILE_SIZE, 2);
    ctx.fillStyle = '#3D2B1F';
    for (let py = 0; py < TILE_SIZE; py += 8) {
      const offset = (py / 8) % 2 === 0 ? 0 : 8;
      ctx.fillRect(x + offset, py, 1, 8);
    }
  }

  private drawWallEdgeTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#5D4537';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x, 0, TILE_SIZE, 3);
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x, 13, TILE_SIZE, 3);
    ctx.fillStyle = '#7A5C3E';
    ctx.fillRect(x + 2, 5, 12, 2);
  }

  private drawFloorTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#6B5344';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#5A4535';
    ctx.lineWidth = 1;
    for (let py = 0; py < TILE_SIZE; py += 4) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + TILE_SIZE, py);
      ctx.stroke();
    }
    for (let px = 0; px < TILE_SIZE; px += 8) {
      ctx.beginPath();
      ctx.moveTo(x + px, 0);
      ctx.lineTo(x + px, TILE_SIZE);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(139, 105, 20, 0.2)';
    ctx.fillRect(x + 3, 5, 2, 1);
    ctx.fillRect(x + 10, 11, 1, 2);
  }

  private drawBedTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#CD853F';
    ctx.fillRect(x + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(x, 0, TILE_SIZE, 3);
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(x + 2, 4, TILE_SIZE - 4, 4);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, TILE_SIZE - 2, TILE_SIZE, 2);
  }

  private drawPillowTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(x + 2, 4, TILE_SIZE - 4, 8);
    ctx.fillStyle = '#E8E4C9';
    ctx.fillRect(x + 2, 4, TILE_SIZE - 4, 1);
    ctx.fillStyle = '#D4C896';
    ctx.fillRect(x + 2, 11, TILE_SIZE - 4, 1);
  }

  private drawShelfTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#6B4423';
    ctx.fillRect(x + 1, 2, TILE_SIZE - 2, 2);
    ctx.fillRect(x + 1, 8, TILE_SIZE - 2, 2);
    ctx.fillRect(x + 1, 14, TILE_SIZE - 2, 2);
    ctx.fillStyle = '#2D2A34';
    ctx.fillRect(x + 2, 5, 3, 2);
    ctx.fillRect(x + 6, 4, 4, 3);
    ctx.fillRect(x + 11, 5, 3, 2);
    ctx.fillRect(x + 3, 11, 5, 2);
    ctx.fillRect(x + 10, 10, 3, 3);
  }

  private drawBookTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(x + 2, 3, 3, 10);
    ctx.fillStyle = '#006400';
    ctx.fillRect(x + 6, 2, 4, 11);
    ctx.fillStyle = '#00008B';
    ctx.fillRect(x + 11, 4, 3, 9);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + 6, 7, 4, 1);
  }

  private drawRugTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#A52A2A';
    ctx.fillRect(x + 2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    ctx.fillStyle = '#DAA520';
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3.5, 3.5, TILE_SIZE - 7, TILE_SIZE - 7);
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(x + 7, 7, 2, 2);
  }

  private drawWindowTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + 2, 3, TILE_SIZE - 4, 10);
    ctx.fillStyle = '#5D4537';
    ctx.fillRect(x + 1, 2, 1, 12);
    ctx.fillRect(x + TILE_SIZE - 2, 2, 1, 12);
    ctx.fillRect(x + 1, 1, TILE_SIZE - 2, 2);
    ctx.fillRect(x + 1, 13, TILE_SIZE - 2, 2);
    ctx.fillRect(x + Math.floor(TILE_SIZE / 2), 3, 1, 10);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 3, 4, 4, 2);
  }

  private drawHallWallEdge(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#5D4537';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x, 0, TILE_SIZE, 2);
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x, 14, TILE_SIZE, 2);
    ctx.fillStyle = '#6B5344';
    for (let px = 0; px < TILE_SIZE; px += 4) {
      ctx.fillRect(x + px, 4, 1, 8);
    }
  }

  private drawHallWall(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#6B5344';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#5A4535';
    ctx.fillRect(x + 2, 3, 12, 2);
    ctx.fillRect(x + 2, 8, 12, 2);
    ctx.fillRect(x + 2, 13, 12, 1);
    ctx.fillStyle = '#7A6353';
    ctx.fillRect(x + 4, 6, 8, 1);
  }

  private drawHallFloor1(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#3E6B42';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#2D4F30';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    ctx.fillStyle = '#5C9A5C';
    ctx.fillRect(x + 3, 5, 2, 1);
    ctx.fillRect(x + 10, 9, 1, 2);
    ctx.fillRect(x + 6, 2, 2, 1);
  }

  private drawHallFloor2(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#5C9A5C';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = '#4A7A4A';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    ctx.fillStyle = '#3E6B42';
    ctx.fillRect(x + 8, 4, 3, 1);
    ctx.fillRect(x + 2, 11, 1, 2);
    ctx.fillRect(x + 12, 7, 1, 2);
  }

  private drawHallCeiling(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#2D2A34';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#3A3744';
    for (let py = 0; py < TILE_SIZE; py += 4) {
      ctx.fillRect(x, py, TILE_SIZE, 1);
    }
    ctx.fillStyle = '#1A1820';
    ctx.fillRect(x + 6, 5, 4, 2);
    ctx.fillStyle = '#FFD700';
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x + 4, 7, 8, 3);
    ctx.globalAlpha = 1;
  }

  private drawFrameTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#2D2A34';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x + 1, 2, TILE_SIZE - 2, TILE_SIZE - 4);
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(x + 1, 2, TILE_SIZE - 2, 1);
    ctx.fillRect(x + 1, TILE_SIZE - 3, TILE_SIZE - 2, 1);
    ctx.fillRect(x + 1, 2, 1, TILE_SIZE - 4);
    ctx.fillRect(x + TILE_SIZE - 2, 2, 1, TILE_SIZE - 4);
  }

  private drawPaintingTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#2D2A34';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(x + 1, 2, TILE_SIZE - 2, TILE_SIZE - 4);
    ctx.fillStyle = '#1E90FF';
    ctx.fillRect(x + 2, 3, TILE_SIZE - 4, 5);
    ctx.fillStyle = '#F5F5DC';
    ctx.beginPath();
    ctx.arc(x + TILE_SIZE / 2, 6, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#228B22';
    ctx.fillRect(x + 2, 8, TILE_SIZE - 4, 4);
  }

  private drawHallColumn(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#5D4537';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x + 2, 1, 12, 2);
    ctx.fillRect(x + 2, TILE_SIZE - 3, 12, 2);
    ctx.fillStyle = '#7A5C3E';
    ctx.fillRect(x + 4, 3, 8, TILE_SIZE - 6);
    ctx.fillStyle = '#A67C52';
    ctx.fillRect(x + 5, 4, 2, TILE_SIZE - 8);
  }

  private drawDoorTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 2, 0, 12, TILE_SIZE);
    ctx.fillStyle = '#6B3410';
    ctx.fillRect(x + 3, 2, 10, TILE_SIZE - 4);
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(x + 11, 8, 2, 2);
    ctx.strokeStyle = '#4A3728';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4.5, 3.5, 7, TILE_SIZE - 7);
  }

  private drawDoorTopTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x + 1, 10, TILE_SIZE - 2, 6);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x + 2, 2, 12, 8);
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x + 4, 4, 8, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 5, 5, 2, 1);
  }

  private drawGrass1(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#3E6B42';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#5C9A5C';
    ctx.fillRect(x + 2, 3, 1, 2);
    ctx.fillRect(x + 6, 5, 2, 1);
    ctx.fillRect(x + 11, 2, 1, 3);
    ctx.fillRect(x + 9, 10, 2, 1);
    ctx.fillRect(x + 3, 12, 1, 2);
    ctx.fillStyle = '#2D4F30';
    ctx.fillRect(x + 7, 2, 1, 1);
    ctx.fillRect(x + 13, 8, 1, 1);
  }

  private drawGrass2(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#5C9A5C';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#3E6B42';
    ctx.fillRect(x + 4, 4, 1, 2);
    ctx.fillRect(x + 1, 7, 2, 1);
    ctx.fillRect(x + 12, 3, 1, 3);
    ctx.fillRect(x + 7, 12, 1, 2);
    ctx.fillStyle = '#7AB87A';
    ctx.fillRect(x + 8, 6, 1, 1);
    ctx.fillRect(x + 3, 10, 1, 1);
    ctx.fillRect(x + 14, 13, 1, 1);
  }

  private drawBushTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#3E6B42';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#228B22';
    ctx.beginPath();
    ctx.arc(x + 5, 10, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 11, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 8, 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#32CD32';
    ctx.fillRect(x + 4, 7, 2, 1);
    ctx.fillRect(x + 9, 5, 2, 1);
    ctx.fillRect(x + 12, 10, 1, 1);
  }

  private drawFountainEdge(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#3E6B42';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#A9A9A9';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#808080';
    ctx.fillRect(x + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    ctx.fillStyle = '#696969';
    for (let px = 2; px < TILE_SIZE - 2; px += 4) {
      ctx.fillRect(x + px, 2, 1, TILE_SIZE - 4);
    }
    for (let py = 2; py < TILE_SIZE - 2; py += 4) {
      ctx.fillRect(x + 2, py, TILE_SIZE - 4, 1);
    }
  }

  private drawFountainWater(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#1E90FF';
    ctx.fillRect(x + 1, 2, TILE_SIZE - 2, 2);
    ctx.fillRect(x + 2, 8, TILE_SIZE - 4, 2);
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + 3, 5, 4, 1);
    ctx.fillRect(x + 10, 11, 3, 1);
    ctx.fillStyle = '#00BFFF';
    ctx.fillRect(x + 6, 13, 2, 1);
  }

  private drawFountainCenter(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#1E90FF';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#A9A9A9';
    ctx.fillRect(x + 6, 0, 4, TILE_SIZE);
    ctx.fillStyle = '#808080';
    ctx.fillRect(x + 7, 2, 2, 12);
    ctx.fillStyle = '#00BFFF';
    ctx.beginPath();
    ctx.arc(x + 8, 3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(x + 3, 6, 2, 1);
    ctx.fillRect(x + 11, 9, 2, 1);
  }

  private drawFogTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#5C9A5C';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = 'rgba(220, 220, 220, 0.5)';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + 2, 3, 5, 2);
    ctx.fillRect(x + 8, 7, 6, 3);
    ctx.fillRect(x + 1, 11, 4, 2);
  }

  private drawFenceTile(ctx: CanvasRenderingContext2D, idx: number): void {
    const x = idx * TILE_SIZE;
    ctx.fillStyle = '#3E6B42';
    ctx.fillRect(x, 0, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = '#4A3728';
    ctx.fillRect(x + 2, 0, 2, TILE_SIZE);
    ctx.fillRect(x + 8, 0, 2, TILE_SIZE);
    ctx.fillRect(x + 12, 0, 2, TILE_SIZE);
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(x, 4, TILE_SIZE, 2);
    ctx.fillRect(x, 10, TILE_SIZE, 2);
    ctx.fillStyle = '#6B4423';
    ctx.fillRect(x + 2, 1, 2, 1);
    ctx.fillRect(x + 8, 1, 2, 1);
    ctx.fillRect(x + 12, 1, 2, 1);
  }

  loadScene(sceneId: string): void {
    this.clearScene();
    this.currentSceneId = sceneId;
    const sceneData = SCENES_DATA[sceneId];
    if (!sceneData) {
      console.error('Scene not found:', sceneId);
      return;
    }
    this.buildTileMap(sceneData);
    this.createInteractionPoints(sceneData);
  }

  private buildTileMap(sceneData: SceneData): void {
    const { tileSize, mapWidth, mapHeight, tiles } = sceneData;
    this.tileMap = this.scene.make.tilemap({
      width: mapWidth,
      height: mapHeight,
      tileWidth: tileSize,
      tileHeight: tileSize,
    });

    this.tileset = this.tileMap.addTilesetImage(
      this.generatedTextureKey,
      this.generatedTextureKey,
      tileSize,
      tileSize,
      0,
      0
    )!;

    this.tileLayer = this.tileMap.createLayer(0, this.tileset!, 0, 0);

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tileIndex = tiles[y][x];
        this.tileMap.putTileAt(tileIndex, x, y);
      }
    }

    if (this.tileLayer) {
      this.tileLayer.setDepth(0);
      this.tileLayer.setPipeline('TextureTintPipeline');
    }
  }

  private createInteractionPoints(sceneData: SceneData): void {
    const { tileSize, interactionPoints } = sceneData;

    interactionPoints.forEach((point) => {
      const worldX = point.x * tileSize + tileSize / 2;
      const worldY = point.y * tileSize + tileSize / 2;

      const container = this.scene.add.container(worldX, worldY);
      container.setDepth(50);
      container.setData('interactionPoint', point);

      const glow = this.scene.add.graphics();
      glow.x = -tileSize;
      glow.y = -tileSize;

      const drawGlow = (alpha: number) => {
        glow.clear();
        glow.fillStyle(0x00ffff, alpha * 0.3);
        glow.fillRoundedRect(0, 0, tileSize * 2, tileSize * 2, 8);
        glow.lineStyle(3, 0x00ffff, alpha);
        glow.strokeRoundedRect(2, 2, tileSize * 2 - 4, tileSize * 2 - 4, 6);
      };

      drawGlow(0.7);
      container.add(glow);

      const pulse = this.scene.tweens.add({
        targets: { t: 0 },
        t: { from: 0, to: 1 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const t = (pulse.data[0] as Phaser.Tweens.TweenData).current;
          drawGlow(0.4 + t * 0.6);
          container.setScale(0.95 + t * 0.1);
        },
      });
      this.pulseTweens.push(pulse);

      const label = this.scene.add.text(0, tileSize + 4, point.label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: '#E3D088',
        backgroundColor: 'rgba(45, 42, 52, 0.8)',
        padding: { x: 4, y: 2 },
      });
      label.setOrigin(0.5, 0);
      container.add(label);

      this.interactionPointObjects.push(container);
    });
  }

  getCurrentSceneData(): SceneData {
    return SCENES_DATA[this.currentSceneId];
  }

  getCurrentSceneId(): string {
    return this.currentSceneId;
  }

  getInteractionPoints(): InteractionPoint[] {
    return SCENES_DATA[this.currentSceneId].interactionPoints;
  }

  getNextSceneId(): string | undefined {
    return SCENES_DATA[this.currentSceneId].nextSceneId;
  }

  findNearbyInteraction(playerX: number, playerY: number): InteractionPoint | null {
    const sceneData = this.getCurrentSceneData();
    const tileSize = sceneData.tileSize;
    const playerTileX = playerX / tileSize;
    const playerTileY = playerY / tileSize;
    const collisionDistance = 1.5;

    let nearest: InteractionPoint | null = null;
    let nearestDist = Infinity;

    for (const point of sceneData.interactionPoints) {
      const dx = point.x - playerTileX;
      const dy = point.y - playerTileY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= collisionDistance && dist < nearestDist) {
        nearestDist = dist;
        nearest = point;
      }
    }

    return nearest;
  }

  getSceneNameCn(sceneId?: string): string {
    const id = sceneId || this.currentSceneId;
    return SCENES_DATA[id]?.nameCn || id;
  }

  private clearScene(): void {
    this.pulseTweens.forEach((t) => t.stop());
    this.pulseTweens = [];
    this.interactionPointObjects.forEach((obj) => obj.destroy());
    this.interactionPointObjects = [];
    if (this.tileLayer) {
      this.tileLayer.destroy();
      this.tileLayer = null;
    }
    if (this.tileMap) {
      this.tileMap.destroy();
      this.tileMap = null;
    }
  }

  destroy(): void {
    this.clearScene();
    if (this.scene.textures.exists(this.generatedTextureKey)) {
      this.scene.textures.removeKey(this.generatedTextureKey);
    }
  }
}
