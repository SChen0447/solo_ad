import * as THREE from 'three';
import type { FlowData } from './DataSimulator';

const PARTICLE_COUNT = 2500;
const CURVE_COUNT = 5;
const COLOR_BLUE = new THREE.Color(0x00d4ff);
const COLOR_RED = new THREE.Color(0xff0055);
const FADE_IN_END = 0.10;
const FADE_OUT_START = 0.90;

const _tempColor = new THREE.Color();

interface ParticleState {
  curveIndex: number;
  t: number;
  speed: number;
  baseSpeed: number;
  offset: THREE.Vector3;
  localMagnitude: number;
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
    this.colors = new Float32Array(PARTICLE_COUNT * 4);
    this.sizes = new Float32Array(PARTICLE_COUNT);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.pathLines = this.createPathLines();
    this.initializePositions();
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

      state.localMagnitude += (this.currentMagnitude - state.localMagnitude) * 0.08;
      state.speed = state.baseSpeed * speedMultiplier;
      state.t += state.speed * delta;

      if (state.t > 1) {
        state.t -= 1;
        state.curveIndex = Math.floor(Math.random() * CURVE_COUNT);
        state.offset.set(
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6,
        );
      }

      const clampedT = Math.min(Math.max(state.t, 0), 0.999);
      const point = curve.getPointAt(clampedT);
      const i4 = i * 4;
      const i3 = i * 3;

      this.positions[i3] = point.x + state.offset.x;
      this.positions[i3 + 1] = point.y + state.offset.y;
      this.positions[i3 + 2] = point.z + state.offset.z;

      const mag = state.localMagnitude;
      _tempColor.copy(COLOR_BLUE).lerp(COLOR_RED, mag);
      this.colors[i4] = _tempColor.r;
      this.colors[i4 + 1] = _tempColor.g;
      this.colors[i4 + 2] = _tempColor.b;

      let alpha = 1.0;
      if (state.t < FADE_IN_END) {
        alpha = state.t / FADE_IN_END;
      } else if (state.t > FADE_OUT_START) {
        alpha = (1 - state.t) / (1 - FADE_OUT_START);
      }
      this.colors[i4 + 3] = alpha;

      const particleSize = 0.1 + mag * 0.9;
      this.sizes[i] = particleSize;
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
    const R = 12;

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-R, -R * 0.6, R * 0.8),
      new THREE.Vector3(-R * 0.6, R * 0.4, R * 0.3),
      new THREE.Vector3(-R * 0.2, -R * 0.8, -R * 0.2),
      new THREE.Vector3(R * 0.3, R * 0.7, -R * 0.7),
      new THREE.Vector3(R * 0.7, -R * 0.3, R * 0.5),
      new THREE.Vector3(R, R * 0.5, -R * 0.4),
      new THREE.Vector3(R * 0.4, -R * 0.5, -R * 0.6),
    ], false, 'catmullrom', 0.5));

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(R * 0.8, -R, R * 0.7),
      new THREE.Vector3(-R * 0.3, -R * 0.5, R * 0.2),
      new THREE.Vector3(R * 0.5, 0, -R * 0.4),
      new THREE.Vector3(-R * 0.7, R * 0.4, R * 0.6),
      new THREE.Vector3(R * 0.2, R * 0.8, -R * 0.7),
      new THREE.Vector3(-R * 0.5, -R * 0.3, R * 0.4),
      new THREE.Vector3(R * 0.6, R * 0.6, -R * 0.2),
    ], false, 'catmullrom', 0.5));

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-R * 0.9, R * 0.7, -R * 0.8),
      new THREE.Vector3(R * 0.2, R * 0.2, -R * 0.3),
      new THREE.Vector3(-R * 0.5, -R * 0.6, R * 0.5),
      new THREE.Vector3(R * 0.8, -R * 0.2, -R * 0.6),
      new THREE.Vector3(-R * 0.3, R * 0.5, R * 0.7),
      new THREE.Vector3(R * 0.5, -R * 0.7, -R * 0.5),
      new THREE.Vector3(-R * 0.7, R * 0.3, R * 0.3),
    ], false, 'catmullrom', 0.5));

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(R, R * 0.8, R * 0.6),
      new THREE.Vector3(-R * 0.5, R * 0.1, -R * 0.7),
      new THREE.Vector3(R * 0.3, -R * 0.8, R * 0.2),
      new THREE.Vector3(-R * 0.8, -R * 0.4, -R * 0.8),
      new THREE.Vector3(R * 0.6, R * 0.6, R * 0.4),
      new THREE.Vector3(-R * 0.2, -R * 0.6, -R * 0.3),
      new THREE.Vector3(R * 0.4, R * 0.4, -R * 0.5),
    ], false, 'catmullrom', 0.5));

    curves.push(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-R * 0.6, -R * 0.9, -R * 0.7),
      new THREE.Vector3(R * 0.7, -R * 0.3, R * 0.8),
      new THREE.Vector3(-R * 0.4, R * 0.5, -R * 0.5),
      new THREE.Vector3(R * 0.5, R * 0.8, R * 0.3),
      new THREE.Vector3(-R * 0.8, 0, -R * 0.8),
      new THREE.Vector3(R * 0.3, -R * 0.5, R * 0.5),
      new THREE.Vector3(-R * 0.5, R * 0.7, R * 0.4),
    ], false, 'catmullrom', 0.5));

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
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6,
        ),
        localMagnitude: 0,
      });
    }
    return states;
  }

  private initializePositions(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const state = this.states[i];
      const curve = this.curves[state.curveIndex];
      const clampedT = Math.min(Math.max(state.t, 0), 0.999);
      const point = curve.getPointAt(clampedT);
      const i4 = i * 4;
      const i3 = i * 3;
      this.positions[i3] = point.x + state.offset.x;
      this.positions[i3 + 1] = point.y + state.offset.y;
      this.positions[i3 + 2] = point.z + state.offset.z;

      this.colors[i4] = COLOR_BLUE.r;
      this.colors[i4 + 1] = COLOR_BLUE.g;
      this.colors[i4 + 2] = COLOR_BLUE.b;
      this.colors[i4 + 3] = 1.0;

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
