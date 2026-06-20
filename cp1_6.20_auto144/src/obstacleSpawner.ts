import { Obstacle, BeatEvent, MazeData, OBSTACLE_RADIUS, BASE_OBSTACLE_SPEED, CELL_SIZE, MazeCell } from './types';
import { AudioEngine } from './audioEngine';
import { MazeGenerator } from './mazeGenerator';

export class ObstacleSpawner {
  private obstacles: Obstacle[] = [];
  private nextId: number = 0;
  private audioEngine: AudioEngine;
  private mazeGenerator: MazeGenerator;
  private mazeData: MazeData | null = null;
  private lastBeatCount: number = 0;
  private currentBPM: number = 120;
  private beatIntensity: number = 0.5;
  private playerPosition: { x: number; z: number } = { x: 0, z: 0 };

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
    this.mazeGenerator = new MazeGenerator();
    this.setupListeners();
  }

  private setupListeners(): void {
    this.audioEngine.on('beat', (event: BeatEvent) => {
      this.currentBPM = event.bpm;
      this.beatIntensity = event.intensity;
    });

    this.audioEngine.on('beatCount', (count: number) => {
      if (count % 4 === 0 && count !== this.lastBeatCount) {
        this.lastBeatCount = count;
        this.spawnWave();
      }
    });

    this.audioEngine.on('bpm', (bpm: number) => {
      this.currentBPM = bpm;
    });
  }

  setMazeData(mazeData: MazeData): void {
    this.mazeData = mazeData;
  }

  setPlayerPosition(pos: { x: number; z: number }): void {
    this.playerPosition = { ...pos };
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  clear(): void {
    this.obstacles = [];
    this.lastBeatCount = 0;
  }

  private spawnWave(): void {
    if (!this.mazeData) return;

    const obstacleCount = Math.min(2 + Math.floor(this.currentBPM / 60), 6);

    for (let i = 0; i < obstacleCount; i++) {
      const obstacle = this.createObstacle();
      if (obstacle) {
        this.obstacles.push(obstacle);
      }
    }
  }

  private createObstacle(): Obstacle | null {
    if (!this.mazeData) return null;

    const passage = this.findSpawnPassage();
    if (!passage) return null;

    const worldPos = this.mazeGenerator.gridToWorld(passage.x, passage.z, this.mazeData);
    const direction = this.chooseDirection(passage);

    if (!direction) return null;

    const speedMultiplier = 1 + this.beatIntensity * 1.5;
    const bpmMultiplier = this.currentBPM / 120;
    const baseSpeed = BASE_OBSTACLE_SPEED * 60;

    return {
      id: this.nextId++,
      position: { x: worldPos.x, z: worldPos.z },
      direction,
      speed: baseSpeed * speedMultiplier * bpmMultiplier,
      baseSpeed,
      radius: OBSTACLE_RADIUS,
      life: 8
    };
  }

  private findSpawnPassage(): MazeCell | null {
    if (!this.mazeData) return null;

    const validPassages = this.mazeData.passages.filter(p => {
      const worldPos = this.mazeGenerator.gridToWorld(p.x, p.z, this.mazeData);
      const dx = worldPos.x - this.playerPosition.x;
      const dz = worldPos.z - this.playerPosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      return dist > 3 && dist < 10;
    });

    if (validPassages.length === 0) {
      if (this.mazeData.passages.length === 0) return null;
      return this.mazeData.passages[Math.floor(Math.random() * this.mazeData.passages.length)];
    }

    return validPassages[Math.floor(Math.random() * validPassages.length)];
  }

  private chooseDirection(passage: MazeCell): { x: number; z: number } | null {
    if (!this.mazeData) return null;

    const directions = [
      { x: 1, z: 0 },
      { x: -1, z: 0 },
      { x: 0, z: 1 },
      { x: 0, z: -1 }
    ];

    const validDirections: { x: number; z: number }[] = [];

    for (const dir of directions) {
      const nx = passage.x + dir.x;
      const nz = passage.z + dir.z;
      const isPassage = this.mazeData.passages.some(p => p.x === nx && p.z === nz);
      if (isPassage) {
        validDirections.push(dir);
      }
    }

    if (validDirections.length === 0) return null;

    return validDirections[Math.floor(Math.random() * validDirections.length)];
  }

  update(dt: number): void {
    if (!this.mazeData) return;

    const speedMultiplier = 1 + this.beatIntensity * 1.5;
    const bpmMultiplier = this.currentBPM / 120;

    const toRemove: number[] = [];

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      
      obs.speed = obs.baseSpeed * speedMultiplier * bpmMultiplier;

      const moveSpeed = obs.speed * dt;
      const newX = obs.position.x + obs.direction.x * moveSpeed;
      const newZ = obs.position.z + obs.direction.z * moveSpeed;

      const hitWall = this.mazeGenerator.isWall(newX, newZ, this.mazeData);

      if (hitWall) {
        let bounced = false;
        const altDirections = [
          { x: -obs.direction.x, z: obs.direction.z },
          { x: obs.direction.x, z: -obs.direction.z },
          { x: -obs.direction.x, z: -obs.direction.z }
        ];

        for (const altDir of altDirections) {
          const altX = obs.position.x + altDir.x * moveSpeed;
          const altZ = obs.position.z + altDir.z * moveSpeed;
          if (!this.mazeGenerator.isWall(altX, altZ, this.mazeData)) {
            obs.direction = altDir;
            obs.position.x = altX;
            obs.position.z = altZ;
            bounced = true;
            break;
          }
        }

        if (!bounced) {
          obs.life -= dt * 2;
        }
      } else {
        obs.position.x = newX;
        obs.position.z = newZ;
      }

      obs.life -= dt;
      if (obs.life <= 0) {
        toRemove.push(obs.id);
      }
    }

    if (toRemove.length > 0) {
      this.obstacles = this.obstacles.filter(o => !toRemove.includes(o.id));
    }
  }

  destroy(): void {
    this.clear();
  }
}
