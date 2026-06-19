import { Player } from './Player';

export type ObstacleType = 'spike' | 'lowWall' | 'highBar';
export type CoinType = 'normal' | 'beat';
export type GameObjectType = ObstacleType | CoinType;

export interface GameObject {
  x: number;
  y: number;
  type: GameObjectType;
  width: number;
  height: number;
  isActive: boolean;
  warningStartTime: number;
  spawnTime: number;
  collected: boolean;
  animProgress: number;
  rotation: number;
}

export interface ScorePopup {
  x: number;
  y: number;
  value: number;
  startTime: number;
  duration: number;
}

export class ObstacleManager {
  private objects: GameObject[] = [];
  private scorePopups: ScorePopup[] = [];
  private speed = 300;
  private lastBeatIndex = -1;
  private canvasWidth: number;
  private canvasHeight: number;
  private groundY: number;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private onScoreChange: ((score: number, combo: number) => void) | null = null;
  private warningDuration = 0.3;
  private warningLeadTime = 0.1;
  private unitSize: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.75;
    this.unitSize = Math.min(canvasHeight, canvasWidth) * 0.06;
  }

  setOnScoreChange(cb: (score: number, combo: number) => void): void {
    this.onScoreChange = cb;
  }

  onBeat(beatIndex: number, currentTime: number, gameSpeed: number): void {
    if (beatIndex <= this.lastBeatIndex) return;
    this.lastBeatIndex = beatIndex;

    const spawnX = this.canvasWidth + 50;
    const difficulty = Math.min(this.score / 500, 1);

    const shouldSpawn = Math.random() < 0.5 + difficulty * 0.3;
    if (!shouldSpawn) return;

    const isCoinBeat = Math.random() < 0.4;
    if (isCoinBeat) {
      const isBeatCoin = Math.random() < 0.2;
      const coinType: CoinType = isBeatCoin ? 'beat' : 'normal';
      const coinSize = this.unitSize * 0.7;
      this.objects.push({
        x: spawnX,
        y: this.groundY - coinSize - (coinType === 'beat' ? this.unitSize * 0.5 : 0),
        type: coinType,
        width: coinSize,
        height: coinSize,
        isActive: false,
        warningStartTime: currentTime - this.warningLeadTime,
        spawnTime: currentTime,
        collected: false,
        animProgress: 0,
        rotation: 0,
      });
    } else {
      const types: ObstacleType[] = ['spike', 'lowWall', 'highBar'];
      const weights = [0.3, 0.4, 0.3];
      const r = Math.random();
      let type: ObstacleType = 'lowWall';
      let cumWeight = 0;
      for (let i = 0; i < types.length; i++) {
        cumWeight += weights[i];
        if (r < cumWeight) {
          type = types[i];
          break;
        }
      }

      let objWidth = this.unitSize;
      let objHeight = this.unitSize;
      let objY = this.groundY;

      switch (type) {
        case 'spike':
          objWidth = this.unitSize * 0.8;
          objHeight = this.unitSize * 1.0;
          objY = this.groundY - objHeight;
          break;
        case 'lowWall':
          objWidth = this.unitSize * 1.2;
          objHeight = this.unitSize * 0.6;
          objY = this.groundY - objHeight;
          break;
        case 'highBar':
          objWidth = this.unitSize * 2.0;
          objHeight = this.unitSize * 0.2;
          objY = this.groundY - this.unitSize * 0.8;
          break;
      }

      this.objects.push({
        x: spawnX,
        y: objY,
        type,
        width: objWidth,
        height: objHeight,
        isActive: false,
        warningStartTime: currentTime - this.warningLeadTime,
        spawnTime: currentTime,
        collected: false,
        animProgress: 0,
        rotation: 0,
      });
    }
  }

  update(currentTime: number, dt: number, player: Player, gameSpeed: number): boolean {
    this.speed = gameSpeed;
    let hitSpike = false;

    this.objects = this.objects.filter((obj) => {
      obj.x -= this.speed * dt;
      obj.animProgress += dt;

      const timeSinceWarning = currentTime - obj.warningStartTime;
      if (timeSinceWarning >= this.warningDuration) {
        obj.isActive = true;
      }

      if (obj.type === 'normal' || obj.type === 'beat') {
        obj.rotation += dt * 4;
      }

      const playerBox = player.getCollisionBox();

      if (obj.isActive && !obj.collected) {
        if (this.checkCollision(playerBox, obj)) {
          if (obj.type === 'normal' || obj.type === 'beat') {
            obj.collected = true;
            const points = obj.type === 'beat' ? 50 : 10;
            this.score += points;
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            this.scorePopups.push({
              x: obj.x,
              y: obj.y,
              value: points,
              startTime: currentTime,
              duration: 0.5,
            });
            if (this.onScoreChange) {
              this.onScoreChange(this.score, this.combo);
            }
          } else if (obj.type === 'spike') {
            hitSpike = true;
          } else if (obj.type === 'lowWall') {
            if (!player.getState().isJumping) {
              hitSpike = true;
            }
          } else if (obj.type === 'highBar') {
            if (!player.getState().isSliding) {
              hitSpike = true;
            }
          }
        }
      }

      return obj.x + obj.width > -50;
    });

    this.scorePopups = this.scorePopups.filter((p) => {
      return currentTime - p.startTime < p.duration;
    });

    return hitSpike;
  }

  private checkCollision(
    a: { x: number; y: number; width: number; height: number },
    b: GameObject
  ): boolean {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  getObjects(): GameObject[] {
    return this.objects;
  }

  getScorePopups(): ScorePopup[] {
    return this.scorePopups;
  }

  getScore(): number {
    return this.score;
  }

  getCombo(): number {
    return this.combo;
  }

  resetCombo(): void {
    this.combo = 0;
  }

  reset(): void {
    this.objects = [];
    this.scorePopups = [];
    this.lastBeatIndex = -1;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.75;
    this.unitSize = Math.min(canvasHeight, canvasWidth) * 0.06;
  }
}
