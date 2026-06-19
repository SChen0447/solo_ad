import * as THREE from 'three';
import type { FlowData } from './DataSimulator';

const PARTICLE_COUNT = 2500;
const CURVE_COUNT = 6;
const COLOR_BLUE = new THREE.Color(0x00d4ff);
const COLOR_RED = new THREE.Color(0xff0055);
const FADE_IN_RANGE = 0.05;
const FADE_OUT_RANGE = 0.95;

interface ParticleState {
  curveIndex: number;
  t: number;
  speed: number;
  baseSpeed: number;
  offset: THREE.Vector3;
}

export class ParticleFlow {
  readonly particleCount = PARTICLE_COUNT;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  readonly points: THREE.Points;
  private curves: THREE.CatmullRomCurve3[];
  private states: ParticleState[];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private currentMagnitude = 0;
  private currentDirection = new THREE.Vector3(1, 0, 0);
  private pathLines: THREE.Line[];

  constructor() {
    this.curves = this.createCurves();
    this.states = this.createStates();
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.pathLines = this.createPathLines();
    this.initializePositions();
  }

  getPathLines(): THREE.Line[] {
    return this.pathLines;
  }

  addToScene(scene: THREE.Scene): void {
    scene.add(this.points);
    for (const line of this.pathLines) {
      scene.add(line);
    }
  }

  onData(data: FlowData): void {
    this.currentMagnitude = data.magnitude;
    this.currentDirection.copy(data.direction);
  }

  update(delta: number): void {
    const speedMultiplier = 0.5 + this.currentMagnitude * 1.5;
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const state = this.states[i];
      const curve = this.curves[state.curveIndex];

      state.speed = state.baseSpeed * speedMultiplier;
      state.t += state.speed * delta;

      if (state.t > 1) {
        state.t -= 1;
        state.curveIndex = Math.floor(Math.random() * CURVE_COUNT);
        state.offset.set(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
        );
      }

      const point = curve.getPointAt(state.t);
      const i3 = i * 3;

      this.positions[i3] = point.x + state.offset.x;
      this.positions[i3 + 1] = point.y + state.offset.y;
      this.positions[i3 + 2] = point.z + state.offset.z;

      const magnitude = this.currentMagnitude;
      const tempColor = COLOR_BLUE.clone().lerp(COLOR_RED, magnitude);
      this.colors[i3] = tempColor.r;
      this.colors[i3 + 1] = tempColor.g;
      this.colors[i3 + 2] = tempColor.b;

      let alpha = 1.0;
      if (state.t < FADE_IN_RANGE) {
        alpha = state.t / FADE_IN_RANGE;
      } else if (state.t > FADE_OUT_RANGE) {
        alpha = (1 - state.t) / (1 - FADE_OUT_RANGE);
      }
      const particleSize = 0.1 + magnitude * 0.9;
      this.sizes[i] = particleSize * alpha;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  reset(): void {
    this.currentMagnitude = 0;
    this.currentDirection.set(1, 0, 0);
    this.states = this.createStates();
    this.initializePositions();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    for (const line of this.pathLines) {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
  }

  private createCurves(): THREE.CatmullRomCurve3[] {
    const curves: THREE.CatmullRomCurve3[] = [];
    const range = 12;

    const configs = [
      { axis: 'x', sign: 1, yOff: 0, zOff: 0 },
      { axis: 'x', sign: -1, yOff: 3, zOff: 2 },
      { axis: 'z', sign: 1, yOff: -2, zOff: 0 },
      { axis: 'z', sign: -1, yOff: 1, zOff: -3 },
      { axis: 'diag1', sign: 1, yOff: 0, zOff: 0 },
      { axis: 'diag2', sign: 1, yOff: -1, zOff: 1 },
    ];

    for (const cfg of configs) {
      const points: THREE.Vector3[] = [];
      const numPoints = 5 + Math.floor(Math.random() * 3);

      for (let j = 0; j < numPoints; j++) {
        const frac = j / (numPoints - 1);
        let x = 0, y = 0, z = 0;

        if (cfg.axis === 'x') {
          x = (frac * 2 - 1) * range * cfg.sign;
          y = cfg.yOff + Math.sin(frac * Math.PI * 2) * 2 + (Math.random() - 0.5) * 1.5;
          z = cfg.zOff + Math.cos(frac * Math.PI * 1.5) * 3 + (Math.random() - 0.5) * 1.5;
        } else if (cfg.axis === 'z') {
          x = cfg.zOff + Math.cos(frac * Math.PI * 1.5) * 3 + (Math.random() - 0.5) * 1.5;
          y = cfg.yOff + Math.sin(frac * Math.PI * 2) * 2 + (Math.random() - 0.5) * 1.5;
          z = (frac * 2 - 1) * range * cfg.sign;
        } else if (cfg.axis === 'diag1') {
          x = (frac * 2 - 1) * range;
          y = cfg.yOff + Math.sin(frac * Math.PI * 2.5) * 3;
          z = (frac * 2 - 1) * range * 0.6;
        } else {
          x = -(frac * 2 - 1) * range * 0.7;
          y = cfg.yOff + Math.cos(frac * Math.PI * 2) * 2.5;
          z = (frac * 2 - 1) * range;
        }

        points.push(new THREE.Vector3(x, y, z));
      }

      curves.push(new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5));
    }

    return curves;
  }

  private createStates(): ParticleState[] {
    const states: ParticleState[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const baseSpeed = 0.03 + Math.random() * 0.04;
      states.push({
        curveIndex: Math.floor(Math.random() * CURVE_COUNT),
        t: Math.random(),
        speed: baseSpeed,
        baseSpeed,
        offset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
        ),
      });
    }
    return states;
  }

  private initializePositions(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const state = this.states[i];
      const curve = this.curves[state.curveIndex];
      const point = curve.getPointAt(state.t);
      const i3 = i * 3;
      this.positions[i3] = point.x + state.offset.x;
      this.positions[i3 + 1] = point.y + state.offset.y;
      this.positions[i3 + 2] = point.z + state.offset.z;

      this.colors[i3] = COLOR_BLUE.r;
      this.colors[i3 + 1] = COLOR_BLUE.g;
      this.colors[i3 + 2] = COLOR_BLUE.b;

      this.sizes[i] = 0.1;
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private createPathLines(): THREE.Line[] {
    const lines: THREE.Line[] = [];
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    for (const curve of this.curves) {
      const pts = curve.getPoints(100);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      lines.push(line);
    }

    return lines;
  }
}
