export interface WindFieldParams {
  windSpeed: number;
  windDirection: number;
  turbulence: number;
}

export class WindField {
  private params: WindFieldParams;
  private time: number = 0;
  private perm: number[];

  constructor(params: WindFieldParams) {
    this.params = { ...params };
    this.perm = this.generatePermutation();
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

  private noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x - 1, y, z), u),
        this.lerp(this.grad(this.perm[AB], x, y - 1, z), this.grad(this.perm[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(this.perm[AA + 1], x, y, z - 1), this.grad(this.perm[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(this.perm[AB + 1], x, y - 1, z - 1), this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  public setParams(params: Partial<WindFieldParams>): void {
    Object.assign(this.params, params);
  }

  public getWindVelocity(x: number, y: number, z: number): { x: number; y: number; z: number } {
    const { windSpeed, windDirection, turbulence } = this.params;

    const angleRad = (windDirection * Math.PI) / 180;
    const baseWindX = Math.cos(angleRad) * windSpeed;
    const baseWindZ = Math.sin(angleRad) * windSpeed;

    const scale = 0.05;
    const timeScale = 0.5;
    const t = this.time * timeScale;

    const noiseX = this.noise3D(x * scale, y * scale, z * scale + t);
    const noiseY = this.noise3D(x * scale + 100, y * scale, z * scale + t);
    const noiseZ = this.noise3D(x * scale + 200, y * scale, z * scale + t);

    const turbulenceFactor = turbulence * windSpeed * 0.5;

    return {
      x: baseWindX + noiseX * turbulenceFactor,
      y: noiseY * turbulenceFactor * 0.3,
      z: baseWindZ + noiseZ * turbulenceFactor
    };
  }

  public update(delta: number): void {
    this.time += delta;
  }

  public getParams(): WindFieldParams {
    return { ...this.params };
  }
}

export default WindField;
