import * as THREE from 'three';
import { RoadSegment } from './AppController';

const GRID_SIZE = 5;
const ROAD_WIDTH = 4;
const ROAD_LENGTH = 20;
const INTERSECTION_SIZE = 8;
const GRID_SPACING = 24;

const COLOR_LOW = new THREE.Color(0x22c55e);
const COLOR_MID = new THREE.Color(0xeab308);
const COLOR_HIGH = new THREE.Color(0xef4444);
const COLOR_ROAD_BASE = new THREE.Color(0x333333);

export class RoadNetworkManager {
  private scene: THREE.Scene;

  private roadGroup: THREE.Group;
  private lowDetailGroup: THREE.Group;
  private intersectionGroup: THREE.Group;
  private glowGroup: THREE.Group;
  private gridLineGroup: THREE.Group;
  private pathLineGroup: THREE.Group;

  private roadSegments: RoadSegment[] = [];
  private intersections: THREE.Vector3[] = [];
  private segmentMeshes: Map<string, THREE.Mesh> = new Map();
  private highlightBorders: Map<string, THREE.LineSegments> = new Map();
  private highlightedSegments: Set<string> = new Set();

  private lodLevel: 'high' | 'medium' | 'low' = 'high';
  private densityMap: Map<string, number> = new Map();

  private raycastMeshes: THREE.Mesh[] = [];

  private roadTexture!: THREE.CanvasTexture;
  private intersectionTexture!: THREE.CanvasTexture;
  private roadEmissiveTexture!: THREE.CanvasTexture;
  private intersectionEmissiveTexture!: THREE.CanvasTexture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.roadGroup = new THREE.Group();
    this.lowDetailGroup = new THREE.Group();
    this.intersectionGroup = new THREE.Group();
    this.glowGroup = new THREE.Group();
    this.gridLineGroup = new THREE.Group();
    this.pathLineGroup = new THREE.Group();

    this.roadGroup.name = 'roads_high';
    this.lowDetailGroup.name = 'roads_low';
    this.intersectionGroup.name = 'intersections';
    this.glowGroup.name = 'glows';
    this.gridLineGroup.name = 'gridlines';
    this.pathLineGroup.name = 'pathlines';
  }

  init(): void {
    this.generateTextures();

    this.buildRoadNetwork();
    this.buildIntersections();
    this.buildGlowEffects();
    this.buildGridLines();
    this.buildLowDetailMeshes();
    this.buildPathLines();

    this.scene.add(this.roadGroup);
    this.scene.add(this.lowDetailGroup);
    this.scene.add(this.intersectionGroup);
    this.scene.add(this.glowGroup);
    this.scene.add(this.gridLineGroup);
    this.scene.add(this.pathLineGroup);

    this.lowDetailGroup.visible = false;
    this.pathLineGroup.visible = false;
  }

  private generateTextures(): void {
    this.roadTexture = this.createRoadTexture();
    this.roadEmissiveTexture = this.createRoadEmissiveTexture();
    this.intersectionTexture = this.createIntersectionTexture();
    this.intersectionEmissiveTexture = this.createIntersectionEmissiveTexture();
  }

  private createRoadTexture(): THREE.CanvasTexture {
    const canvasW = 640;
    const canvasH = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, canvasW, canvasH);

    this.paintAsphaltNoise(ctx, canvasW, canvasH);

    const edgeLineOffset = canvasW * 0.01;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, edgeLineOffset);
    ctx.lineTo(canvasW, edgeLineOffset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, canvasH - edgeLineOffset);
    ctx.lineTo(canvasW, canvasH - edgeLineOffset);
    ctx.stroke();

    const curbHeight = canvasW * 0.005;
    ctx.fillStyle = 'rgba(180, 180, 180, 0.4)';
    ctx.fillRect(0, 0, canvasW, curbHeight);
    ctx.fillRect(0, canvasH - curbHeight, canvasW, curbHeight);

    const dashLen = canvasW * 0.03;
    const dashGap = canvasW * 0.03;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([dashLen, dashGap]);
    ctx.beginPath();
    ctx.moveTo(0, canvasH / 2);
    ctx.lineTo(canvasW, canvasH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private createRoadEmissiveTexture(): THREE.CanvasTexture {
    const canvasW = 640;
    const canvasH = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const edgeLineOffset = canvasW * 0.01;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, edgeLineOffset);
    ctx.lineTo(canvasW, edgeLineOffset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, canvasH - edgeLineOffset);
    ctx.lineTo(canvasW, canvasH - edgeLineOffset);
    ctx.stroke();

    const dashLen = canvasW * 0.03;
    const dashGap = canvasW * 0.03;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([dashLen, dashGap]);
    ctx.beginPath();
    ctx.moveTo(0, canvasH / 2);
    ctx.lineTo(canvasW, canvasH / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private createIntersectionTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(0, 0, size, size);

    this.paintAsphaltNoise(ctx, size, size);

    const stripeW = size * 0.03;
    const stripeGap = size * 0.03;
    const roadEdgeMargin = size * 0.08;
    const availableWidth = size - 2 * roadEdgeMargin;
    const stripeCount = Math.floor(availableWidth / (stripeW + stripeGap));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';

    for (let s = 0; s < stripeCount; s++) {
      const x = roadEdgeMargin + s * (stripeW + stripeGap);
      ctx.fillRect(x, 0, stripeW, roadEdgeMargin - 2);
      ctx.fillRect(x, size - roadEdgeMargin + 2, stripeW, roadEdgeMargin - 2);
    }

    for (let s = 0; s < stripeCount; s++) {
      const y = roadEdgeMargin + s * (stripeW + stripeGap);
      ctx.fillRect(0, y, roadEdgeMargin - 2, stripeW);
      ctx.fillRect(size - roadEdgeMargin + 2, y, roadEdgeMargin - 2, stripeW);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(size / 2, roadEdgeMargin);
    ctx.lineTo(size / 2, size - roadEdgeMargin);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(roadEdgeMargin, size / 2);
    ctx.lineTo(size - roadEdgeMargin, size / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private createIntersectionEmissiveTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    const stripeW = size * 0.03;
    const stripeGap = size * 0.03;
    const roadEdgeMargin = size * 0.08;
    const availableWidth = size - 2 * roadEdgeMargin;
    const stripeCount = Math.floor(availableWidth / (stripeW + stripeGap));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

    for (let s = 0; s < stripeCount; s++) {
      const x = roadEdgeMargin + s * (stripeW + stripeGap);
      ctx.fillRect(x, 0, stripeW, roadEdgeMargin - 2);
      ctx.fillRect(x, size - roadEdgeMargin + 2, stripeW, roadEdgeMargin - 2);
    }

    for (let s = 0; s < stripeCount; s++) {
      const y = roadEdgeMargin + s * (stripeW + stripeGap);
      ctx.fillRect(0, y, roadEdgeMargin - 2, stripeW);
      ctx.fillRect(size - roadEdgeMargin + 2, y, roadEdgeMargin - 2, stripeW);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    return texture;
  }

  private paintAsphaltNoise(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const maxNoiseOffset = (w + h) / 2 * 0.01;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 2 * maxNoiseOffset;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    const gridSize = 12;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  private buildRoadNetwork(): void {
    const offset = (GRID_SIZE - 1) * GRID_SPACING / 2;

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE - 1; j++) {
        const startX = j * GRID_SPACING - offset;
        const endX = (j + 1) * GRID_SPACING - offset;
        const z = i * GRID_SPACING - offset;

        const segment: RoadSegment = {
          id: `h_${i}_${j}`,
          startX,
          startZ: z,
          endX,
          endZ: z,
          width: ROAD_WIDTH,
          density: 0,
          direction: 'x',
          isIntersection: false
        };
        this.roadSegments.push(segment);
        this.createRoadMesh(segment);
      }
    }

    for (let i = 0; i < GRID_SIZE - 1; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = j * GRID_SPACING - offset;
        const startZ = i * GRID_SPACING - offset;
        const endZ = (i + 1) * GRID_SPACING - offset;

        const segment: RoadSegment = {
          id: `v_${i}_${j}`,
          startX: x,
          startZ,
          endX: x,
          endZ,
          width: ROAD_WIDTH,
          density: 0,
          direction: 'z',
          isIntersection: false
        };
        this.roadSegments.push(segment);
        this.createRoadMesh(segment);
      }
    }
  }

  private createRoadMesh(segment: RoadSegment): void {
    const length = segment.direction === 'x'
      ? Math.abs(segment.endX - segment.startX)
      : Math.abs(segment.endZ - segment.startZ);

    const geometry = new THREE.PlaneGeometry(length, segment.width, Math.max(1, Math.floor(length / 2)), 1);

    if (segment.direction === 'z') {
      this.rotateUVsForVerticalRoad(geometry);
    }

    const material = new THREE.MeshLambertMaterial({
      color: COLOR_ROAD_BASE.clone(),
      map: this.roadTexture,
      emissiveMap: this.roadEmissiveTexture,
      emissive: new THREE.Color(0x444444),
      emissiveIntensity: this.getEmissiveIntensity(0),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;

    if (segment.direction === 'x') {
      mesh.position.set(
        (segment.startX + segment.endX) / 2,
        0.01,
        segment.startZ
      );
    } else {
      mesh.position.set(
        segment.startX,
        0.01,
        (segment.startZ + segment.endZ) / 2
      );
    }

    mesh.userData.segmentId = segment.id;
    mesh.userData.segment = segment;

    this.roadGroup.add(mesh);
    this.segmentMeshes.set(segment.id, mesh);
    this.raycastMeshes.push(mesh);

    this.createHighlightBorder(segment, mesh);
  }

  private rotateUVsForVerticalRoad(geometry: THREE.PlaneGeometry): void {
    const uvAttribute = geometry.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
      const u = uvAttribute.getX(i);
      const v = uvAttribute.getY(i);
      uvAttribute.setXY(i, v, 1 - u);
    }
    uvAttribute.needsUpdate = true;
  }

  private createHighlightBorder(segment: RoadSegment, mesh: THREE.Mesh): void {
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      linewidth: 1
    });
    const border = new THREE.LineSegments(edges, lineMaterial);
    border.position.copy(mesh.position);
    border.rotation.copy(mesh.rotation);
    border.userData.segmentId = segment.id;

    this.roadGroup.add(border);
    this.highlightBorders.set(segment.id, border);
  }

  private buildIntersections(): void {
    const offset = (GRID_SIZE - 1) * GRID_SPACING / 2;

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const x = j * GRID_SPACING - offset;
        const z = i * GRID_SPACING - offset;

        this.intersections.push(new THREE.Vector3(x, 0, z));

        const geometry = new THREE.PlaneGeometry(INTERSECTION_SIZE, INTERSECTION_SIZE);
        const material = new THREE.MeshLambertMaterial({
          color: COLOR_ROAD_BASE.clone(),
          map: this.intersectionTexture,
          emissiveMap: this.intersectionEmissiveTexture,
          emissive: new THREE.Color(0x444444),
          emissiveIntensity: this.getEmissiveIntensity(0),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.005, z);
        mesh.userData.intersection = true;

        this.intersectionGroup.add(mesh);
      }
    }
  }

  private buildGlowEffects(): void {
    const glowTexture = this.createGlowTexture();

    this.intersections.forEach((pos) => {
      const spriteMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });

      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(pos.x, 0.1, pos.z);
      sprite.scale.set(10, 10, 1);

      this.glowGroup.add(sprite);
    });
  }

  private createGlowTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private buildGridLines(): void {
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      linewidth: 0.5
    });

    this.roadSegments.forEach((segment) => {
      const points: THREE.Vector3[] = [];

      if (segment.direction === 'x') {
        const halfWidth = segment.width / 2;
        points.push(new THREE.Vector3(segment.startX, 0.02, segment.startZ - halfWidth));
        points.push(new THREE.Vector3(segment.endX, 0.02, segment.startZ - halfWidth));
        points.push(new THREE.Vector3(segment.endX, 0.02, segment.startZ + halfWidth));
        points.push(new THREE.Vector3(segment.startX, 0.02, segment.startZ + halfWidth));
      } else {
        const halfWidth = segment.width / 2;
        points.push(new THREE.Vector3(segment.startX - halfWidth, 0.02, segment.startZ));
        points.push(new THREE.Vector3(segment.startX - halfWidth, 0.02, segment.endZ));
        points.push(new THREE.Vector3(segment.startX + halfWidth, 0.02, segment.endZ));
        points.push(new THREE.Vector3(segment.startX + halfWidth, 0.02, segment.startZ));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineLoop(geometry, material);
      this.gridLineGroup.add(line);
    });
  }

  private buildLowDetailMeshes(): void {
    const offset = (GRID_SIZE - 1) * GRID_SPACING / 2;

    for (let i = 0; i < GRID_SIZE - 1; i += 2) {
      for (let j = 0; j < GRID_SIZE - 1; j += 2) {
        const x = ((j + 0.5) * GRID_SPACING) - offset;
        const z = ((i + 0.5) * GRID_SPACING) - offset;

        const geometry = new THREE.PlaneGeometry(GRID_SPACING * 2, GRID_SPACING * 2);
        const material = new THREE.MeshLambertMaterial({
          color: COLOR_ROAD_BASE.clone(),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(x, 0.001, z);
        mesh.userData.isLowDetail = true;

        this.lowDetailGroup.add(mesh);
      }
    }
  }

  private buildPathLines(): void {
    const material = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      linewidth: 0.5,
      dashSize: 1,
      gapSize: 0.5
    });

    this.roadSegments.forEach((segment) => {
      const points: THREE.Vector3[] = [];

      if (segment.direction === 'x') {
        points.push(new THREE.Vector3(segment.startX, 0.03, segment.startZ));
        points.push(new THREE.Vector3(segment.endX, 0.03, segment.endZ));
      } else {
        points.push(new THREE.Vector3(segment.startX, 0.03, segment.startZ));
        points.push(new THREE.Vector3(segment.endX, 0.03, segment.endZ));
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      this.pathLineGroup.add(line);
    });
  }

  setTrafficDensity(densityMap: Map<string, number>): void {
    this.densityMap = densityMap;

    densityMap.forEach((density, segmentId) => {
      const mesh = this.segmentMeshes.get(segmentId);
      if (mesh) {
        const color = this.getHeatColor(density);
        const material = mesh.material as THREE.MeshLambertMaterial;

        if (this.highlightedSegments.has(segmentId)) {
          const brightColor = color.clone();
          brightColor.offsetHSL(0, 0, 0.15);
          material.color.copy(brightColor);
        } else {
          material.color.copy(color);
        }

        material.emissiveIntensity = this.getEmissiveIntensity(density);
      }
    });

    this.updateIntersectionColors();
  }

  private updateIntersectionColors(): void {
    this.intersectionGroup.children.forEach((child, index) => {
      const mesh = child as THREE.Mesh;
      const i = Math.floor(index / GRID_SIZE);
      const j = index % GRID_SIZE;

      let totalDensity = 0;
      let count = 0;

      if (j > 0) {
        const id = `h_${i}_${j - 1}`;
        totalDensity += this.densityMap.get(id) || 0;
        count++;
      }
      if (j < GRID_SIZE - 1) {
        const id = `h_${i}_${j}`;
        totalDensity += this.densityMap.get(id) || 0;
        count++;
      }
      if (i > 0) {
        const id = `v_${i - 1}_${j}`;
        totalDensity += this.densityMap.get(id) || 0;
        count++;
      }
      if (i < GRID_SIZE - 1) {
        const id = `v_${i}_${j}`;
        totalDensity += this.densityMap.get(id) || 0;
        count++;
      }

      const avgDensity = count > 0 ? totalDensity / count : 0;
      const color = this.getHeatColor(avgDensity);
      const material = mesh.material as THREE.MeshLambertMaterial;
      material.color.copy(color);
      material.emissiveIntensity = this.getEmissiveIntensity(avgDensity);
    });
  }

  private getHeatColor(density: number): THREE.Color {
    const t = Math.max(0, Math.min(1, density / 200));

    if (t < 0.5) {
      const localT = t / 0.5;
      return COLOR_LOW.clone().lerp(COLOR_MID, localT);
    } else {
      const localT = (t - 0.5) / 0.5;
      return COLOR_MID.clone().lerp(COLOR_HIGH, localT);
    }
  }

  private getEmissiveIntensity(density: number): number {
    const t = Math.max(0, Math.min(1, density / 200));
    return 0.3 - (0.3 - 0.05) * t;
  }

  setSegmentHighlight(segmentId: string, highlight: boolean): void {
    const mesh = this.segmentMeshes.get(segmentId);
    const border = this.highlightBorders.get(segmentId);

    if (highlight) {
      this.highlightedSegments.add(segmentId);
    } else {
      this.highlightedSegments.delete(segmentId);
    }

    if (mesh) {
      const density = this.densityMap.get(segmentId) || 0;
      const baseColor = this.getHeatColor(density);
      const material = mesh.material as THREE.MeshLambertMaterial;

      if (highlight) {
        const brightColor = baseColor.clone();
        brightColor.offsetHSL(0, 0, 0.15);
        material.color.copy(brightColor);
      } else {
        material.color.copy(baseColor);
      }

      material.emissiveIntensity = this.getEmissiveIntensity(density);
    }

    if (border) {
      const material = border.material as THREE.LineBasicMaterial;
      material.opacity = highlight ? 1 : 0;
    }
  }

  updateLOD(cameraDistance: number): void {
    let newLevel: 'high' | 'medium' | 'low';

    if (cameraDistance < 40) {
      newLevel = 'high';
    } else if (cameraDistance < 80) {
      newLevel = 'medium';
    } else {
      newLevel = 'low';
    }

    if (newLevel !== this.lodLevel) {
      this.lodLevel = newLevel;
      this.applyLOD();
    }

    this.pathLineGroup.visible = cameraDistance < 30;
  }

  private applyLOD(): void {
    switch (this.lodLevel) {
      case 'high':
        this.roadGroup.visible = true;
        this.intersectionGroup.visible = true;
        this.lowDetailGroup.visible = false;
        this.gridLineGroup.visible = true;
        this.glowGroup.visible = true;
        break;
      case 'medium':
        this.roadGroup.visible = true;
        this.intersectionGroup.visible = true;
        this.lowDetailGroup.visible = false;
        this.gridLineGroup.visible = false;
        this.glowGroup.visible = true;
        break;
      case 'low':
        this.roadGroup.visible = false;
        this.intersectionGroup.visible = false;
        this.lowDetailGroup.visible = true;
        this.gridLineGroup.visible = false;
        this.glowGroup.visible = true;
        break;
    }
  }

  getRoadSegments(): RoadSegment[] {
    return this.roadSegments;
  }

  getIntersections(): THREE.Vector3[] {
    return this.intersections;
  }

  getRaycastMeshes(): THREE.Mesh[] {
    return this.raycastMeshes;
  }

  getSegmentById(id: string): RoadSegment | undefined {
    return this.roadSegments.find(s => s.id === id);
  }

  getLODLevel(): 'high' | 'medium' | 'low' {
    return this.lodLevel;
  }
}
