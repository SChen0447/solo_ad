import * as THREE from 'three';
import { ParticleData } from './fluidSimulator';

interface ColorHSL {
  h: number;
  s: number;
  l: number;
}

export class ParticleSystem {
  private mesh: THREE.InstancedMesh;
  private count: number;
  private particleRadius: number;
  private dummy: THREE.Object3D;
  private colors: Float32Array;
  private originalColors: ColorHSL[];
  private targetColors: ColorHSL[];
  private isPaused: boolean;
  private pauseTransition: number;
  private colorTransition: number;
  private minVelocity: number;
  private maxVelocity: number;

  constructor(count: number, particleRadius: number) {
    this.count = count;
    this.particleRadius = particleRadius;
    this.dummy = new THREE.Object3D();
    this.isPaused = false;
    this.pauseTransition = 1.0;
    this.colorTransition = 1.0;
    this.minVelocity = 0;
    this.maxVelocity = 10;

    this.colors = new Float32Array(count * 3);
    this.originalColors = new Array(count);
    this.targetColors = new Array(count);

    this.mesh = this.createInstancedMesh();
    this.initializeColors();
  }

  private createInstancedMesh(): THREE.InstancedMesh {
    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    const instancedMesh = new THREE.InstancedMesh(geometry, material, this.count);
    instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(this.colors, 3);

    return instancedMesh;
  }

  private initializeColors(): void {
    for (let i = 0; i < this.count; i++) {
      this.originalColors[i] = { h: 0.5, s: 1.0, l: 0.5 };
      this.targetColors[i] = { h: 0.5, s: 1.0, l: 0.5 };
      this.setColor(i, 0.0, 1.0, 0.5);
    }
    this.mesh.instanceColor!.needsUpdate = true;
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
  }

  private lerpHsl(a: ColorHSL, b: ColorHSL, t: number): ColorHSL {
    let dh = b.h - a.h;
    if (dh > 0.5) dh -= 1;
    if (dh < -0.5) dh += 1;
    return {
      h: a.h + dh * t,
      s: a.s + (b.s - a.s) * t,
      l: a.l + (b.l - a.l) * t
    };
  }

  private setColor(index: number, h: number, s: number, l: number): void {
    const [r, g, b] = this.hslToRgb(h, s, l);
    this.colors[index * 3] = r;
    this.colors[index * 3 + 1] = g;
    this.colors[index * 3 + 2] = b;
  }

  private getVelocityColor(speed: number): ColorHSL {
    const normalizedSpeed = Math.min(Math.max((speed - this.minVelocity) / (this.maxVelocity - this.minVelocity), 0), 1);
    const hue = 0.5 - normalizedSpeed * 0.42;
    return { h: hue, s: 1.0, l: 0.5 };
  }

  public getMesh(): THREE.InstancedMesh {
    return this.mesh;
  }

  public setParticleRadius(radius: number): void {
    this.particleRadius = radius;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public setTargetColors(baseHue: number): void {
    for (let i = 0; i < this.count; i++) {
      this.targetColors[i] = { h: baseHue, s: 1.0, l: 0.5 };
    }
    this.colorTransition = 0;
  }

  public update(particleData: ParticleData, deltaTime: number): void {
    const { position, velocity, count } = particleData;

    if (this.isPaused) {
      this.pauseTransition = Math.max(0, this.pauseTransition - deltaTime * 2);
    } else {
      this.pauseTransition = Math.min(1, this.pauseTransition + deltaTime * 2);
    }

    if (this.colorTransition < 1.0) {
      this.colorTransition += deltaTime / 2.0;
      if (this.colorTransition > 1.0) this.colorTransition = 1.0;
    }

    let velSum = 0;

    for (let i = 0; i < count; i++) {
      this.dummy.position.set(
        position[i * 3],
        position[i * 3 + 1],
        position[i * 3 + 2]
      );
      this.dummy.scale.setScalar(this.particleRadius);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      const vx = velocity[i * 3];
      const vy = velocity[i * 3 + 1];
      const vz = velocity[i * 3 + 2];
      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      velSum += speed;

      const velocityColor = this.getVelocityColor(speed);

      let finalColor: ColorHSL;
      if (this.colorTransition < 1.0) {
        const targetColor = this.lerpHsl(this.originalColors[i], this.targetColors[i], this.colorTransition);
        finalColor = {
          h: targetColor.h,
          s: targetColor.s * (0.2 + 0.8 * this.pauseTransition),
          l: targetColor.l
        };
      } else {
        const dynamicHue = velocityColor.h * 0.3 + this.targetColors[i].h * 0.7;
        finalColor = {
          h: dynamicHue,
          s: velocityColor.s * (0.2 + 0.8 * this.pauseTransition),
          l: velocityColor.l
        };
      }

      this.originalColors[i] = { h: finalColor.h, s: finalColor.s, l: finalColor.l };
      this.setColor(i, finalColor.h, finalColor.s, finalColor.l);
    }

    const avgVel = velSum / count;
    this.minVelocity = Math.min(this.minVelocity, avgVel * 0.5);
    this.maxVelocity = Math.max(this.maxVelocity, avgVel * 1.5);

    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
