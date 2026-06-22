import * as THREE from 'three';
import type { PlateData } from '../data/platesData.js';
import { getInterpolatedPlateData } from '../data/platesData.js';

export interface PlateVelocity {
  speed: number;
  dx: number;
  dy: number;
  angle: number;
}

interface PlateMeshGroup {
  plateId: string;
  mesh: THREE.Mesh;
  boundaryLine: THREE.Line;
  glowLine1: THREE.Line;
  glowLine2: THREE.Line;
  gridLines: THREE.LineSegments;
  flowMesh: THREE.Mesh;
  arrowGroup: THREE.Group;
  label: THREE.Sprite | null;
  data: PlateData;
  center: THREE.Vector2;
  prevCenter: THREE.Vector2;
  velocity: PlateVelocity;
  lastUpdateTime: number;
}

export class PlateRenderer {
  private scene: THREE.Scene;
  private plateGroups: Map<string, PlateMeshGroup> = new Map();
  private raycaster = new THREE.Raycaster();
  private hoveredPlate: string | null = null;
  private onHoverCallback: ((plate: PlateData | null, position: { x: number; y: number }, center: { x: number; y: number } | null) => void) | null = null;
  private gridTexture: THREE.CanvasTexture;
  private flowTextureCanvas: HTMLCanvasElement;
  private flowTexture: THREE.CanvasTexture;
  private flowTextureCtx: CanvasRenderingContext2D;
  private currentTime: number = -250;
  private isPlaying: boolean = false;
  private glowFrameCounter: number = 0;
  private static readonly GLOW_UPDATE_INTERVAL: number = 3;
  private sharedGlowMat1: THREE.LineBasicMaterial | null = null;
  private sharedGlowMat2: THREE.LineBasicMaterial | null = null;
  private lastGlowPulse1: number = 0;
  private lastGlowPulse2: number = 0;
  private lastGlowBase: number = 0;
  private lastGlowScale1: number = 1;
  private lastGlowScale2: number = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gridTexture = this.createGridTexture();
    const { canvas, ctx, texture } = this.createFlowTexture();
    this.flowTextureCanvas = canvas;
    this.flowTextureCtx = ctx;
    this.flowTexture = texture;
  }

  setPlayingState(playing: boolean): void {
    this.isPlaying = playing;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getPlateVelocity(plateId: string): PlateVelocity | null {
    const g = this.plateGroups.get(plateId);
    return g ? g.velocity : null;
  }

  private createGridTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;

    const step = size / 8;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * step);
      ctx.lineTo(size, i * step);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    return texture;
  }

  private createFlowTexture(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture } {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);

    return { canvas, ctx, texture };
  }

  createPlates(platesData: PlateData[]): void {
    for (const plate of platesData) {
      this.createPlateMesh(plate);
    }
  }

  private createPlateMesh(plate: PlateData): void {
    const vertices = plate.keyframes[0].vertices;
    const shape = this.verticesToShape(vertices);
    const geometry = new THREE.ShapeGeometry(shape);

    const color = new THREE.Color(plate.color);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      transparent: true,
      opacity: 0.65,
      map: this.gridTexture,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { plateId: plate.id };

    const flowGeom = new THREE.ShapeGeometry(shape);
    const flowMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      map: this.flowTexture,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const flowMesh = new THREE.Mesh(flowGeom, flowMat);
    flowMesh.position.z = 0.015;

    const boundaryGeometry = this.createBoundaryGeometry(vertices, 0.02);
    const boundaryMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(plate.color).multiplyScalar(1.5),
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });
    const boundaryLine = new THREE.Line(boundaryGeometry, boundaryMaterial);

    const glowGeom1 = this.createBoundaryGeometry(vertices, 0.018);
    if (!this.sharedGlowMat1) {
      this.sharedGlowMat1 = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        linewidth: 1,
      });
    }
    const glowLine1 = new THREE.Line(glowGeom1, this.sharedGlowMat1);

    const glowGeom2 = this.createBoundaryGeometry(vertices, 0.016);
    if (!this.sharedGlowMat2) {
      this.sharedGlowMat2 = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.2,
        linewidth: 1,
      });
    }
    const glowLine2 = new THREE.Line(glowGeom2, this.sharedGlowMat2);

    const gridLines = this.createGridLines(vertices);

    const arrowGroup = this.createArrows(vertices, plate.color);

    const cx = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
    const cy = vertices.reduce((s, v) => s + v[1], 0) / vertices.length;
    const center = new THREE.Vector2(cx, cy);

    const group: PlateMeshGroup = {
      plateId: plate.id,
      mesh,
      boundaryLine,
      glowLine1,
      glowLine2,
      gridLines,
      flowMesh,
      arrowGroup,
      label: null,
      data: plate,
      center: center.clone(),
      prevCenter: center.clone(),
      velocity: { speed: 0, dx: 0, dy: 0, angle: 0 },
      lastUpdateTime: -250,
    };

    const container = new THREE.Group();
    container.add(mesh);
    container.add(flowMesh);
    container.add(glowLine2);
    container.add(glowLine1);
    container.add(boundaryLine);
    container.add(gridLines);
    container.add(arrowGroup);
    this.scene.add(container);

    mesh.userData.containerGroup = container;

    this.plateGroups.set(plate.id, group);
  }

  private verticesToShape(vertices: [number, number][]): THREE.Shape {
    const shape = new THREE.Shape();
    if (vertices.length === 0) return shape;

    shape.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i++) {
      shape.lineTo(vertices[i][0], vertices[i][1]);
    }
    shape.closePath();
    return shape;
  }

  private createBoundaryGeometry(vertices: [number, number][], z: number): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= vertices.length; i++) {
      const v = vertices[i % vertices.length];
      points.push(new THREE.Vector3(v[0], v[1], z));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  private createGridLines(vertices: [number, number][]): THREE.LineSegments {
    const points: THREE.Vector3[] = [];
    const cx = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
    const cy = vertices.reduce((s, v) => s + v[1], 0) / vertices.length;

    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      points.push(new THREE.Vector3(cx, cy, 0.01));
      points.push(new THREE.Vector3(v[0], v[1], 0.01));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.06,
    });
    return new THREE.LineSegments(geometry, material);
  }

  private createArrows(vertices: [number, number][], color: string): THREE.Group {
    const group = new THREE.Group();
    const len = vertices.length;
    const step = Math.max(1, Math.floor(len / 4));

    for (let i = 0; i < len; i += step) {
      const v = vertices[i];
      const vNext = vertices[(i + 1) % len];
      const dx = vNext[0] - v[0];
      const dy = vNext[1] - v[1];
      const angle = Math.atan2(dy, dx);

      const midX = v[0] + dx * 0.5;
      const midY = v[1] + dy * 0.5;

      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0.08, 0);
      arrowShape.lineTo(-0.04, 0.04);
      arrowShape.lineTo(-0.04, -0.04);
      arrowShape.closePath();

      const arrowGeom = new THREE.ShapeGeometry(arrowShape);
      const arrowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(1.3),
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      });

      const arrow = new THREE.Mesh(arrowGeom, arrowMat);
      arrow.position.set(midX, midY, 0.03);
      arrow.rotation.z = angle;
      arrow.userData.baseOpacity = 0.6;
      arrow.userData.phase = Math.random() * Math.PI * 2;
      group.add(arrow);
    }

    return group;
  }

  private updateFlowTexture(angle: number, speed: number, phase: number): void {
    const ctx = this.flowTextureCtx;
    const size = 256;
    ctx.clearRect(0, 0, size, size);

    const intensity = Math.min(1, speed * 0.8);
    if (intensity < 0.05) {
      this.flowTexture.needsUpdate = true;
      return;
    }

    const canvasAngle = -angle;

    const gradient = ctx.createLinearGradient(
      size / 2 - Math.cos(canvasAngle) * size,
      size / 2 - Math.sin(canvasAngle) * size,
      size / 2 + Math.cos(canvasAngle) * size,
      size / 2 + Math.sin(canvasAngle) * size
    );

    const alpha = 0.08 + 0.12 * intensity;
    gradient.addColorStop(0, `rgba(255,255,255,0)`);
    gradient.addColorStop(0.3, `rgba(180,220,255,${alpha})`);
    gradient.addColorStop(0.5, `rgba(200,240,255,${alpha * 1.5})`);
    gradient.addColorStop(0.7, `rgba(180,220,255,${alpha})`);
    gradient.addColorStop(1, `rgba(255,255,255,0)`);

    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.translate(size / 2, size / 2);

    const stripeWidth = 18;
    const stripeSpacing = 28;
    const offset = (phase * 80) % stripeSpacing;

    for (let i = -8; i <= 8; i++) {
      const d = i * stripeSpacing + offset;
      ctx.fillStyle = `rgba(180,220,255,${(0.05 + 0.08 * intensity) * (1 - Math.abs(i) / 10)})`;
      ctx.rotate(canvasAngle);
      ctx.fillRect(-size, d - stripeWidth / 2, size * 2, stripeWidth / 3);
      ctx.rotate(-canvasAngle);
    }

    ctx.restore();

    this.flowTexture.needsUpdate = true;
  }

  updatePlates(platesData: PlateData[], time: number): void {
    const dt = Math.abs(time - this.currentTime);
    this.currentTime = time;

    for (const plate of platesData) {
      const group = this.plateGroups.get(plate.id);
      if (!group) continue;

      const vertices = getInterpolatedPlateData(plate, time);

      const newShape = this.verticesToShape(vertices);
      const newGeometry = new THREE.ShapeGeometry(newShape);
      group.mesh.geometry.dispose();
      group.mesh.geometry = newGeometry;

      const flowGeom = new THREE.ShapeGeometry(newShape);
      group.flowMesh.geometry.dispose();
      group.flowMesh.geometry = flowGeom;

      const newBoundaryGeom = this.createBoundaryGeometry(vertices, 0.02);
      group.boundaryLine.geometry.dispose();
      group.boundaryLine.geometry = newBoundaryGeom;

      const glowGeom1 = this.createBoundaryGeometry(vertices, 0.018);
      group.glowLine1.geometry.dispose();
      group.glowLine1.geometry = glowGeom1;

      const glowGeom2 = this.createBoundaryGeometry(vertices, 0.016);
      group.glowLine2.geometry.dispose();
      group.glowLine2.geometry = glowGeom2;

      const newGridGeom = this.createGridLinesGeometry(vertices);
      group.gridLines.geometry.dispose();
      group.gridLines.geometry = newGridGeom;

      const container = group.mesh.userData.containerGroup as THREE.Group;
      container.remove(group.arrowGroup);
      group.arrowGroup = this.createArrows(vertices, plate.color);
      container.add(group.arrowGroup);

      group.prevCenter = group.center.clone();
      const cx = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
      const cy = vertices.reduce((s, v) => s + v[1], 0) / vertices.length;
      group.center.set(cx, cy);

      const dxCenter = cx - group.prevCenter.x;
      const dyCenter = cy - group.prevCenter.y;
      const distance = Math.sqrt(dxCenter * dxCenter + dyCenter * dyCenter);

      if (dt > 0.001) {
        const speedPerMillionYears = distance / dt;
        const cmPerYear = speedPerMillionYears * 1.0;
        group.velocity = {
          speed: Math.abs(cmPerYear),
          dx: dxCenter,
          dy: dyCenter,
          angle: Math.atan2(dyCenter, dxCenter),
        };
      }
      group.lastUpdateTime = time;
    }
  }

  private createGridLinesGeometry(vertices: [number, number][]): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    const cx = vertices.reduce((s, v) => s + v[0], 0) / vertices.length;
    const cy = vertices.reduce((s, v) => s + v[1], 0) / vertices.length;

    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      points.push(new THREE.Vector3(cx, cy, 0.01));
      points.push(new THREE.Vector3(v[0], v[1], 0.01));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }

  updateArrowAnimations(time: number): void {
    this.plateGroups.forEach((group) => {
      group.arrowGroup.children.forEach((arrow) => {
        const mesh = arrow as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        const base = mesh.userData.baseOpacity || 0.6;
        const phase = mesh.userData.phase || 0;
        mat.opacity = base * (0.4 + 0.6 * Math.abs(Math.sin(time * 2 + phase)));

        const scale = 0.9 + 0.2 * Math.sin(time * 3 + phase);
        mesh.scale.set(scale, scale, 1);
      });

      const flowMat = group.flowMesh.material as THREE.MeshBasicMaterial;
      if (this.isPlaying) {
        const targetOpacity = Math.min(0.35, 0.1 + group.velocity.speed * 0.4);
        flowMat.opacity += (targetOpacity - flowMat.opacity) * 0.1;
      } else {
        flowMat.opacity += (0 - flowMat.opacity) * 0.05;
      }

      this.updateFlowTexture(group.velocity.angle, group.velocity.speed, time);
      this.flowTexture.offset.x = (time * 0.3 * Math.cos(group.velocity.angle)) % 1;
      this.flowTexture.offset.y = (-time * 0.3 * Math.sin(group.velocity.angle)) % 1;
    });
  }

  updateBoundaryGlow(time: number): void {
    this.glowFrameCounter++;
    if (this.glowFrameCounter % PlateRenderer.GLOW_UPDATE_INTERVAL !== 0) {
      return;
    }

    const pulse1 = 0.25 + 0.15 * Math.sin(time * 1.8);
    const pulse2 = 0.12 + 0.08 * Math.sin(time * 2.2 + 0.5);
    const baseVal = 0.6 + 0.4 * Math.abs(Math.sin(time * 1.5));
    const scale1 = 1 + 0.05 * Math.sin(time * 1.2);
    const scale2 = 1 + 0.1 * Math.sin(time * 0.9 + 1);

    let maxSpeed = 0;
    this.plateGroups.forEach((group) => {
      if (group.velocity.speed > maxSpeed) maxSpeed = group.velocity.speed;
    });

    const glowOpacity1 = pulse1 + Math.min(0.3, maxSpeed * 0.4);
    const glowOpacity2 = pulse2 + Math.min(0.25, maxSpeed * 0.3);

    if (this.sharedGlowMat1) {
      this.sharedGlowMat1.opacity = glowOpacity1;
    }
    if (this.sharedGlowMat2) {
      this.sharedGlowMat2.opacity = glowOpacity2;
    }

    const scaleChanged = Math.abs(scale1 - this.lastGlowScale1) > 0.001 ||
                         Math.abs(scale2 - this.lastGlowScale2) > 0.001;

    if (scaleChanged) {
      this.plateGroups.forEach((group) => {
        group.glowLine1.scale.set(scale1, scale1, 1);
        group.glowLine2.scale.set(scale2, scale2, 1);
      });
      this.lastGlowScale1 = scale1;
      this.lastGlowScale2 = scale2;
    }

    const baseMatChanged = Math.abs(baseVal - this.lastGlowBase) > 0.01;
    if (baseMatChanged) {
      this.plateGroups.forEach((group) => {
        const baseMat = group.boundaryLine.material as THREE.LineBasicMaterial;
        baseMat.opacity = baseVal;
      });
      this.lastGlowBase = baseVal;
    }
  }

  setHoverCallback(
    cb: (plate: PlateData | null, position: { x: number; y: number }, center: { x: number; y: number } | null) => void
  ): void {
    this.onHoverCallback = cb;
  }

  getPlateCenterWorld(plateId: string, camera: THREE.Camera, width: number, height: number): { x: number; y: number } | null {
    const group = this.plateGroups.get(plateId);
    if (!group) return null;

    const v = new THREE.Vector3(group.center.x, group.center.y, 0.05);
    const projected = v.project(camera);

    if (projected.z < -1 || projected.z > 1) return null;
    if (projected.x < -1.2 || projected.x > 1.2 || projected.y < -1.2 || projected.y > 1.2) return null;

    return {
      x: (projected.x * 0.5 + 0.5) * width,
      y: (-projected.y * 0.5 + 0.5) * height,
    };
  }

  checkHover(mouse: THREE.Vector2, camera: THREE.Camera, screenPos: { x: number; y: number }, width: number, height: number): void {
    this.raycaster.setFromCamera(mouse, camera);
    const meshes: THREE.Mesh[] = [];
    this.plateGroups.forEach((g) => meshes.push(g.mesh));

    const intersects = this.raycaster.intersectObjects(meshes);

    let newHovered: string | null = null;
    if (intersects.length > 0) {
      newHovered = intersects[0].object.userData.plateId as string;
    }

    if (newHovered !== this.hoveredPlate) {
      if (this.hoveredPlate) {
        const prev = this.plateGroups.get(this.hoveredPlate);
        if (prev) {
          (prev.mesh.material as THREE.MeshPhongMaterial).opacity = 0.65;
          (prev.mesh.material as THREE.MeshPhongMaterial).emissive.setHex(0x000000);
        }
      }

      this.hoveredPlate = newHovered;

      if (newHovered) {
        const curr = this.plateGroups.get(newHovered);
        if (curr) {
          (curr.mesh.material as THREE.MeshPhongMaterial).opacity = 0.85;
          (curr.mesh.material as THREE.MeshPhongMaterial).emissive.copy(
            new THREE.Color(curr.data.color).multiplyScalar(0.3)
          );
        }
      }

      if (this.onHoverCallback) {
        if (newHovered) {
          const plate = this.plateGroups.get(newHovered)!.data;
          const center = this.getPlateCenterWorld(newHovered, camera, width, height);
          this.onHoverCallback(plate, screenPos, center);
        } else {
          this.onHoverCallback(null, screenPos, null);
        }
      }
    } else if (newHovered && this.onHoverCallback) {
      const plate = this.plateGroups.get(newHovered)!.data;
      const center = this.getPlateCenterWorld(newHovered, camera, width, height);
      this.onHoverCallback(plate, screenPos, center);
    }
  }

  getPlateMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.plateGroups.forEach((g) => meshes.push(g.mesh));
    return meshes;
  }
}
