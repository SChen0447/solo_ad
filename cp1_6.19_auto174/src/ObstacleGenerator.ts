export type ObstacleType = 'low' | 'high';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  position: number;
  beatIndex: number;
  passed: boolean;
  hit: boolean;
}

export class ObstacleGenerator {
  private beatTimes: number[] = [];
  private obstacles: Obstacle[] = [];
  private lastGeneratedBeat: number = -1;
  private obstacleIdCounter: number = 0;

  setBeatTimes(times: number[]): void {
    this.beatTimes = times;
  }

  reset(): void {
    this.obstacles = [];
    this.lastGeneratedBeat = -1;
    this.obstacleIdCounter = 0;
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  update(currentTime: number, aheadTime: number = 3): Obstacle[] {
    const targetTime = currentTime + aheadTime;
    for (let i = 0; i < this.beatTimes.length; i++) {
      if (this.beatTimes[i] > targetTime) break;
      if (i <= this.lastGeneratedBeat) continue;
      if (!this.shouldGenerate(i, currentTime)) continue;
      const type: ObstacleType = Math.random() > 0.5 ? 'low' : 'high';
      this.obstacles.push({
        id: this.obstacleIdCounter++,
        type,
        position: this.beatTimes[i],
        beatIndex: i,
        passed: false,
        hit: false,
      });
      this.lastGeneratedBeat = i;
    }
    this.obstacles = this.obstacles.filter((o) => o.position > currentTime - 2);
    return this.obstacles;
  }

  private shouldGenerate(beatIndex: number, currentTime: number): boolean {
    const elapsed = currentTime;
    let beatEvery: number;
    if (elapsed < 30) {
      beatEvery = Math.floor(4 - (elapsed / 30) * 2);
    } else {
      beatEvery = 2;
    }
    beatEvery = Math.max(2, beatEvery);
    return beatIndex % beatEvery === 0 && beatIndex >= 2;
  }

  destroy(): void {
    this.obstacles = [];
    this.beatTimes = [];
  }
}
