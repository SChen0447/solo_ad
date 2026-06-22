import * as THREE from 'three';
import type { PlateData } from '../data/platesData.js';
import { getInterpolatedPlateData } from '../data/platesData.js';

interface PlateMeshGroup {
  plateId: string;
  mesh: THREE.Mesh;
  boundaryLine: THREE.Line;
  gridLines: THREE.LineSegments;
  arrowGroup: THREE.Group;
  label: THREE.Sprite | null;
  data: PlateData;
}

export class PlateRenderer {
  private scene: THREE.Scene;
  private plateGroups: Map<string, PlateMeshGroup> = new Map();
  private raycaster = new THREE.Raycaster();
  private hoveredPlate: string | null = null;
  private onHoverCallback: ((plate: PlateData | null, position: { x: number; y: number }) => void) | null = null;
  private gridTexture: THREE.CanvasTexture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.gridTexture = this.createGridTexture();
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

    const boundaryGeometry = this.createBoundaryGeometry(vertices);
    const boundaryMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(plate.color).multiplyScalar(1.5),
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });
    const boundaryLine = new THREE.Line(boundaryGeometry, boundaryMaterial);

    const gridLines = this.createGridLines(vertices);

    const arrowGroup = this.createArrows(vertices, plate.color);

    const group: PlateMeshGroup = {
      plateId: plate.id,
      mesh,
      boundaryLine,
      gridLines,
      arrowGroup,
      label: null,
      data: plate,
    };

    const container = new THREE.Group();
    container.add(mesh);
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

  private createBoundaryGeometry(vertices: [number, number][]): THREE.BufferGeometry {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= vertices.length; i++) {
      const v = vertices[i % vertices.length];
      points.push(new THREE.Vector3(v[0], v[1], 0.02));
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

  updatePlates(platesData: PlateData[], time: number): void {
    for (const plate of platesData) {
      const group = this.plateGroups.get(plate.id);
      if (!group) continue;

      const vertices = getInterpolatedPlateData(plate, time);

      const newShape = this.verticesToShape(vertices);
      const newGeometry = new THREE.ShapeGeometry(newShape);
      group.mesh.geometry.dispose();
      group.mesh.geometry = newGeometry;

      const newBoundaryGeom = this.createBoundaryGeometry(vertices);
      group.boundaryLine.geometry.dispose();
      group.boundaryLine.geometry = newBoundaryGeom;

      const newGridGeom = this.createGridLinesGeometry(vertices);
      group.gridLines.geometry.dispose();
      group.gridLines.geometry = newGridGeom;

      const container = group.mesh.userData.containerGroup as THREE.Group;
      container.remove(group.arrowGroup);
      group.arrowGroup = this.createArrows(vertices, plate.color);
      container.add(group.arrowGroup);
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
    });
  }

  updateBoundaryGlow(time: number): void {
    this.plateGroups.forEach((group) => {
      const mat = group.boundaryLine.material as THREE.LineBasicMaterial;
      mat.opacity = 0.6 + 0.4 * Math.abs(Math.sin(time * 1.5));
    });
  }

  setHoverCallback(
    cb: (plate: PlateData | null, position: { x: number; y: number }) => void
  ): void {
    this.onHoverCallback = cb;
  }

  checkHover(mouse: THREE.Vector2, camera: THREE.Camera, screenPos: { x: number; y: number }): void {
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
          this.onHoverCallback(plate, screenPos);
        } else {
          this.onHoverCallback(null, screenPos);
        }
      }
    } else if (newHovered && this.onHoverCallback) {
      const plate = this.plateGroups.get(newHovered)!.data;
      this.onHoverCallback(plate, screenPos);
    }
  }

  getPlateMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.plateGroups.forEach((g) => meshes.push(g.mesh));
    return meshes;
  }
}
