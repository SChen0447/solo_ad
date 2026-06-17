import type {
  GameState,
  LevelData,
  Position,
  Direction,
  LightColor,
  LaserSegment,
  PlacedMirror,
  MirrorOrientation,
  ToolType,
} from './types';
import { GameBoard } from './GameBoard';

const MAX_LASER_STEPS = 300;

interface LaserRay {
  pos: Position;
  dir: Direction;
  color: LightColor;
  steps: number;
  visited: Set<string>;
}

export class GameEngine {
  state: GameState;
  onStateChange: ((state: GameState) => void) | null = null;
  playerStartPos: Position = { x: 1, y: 1 };

  constructor(level: LevelData) {
    this.state = this.createInitialState(level);
    this.playerStartPos = { ...level.player };
    this.updateLasers();
  }

  createInitialState(level: LevelData): GameState {
    return {
      levelId: level.id,
      gridSize: level.size,
      walls: level.walls.map((w) => ({ ...w })),
      lightSources: level.lightSources.map((s) => ({ ...s })),
      targets: level.targets.map((t) => ({ ...t, activated: false })),
      boxes: level.boxes.map((b) => ({ ...b })),
      placedMirrors: [],
      placedPrisms: [],
      player: { ...level.player, lives: 5 },
      inventoryMirrors: level.mirrors,
      inventoryPrisms: level.prisms,
      selectedTool: null,
      selectedMirrorOrientation: '/',
      laserPaths: [],
      isWin: false,
      isGameOver: false,
      hitFlash: false,
      footprints: [],
      placedHighlight: null,
    };
  }

  emit(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  loadLevel(level: LevelData): void {
    this.state = this.createInitialState(level);
    this.playerStartPos = { ...level.player };
    this.updateLasers();
    this.emit();
  }

  resetLevel(): void {
    this.state.player.x = this.playerStartPos.x;
    this.state.player.y = this.playerStartPos.y;
    this.state.isWin = false;
    this.state.isGameOver = false;
    this.state.placedMirrors = [];
    this.state.placedPrisms = [];
    this.state.footprints = [];
    this.updateLasers();
    this.emit();
  }

  selectTool(tool: ToolType): void {
    this.state.selectedTool = tool;
    this.emit();
  }

  rotateMirror(): void {
    this.state.selectedMirrorOrientation =
      this.state.selectedMirrorOrientation === '/' ? '\\' : '/';
    this.emit();
  }

  isWall(pos: Position): boolean {
    return this.state.walls.some((w) => GameBoard.posEq(w, pos));
  }

  isBox(pos: Position): boolean {
    return this.state.boxes.some((b) => GameBoard.posEq(b, pos));
  }

  isMirror(pos: Position): boolean {
    return this.state.placedMirrors.some((m) => GameBoard.posEq(m, pos));
  }

  isPrism(pos: Position): boolean {
    return this.state.placedPrisms.some((p) => GameBoard.posEq(p, pos));
  }

  isTarget(pos: Position): boolean {
    return this.state.targets.some((t) => GameBoard.posEq(t, pos));
  }

  isLightSource(pos: Position): boolean {
    return this.state.lightSources.some((s) => GameBoard.posEq(s, pos));
  }

  isPlayer(pos: Position): boolean {
    return GameBoard.posEq(this.state.player, pos);
  }

  isEmpty(pos: Position): boolean {
    if (!GameBoard.isInBounds(pos, this.state.gridSize)) return false;
    if (this.isWall(pos)) return false;
    if (this.isBox(pos)) return false;
    if (this.isMirror(pos)) return false;
    if (this.isPrism(pos)) return false;
    if (this.isTarget(pos)) return false;
    if (this.isLightSource(pos)) return false;
    if (this.isPlayer(pos)) return false;
    return true;
  }

  movePlayer(direction: Direction): void {
    if (this.state.isWin || this.state.isGameOver) return;

    const delta = GameBoard.dirToDelta(direction);
    const next: Position = {
      x: this.state.player.x + delta.x,
      y: this.state.player.y + delta.y,
    };

    if (!GameBoard.isInBounds(next, this.state.gridSize)) return;
    if (this.isWall(next)) return;
    if (this.isMirror(next)) return;
    if (this.isPrism(next)) return;
    if (this.isLightSource(next)) return;
    if (this.isTarget(next)) return;

    if (this.isBox(next)) {
      const boxNext: Position = { x: next.x + delta.x, y: next.y + delta.y };
      if (!GameBoard.isInBounds(boxNext, this.state.gridSize)) return;
      if (this.isWall(boxNext)) return;
      if (this.isBox(boxNext)) return;
      if (this.isMirror(boxNext)) return;
      if (this.isPrism(boxNext)) return;
      if (this.isLightSource(boxNext)) return;
      if (this.isTarget(boxNext)) return;

      const box = this.state.boxes.find((b) => GameBoard.posEq(b, next));
      if (box) {
        box.x = boxNext.x;
        box.y = boxNext.y;
      }
    }

    this.state.player.x = next.x;
    this.state.player.y = next.y;

    const now = Date.now();
    this.state.footprints.push({ x: next.x, y: next.y, time: now });
    this.state.footprints = this.state.footprints.filter((f) => now - f.time < 500);

    this.updateLasers();
    this.checkPlayerHit();
    this.checkWin();
    this.emit();
  }

  placeTool(position: Position): void {
    if (this.state.isWin || this.state.isGameOver) return;
    if (!this.state.selectedTool) return;

    if (!this.isEmpty(position)) return;

    if (this.state.selectedTool === 'mirror') {
      if (this.state.inventoryMirrors <= 0) return;
      this.state.placedMirrors.push({
        x: position.x,
        y: position.y,
        orientation: this.state.selectedMirrorOrientation,
      });
      this.state.inventoryMirrors--;
    } else if (this.state.selectedTool === 'prism') {
      if (this.state.inventoryPrisms <= 0) return;
      this.state.placedPrisms.push({ x: position.x, y: position.y });
      this.state.inventoryPrisms--;
    }

    this.state.placedHighlight = { ...position };
    setTimeout(() => {
      if (
        this.state.placedHighlight &&
        GameBoard.posEq(this.state.placedHighlight, position)
      ) {
        this.state.placedHighlight = null;
        this.emit();
      }
    }, 500);

    this.updateLasers();
    this.checkWin();
    this.emit();
  }

  removeTool(position: Position): void {
    if (this.state.isWin || this.state.isGameOver) return;

    const mirrorIdx = this.state.placedMirrors.findIndex((m) =>
      GameBoard.posEq(m, position)
    );
    if (mirrorIdx >= 0) {
      this.state.placedMirrors.splice(mirrorIdx, 1);
      this.state.inventoryMirrors++;
      this.updateLasers();
      this.checkWin();
      this.emit();
      return;
    }

    const prismIdx = this.state.placedPrisms.findIndex((p) =>
      GameBoard.posEq(p, position)
    );
    if (prismIdx >= 0) {
      this.state.placedPrisms.splice(prismIdx, 1);
      this.state.inventoryPrisms++;
      this.updateLasers();
      this.checkWin();
      this.emit();
    }
  }

  reflectMirror(dir: Direction, orientation: MirrorOrientation): Direction {
    if (orientation === '/') {
      switch (dir) {
        case 'right':
          return 'up';
        case 'left':
          return 'down';
        case 'up':
          return 'right';
        case 'down':
          return 'left';
      }
    } else {
      switch (dir) {
        case 'right':
          return 'down';
        case 'left':
          return 'up';
        case 'up':
          return 'left';
        case 'down':
          return 'right';
      }
    }
  }

  splitPrism(dir: Direction): [Direction, Direction] {
    switch (dir) {
      case 'right':
        return ['up', 'down'];
      case 'left':
        return ['up', 'down'];
      case 'up':
        return ['left', 'right'];
      case 'down':
        return ['left', 'right'];
    }
  }

  oppositeDir(dir: Direction): Direction {
    switch (dir) {
      case 'up':
        return 'down';
      case 'down':
        return 'up';
      case 'left':
        return 'right';
      case 'right':
        return 'left';
    }
  }

  updateLasers(): void {
    this.state.laserPaths = [];
    this.state.targets = this.state.targets.map((t) => ({ ...t, activated: false }));

    const rays: LaserRay[] = this.state.lightSources.map((s) => ({
      pos: { x: s.x, y: s.y },
      dir: s.direction,
      color: s.color,
      steps: 0,
      visited: new Set<string>(),
    }));

    const results: LaserSegment[] = [];

    while (rays.length > 0) {
      const ray = rays.shift()!;
      if (ray.steps >= MAX_LASER_STEPS) continue;

      const key = `${ray.pos.x},${ray.pos.y},${ray.dir}`;
      if (ray.visited.has(key)) continue;
      ray.visited.add(key);

      const delta = GameBoard.dirToDelta(ray.dir);
      let current = { ...ray.pos };
      const start = { ...current };

      while (true) {
        ray.steps++;
        if (ray.steps >= MAX_LASER_STEPS) break;

        const next: Position = {
          x: current.x + delta.x,
          y: current.y + delta.y,
        };

        if (!GameBoard.isInBounds(next, this.state.gridSize)) {
          results.push({ from: start, to: current, color: ray.color });
          break;
        }

        if (this.isWall(next)) {
          results.push({ from: start, to: next, color: ray.color });
          ray.dir = this.oppositeDir(ray.dir);
          ray.pos = { ...current };
          rays.push({ ...ray, visited: new Set(ray.visited) });
          break;
        }

        if (this.isBox(next)) {
          results.push({ from: start, to: next, color: ray.color });
          break;
        }

        const mirror = this.state.placedMirrors.find((m) =>
          GameBoard.posEq(m, next)
        );
        if (mirror) {
          results.push({ from: start, to: next, color: ray.color });
          ray.dir = this.reflectMirror(ray.dir, mirror.orientation);
          ray.pos = { ...next };
          rays.push({ ...ray, visited: new Set(ray.visited) });
          break;
        }

        const prism = this.state.placedPrisms.find((p) =>
          GameBoard.posEq(p, next)
        );
        if (prism) {
          results.push({ from: start, to: next, color: ray.color });
          const [d1, d2] = this.splitPrism(ray.dir);
          const childColor1: LightColor = ray.color === 'red' ? 'green' : ray.color;
          const childColor2: LightColor = ray.color === 'red' ? 'blue' : ray.color;
          rays.push({
            pos: { ...next },
            dir: d1,
            color: childColor1,
            steps: ray.steps,
            visited: new Set(ray.visited),
          });
          rays.push({
            pos: { ...next },
            dir: d2,
            color: childColor2,
            steps: ray.steps,
            visited: new Set(ray.visited),
          });
          break;
        }

        const target = this.state.targets.find((t) => GameBoard.posEq(t, next));
        if (target) {
          results.push({ from: start, to: next, color: ray.color });
          if (target.color === ray.color) {
            target.activated = true;
          }
          break;
        }

        current = next;
      }
    }

    this.state.laserPaths = results;
  }

  checkPlayerHit(): void {
    if (this.state.isWin || this.state.isGameOver) return;

    const playerPos = { x: this.state.player.x, y: this.state.player.y };

    for (const seg of this.state.laserPaths) {
      if (this.isPointOnSegment(playerPos, seg)) {
        this.playerHit();
        return;
      }
    }
  }

  isPointOnSegment(point: Position, seg: LaserSegment): boolean {
    const { from, to } = seg;
    if (from.x === to.x) {
      if (point.x !== from.x) return false;
      const minY = Math.min(from.y, to.y);
      const maxY = Math.max(from.y, to.y);
      return point.y >= minY && point.y <= maxY;
    } else if (from.y === to.y) {
      if (point.y !== from.y) return false;
      const minX = Math.min(from.x, to.x);
      const maxX = Math.max(from.x, to.x);
      return point.x >= minX && point.x <= maxX;
    }
    return false;
  }

  playerHit(): void {
    this.state.player.lives--;
    this.state.hitFlash = true;

    setTimeout(() => {
      this.state.hitFlash = false;
      this.emit();
    }, 500);

    this.state.player.x = this.playerStartPos.x;
    this.state.player.y = this.playerStartPos.y;

    if (this.state.player.lives <= 0) {
      this.state.isGameOver = true;
    }

    this.updateLasers();
    this.emit();
  }

  checkWin(): void {
    if (this.state.isGameOver) return;
    const allActivated = this.state.targets.every((t) => t.activated);
    if (allActivated && this.state.targets.length > 0) {
      this.state.isWin = true;
    }
  }
}
