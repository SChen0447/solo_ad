import * as THREE from 'three';

export class WindField {
  private windSpeed: number = 8;
  private windDirection: number = 45;
  private turbulence: number = 0.3;
  private time: number = 0;
  private permutation: number[];

  constructor() {
    this.permutation = this.generatePermutation();
  }

  private generatePermutation(): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.permutation[X] + Y;
    const AA = this.permutation[A] + Z;
    const AB = this.permutation[A + 1] + Z;
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B] + Z;
    const BB = this.permutation[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(this.grad(this.permutation[AA], x, y, z), this.grad(this.permutation[BA], x - 1, y, z), u),
        this.lerp(this.grad(this.permutation[AB], x, y - 1, z), this.grad(this.permutation[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(this.permutation[AA + 1], x, y, z - 1), this.grad(this.permutation[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(this.permutation[AB + 1], x, y - 1, z - 1), this.grad(this.permutation[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  private fbm(x: number, y: number, z: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < 4; i++) {
      value += amplitude * this.noise(x * frequency, y * frequency, z * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }

  public setWindSpeed(speed: number): void {
    this.windSpeed = speed;
  }

  public setWindDirection(direction: number): void {
    this.windDirection = direction;
  }

  public setTurbulence(turbulence: number): void {
    this.turbulence = turbulence;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime * 0.5;
  }

  public getWindAt(x: number, y: number, z: number): THREE.Vector3 {
    const dirRad = (this.windDirection * Math.PI) / 180;
    const baseX = Math.cos(dirRad);
    const baseZ = Math.sin(dirRad);

    const scale = 0.08;
    const timeOffset = this.time * 0.3;

    const noiseX = this.fbm(x * scale + timeOffset, y * scale * 0.5, z * scale);
    const noiseY = this.fbm(x * scale, y * scale * 0.5 + timeOffset, z * scale + 100);
    const noiseZ = this.fbm(x * scale, y * scale * 0.5, z * scale + timeOffset + 200);

    const turbX = noiseX * this.turbulence * 3;
    const turbY = noiseY * this.turbulence * 1.5;
    const turbZ = noiseZ * this.turbulence * 3;

    const speedMultiplier = this.windSpeed / 8;

    return new THREE.Vector3(
      (baseX + turbX) * this.windSpeed * speedMultiplier,
      turbY * this.windSpeed * 0.3,
      (baseZ + turbZ) * this.windSpeed * speedMultiplier
    );
  }
}
