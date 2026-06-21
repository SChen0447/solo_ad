import * as THREE from 'three';

export interface OrbitParams {
  semiMajorAxis: number;
  eccentricity: number;
  color?: number;
  opacity?: number;
}

export class Orbit {
  public line: THREE.Line;
  private semiMajorAxis: number;
  private eccentricity: number;
  private segments: number = 256;

  constructor(params: OrbitParams) {
    this.semiMajorAxis = params.semiMajorAxis;
    this.eccentricity = params.eccentricity;

    const color = params.color ?? 0x6666aa;
    const opacity = params.opacity ?? 0.25;

    const geometry = this.createGeometry();
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
    });

    this.line = new THREE.Line(geometry, material);
    this.line.renderOrder = -1;
  }

  private createGeometry(): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    const a = this.semiMajorAxis;
    const b = a * Math.sqrt(1 - this.eccentricity * this.eccentricity);
    const focusOffset = a * this.eccentricity;

    for (let i = 0; i <= this.segments; i++) {
      const theta = (i / this.segments) * Math.PI * 2;
      const x = a * Math.cos(theta) - focusOffset;
      const z = b * Math.sin(theta);
      points.push(new THREE.Vector3(x, 0, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.line.position.set(x, y, z);
  }

  public getOrbitPosition(angle: number): THREE.Vector3 {
    const a = this.semiMajorAxis;
    const b = a * Math.sqrt(1 - this.eccentricity * this.eccentricity);
    const focusOffset = a * this.eccentricity;
    const x = a * Math.cos(angle) - focusOffset;
    const z = b * Math.sin(angle);
    return new THREE.Vector3(x, 0, z);
  }

  public dispose(): void {
    this.line.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
  }
}
