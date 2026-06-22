export interface WindVector {
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
  w: number;
  speed: number;
}

export interface WindGridData {
  scene: string;
  description: string;
  timeStep: number;
  gridSize: { nx: number; ny: number; nz: number };
  bounds: {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    zMin: number; zMax: number;
  };
  vectors: WindVector[];
  timestamp: number;
}

export type SceneType = 'typhoon' | 'monsoon' | 'valley';

const SCALE = 0.1;

export class WindDataGenerator {
  private currentScene: SceneType = 'typhoon';
  private time: number = 0;
  private isDaytime: boolean = true;
  private dayNightTimer: number = 0;

  constructor() {}

  setScene(scene: SceneType) {
    this.currentScene = scene;
    this.time = 0;
    this.isDaytime = true;
    this.dayNightTimer = 0;
  }

  getSceneInfo(scene: SceneType): { name: string; description: string } {
    switch (scene) {
      case 'typhoon':
        return {
          name: '台风场景',
          description: '中心风速50m/s，逆时针旋转，漩涡状矢量场',
        };
      case 'monsoon':
        return {
          name: '季风场景',
          description: '大范围单向流，高度层1000m以上风向转向',
        };
      case 'valley':
        return {
          name: '山谷风场景',
          description: '昼夜交替模式，白天从谷底向上吹，晚上相反',
        };
      default:
        return { name: '未知场景', description: '' };
    }
  }

  generateWindField(scene?: SceneType): WindGridData {
    if (scene) this.currentScene = scene;

    const nx = 20;
    const ny = 20;
    const nz = 11;
    const xMin = -100, xMax = 100;
    const yMin = -100, yMax = 100;
    const zMin = 0, zMax = 5000 * SCALE;

    const vectors: WindVector[] = [];
    const dx = (xMax - xMin) / (nx - 1);
    const dy = (yMax - yMin) / (ny - 1);
    const dz = (zMax - zMin) / (nz - 1);

    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        for (let k = 0; k < nz; k++) {
          const x = xMin + i * dx;
          const y = yMin + j * dy;
          const z = zMin + k * dz;

          let u = 0, v = 0, w = 0;

          switch (this.currentScene) {
            case 'typhoon':
              ({ u, v, w } = this.computeTyphoon(x, y, z));
              break;
            case 'monsoon':
              ({ u, v, w } = this.computeMonsoon(x, y, z));
              break;
            case 'valley':
              ({ u, v, w } = this.computeValley(x, y, z));
              break;
          }

          const speed = Math.sqrt(u * u + v * v + w * w);
          vectors.push({ x, y, z, u, v, w, speed });
        }
      }
    }

    const info = this.getSceneInfo(this.currentScene);
    return {
      scene: this.currentScene,
      description: info.description,
      timeStep: this.time,
      gridSize: { nx, ny, nz },
      bounds: { xMin, xMax, yMin, yMax, zMin, zMax },
      vectors,
      timestamp: Date.now(),
    };
  }

  generateIncrementalUpdate(): Partial<WindGridData> & { vectors: WindVector[]; type: 'incremental' } {
    this.time += 0.05;
    this.dayNightTimer += 0.2;
    if (this.dayNightTimer > 30) {
      this.dayNightTimer = 0;
      this.isDaytime = !this.isDaytime;
    }

    const nx = 20;
    const ny = 20;
    const nz = 11;
    const xMin = -100, xMax = 100;
    const yMin = -100, yMax = 100;
    const zMin = 0, zMax = 5000 * SCALE;

    const vectors: WindVector[] = [];
    const dx = (xMax - xMin) / (nx - 1);
    const dy = (yMax - yMin) / (ny - 1);
    const dz = (zMax - zMin) / (nz - 1);

    const sampleRate = 2;
    for (let i = 0; i < nx; i += sampleRate) {
      for (let j = 0; j < ny; j += sampleRate) {
        for (let k = 0; k < nz; k += sampleRate) {
          const x = xMin + i * dx;
          const y = yMin + j * dy;
          const z = zMin + k * dz;

          let u = 0, v = 0, w = 0;

          switch (this.currentScene) {
            case 'typhoon':
              ({ u, v, w } = this.computeTyphoon(x, y, z));
              break;
            case 'monsoon':
              ({ u, v, w } = this.computeMonsoon(x, y, z));
              break;
            case 'valley':
              ({ u, v, w } = this.computeValley(x, y, z));
              break;
          }

          const speed = Math.sqrt(u * u + v * v + w * w);
          vectors.push({ x, y, z, u, v, w, speed });
        }
      }
    }

    return {
      type: 'incremental',
      timeStep: this.time,
      vectors,
      timestamp: Date.now(),
    };
  }

  private computeTyphoon(x: number, y: number, z: number): { u: number; v: number; w: number } {
    const centerX = 0;
    const centerY = 0;
    const r = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    const maxSpeed = 50;
    const eyeRadius = 20;
    const decayRate = 0.02;

    let tangentialSpeed = 0;
    if (r < eyeRadius) {
      tangentialSpeed = maxSpeed * (r / eyeRadius);
    } else {
      tangentialSpeed = maxSpeed * Math.exp(-decayRate * (r - eyeRadius));
    }

    tangentialSpeed *= 1 + 0.1 * Math.sin(this.time + r * 0.05);

    const angle = Math.atan2(y - centerY, x - centerX);
    const u = -tangentialSpeed * Math.sin(angle);
    const v = tangentialSpeed * Math.cos(angle);
    const w = r < eyeRadius ? -2 * (1 - r / eyeRadius) : 0.5 * Math.sin(this.time * 0.5 + z);

    return { u: u * SCALE, v: v * SCALE, w: w * SCALE };
  }

  private computeMonsoon(x: number, y: number, z: number): { u: number; v: number; w: number } {
    const heightThreshold = 1000 * SCALE;
    const baseSpeed = 15;

    let u: number, v: number;
    if (z < heightThreshold) {
      u = baseSpeed + 5 * Math.sin(this.time * 0.3 + x * 0.02);
      v = baseSpeed * 0.3 + 3 * Math.cos(this.time * 0.2 + y * 0.02);
    } else {
      const turnFactor = Math.min(1, (z - heightThreshold) / (2000 * SCALE));
      const angle = turnFactor * Math.PI * 0.6;
      const speed = baseSpeed * (1 + 0.3 * (z / (5000 * SCALE)));
      u = speed * Math.cos(angle) + 4 * Math.sin(this.time * 0.4 + z * 0.1);
      v = -speed * Math.sin(angle) + 3 * Math.cos(this.time * 0.3 + x * 0.02);
    }

    const w = 2 * Math.sin(this.time * 0.5 + x * 0.03 + y * 0.03) + 1 * (z / (5000 * SCALE));

    return { u: u * SCALE, v: v * SCALE, w: w * SCALE };
  }

  private computeValley(x: number, y: number, z: number): { u: number; v: number; w: number } {
    const valleyFloor = Math.abs(x) * 0.5;
    const maxHeight = 5000 * SCALE;
    const baseSpeed = this.isDaytime ? 8 : 6;

    let w: number;
    if (this.isDaytime) {
      w = baseSpeed * (1 - Math.abs(z - maxHeight * 0.3) / (maxHeight * 0.5));
      w = Math.max(0, w);
    } else {
      w = -baseSpeed * (1 - Math.abs(z - maxHeight * 0.7) / (maxHeight * 0.5));
      w = Math.min(0, w);
    }

    w += 2 * Math.sin(this.time * 0.6 + z * 0.05);

    const alongValley = Math.sign(y || 1) * baseSpeed * 0.5;
    const crossValley = -x * 0.05 * baseSpeed;

    const terrainFactor = Math.max(0, 1 - (z - valleyFloor) / (maxHeight - valleyFloor));
    const u = crossValley * terrainFactor + 3 * Math.sin(this.time * 0.4 + y * 0.03);
    const v = alongValley * terrainFactor + 2 * Math.cos(this.time * 0.3 + x * 0.03);

    return { u: u * SCALE, v: v * SCALE, w: w * SCALE };
  }
}
