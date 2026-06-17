/**
 * 可视化渲染模块 - Visualizer
 *
 * 职责：
 * - 温度色阶渲染（PlaneGeometry + 顶点颜色，紫-蓝-青-黄-红渐变）
 * - 气压等高线渲染（Marching Squares算法 + LineSegments，半透明白色细线）
 * - 风速粒子箭头（带箭头头的三维箭头，长度与风速成比例）
 * - 切割平面（半透明蓝色 Plane）
 * - 大气层参考边框、网格、坐标轴标签
 *
 * 数据流向：
 *   入口：Atmosphere.getSlice() / getInterpolatedSlice() -> Visualizer.renderSlice()
 *   出口：Three.js Object3D 加入场景 -> main.ts 中的 renderer 渲染
 *
 * 调用关系：
 *   main.ts 创建 -> Visualizer(scene, atmosphere)
 *   main.ts 更新 -> Visualizer.renderSlice(sliceData, altitudeIndex)
 *   main.ts 动画 -> Visualizer.update(delta)
 */

import * as THREE from 'three';
import type { SliceData } from './atmosphere';

// ============ 常量配置 ============

const WORLD_SIZE = 10;           // 3D 场景中水平面的尺寸（单位）
const ALTITUDE_MAX_Y = 8;        // 10000m 对应的 Y 坐标
const GRID_VIS_SPACING = 4;      // 粒子箭头间隔（每隔几个网格画一个箭头）
const ARROW_MAX_LENGTH = 0.8;    // 箭头最大长度
const ARROW_MIN_LENGTH = 0.05;   // 箭头最小长度

// ============ 颜色映射函数 ============

function tempToColor(t: number, min: number, max: number): THREE.Color {
  const tNorm = Math.max(0, Math.min(1, (t - min) / (max - min)));

  if (tNorm < 0.2) {
    const k = tNorm / 0.2;
    return new THREE.Color().lerpColors(
      new THREE.Color(0.482, 0.122, 0.635),  // #7b1fa2 深紫
      new THREE.Color(0.318, 0.180, 0.659),  // #512da8 紫
      k
    );
  } else if (tNorm < 0.4) {
    const k = (tNorm - 0.2) / 0.2;
    return new THREE.Color().lerpColors(
      new THREE.Color(0.318, 0.180, 0.659),
      new THREE.Color(0.098, 0.463, 0.824),  // #1976d2 蓝
      k
    );
  } else if (tNorm < 0.6) {
    const k = (tNorm - 0.4) / 0.2;
    return new THREE.Color().lerpColors(
      new THREE.Color(0.098, 0.463, 0.824),
      new THREE.Color(0.000, 0.737, 0.831),  // #00bcd4 青
      k
    );
  } else if (tNorm < 0.8) {
    const k = (tNorm - 0.6) / 0.2;
    return new THREE.Color().lerpColors(
      new THREE.Color(0.000, 0.737, 0.831),
      new THREE.Color(1.000, 0.757, 0.027),  // #ffc107 黄
      k
    );
  } else {
    const k = (tNorm - 0.8) / 0.2;
    return new THREE.Color().lerpColors(
      new THREE.Color(1.000, 0.757, 0.027),
      new THREE.Color(0.957, 0.263, 0.212),  // #f44336 红
      k
    );
  }
}

function altitudeToY(altitudeIndex: number, totalLayers: number): number {
  const t = altitudeIndex / (totalLayers - 1);
  return -ALTITUDE_MAX_Y / 2 + t * ALTITUDE_MAX_Y;
}

// ============ Marching Squares 等值线提取算法 ============

function extractContours(
  grid: number[][],
  levels: number[]
): Map<number, Array<[THREE.Vector2, THREE.Vector2]>> {
  const contours = new Map<number, Array<[THREE.Vector2, THREE.Vector2]>>();
  const G = grid.length;

  for (const level of levels) {
    contours.set(level, []);
  }

  // 边上的插值点索引：
  // 边0 (下): (x,y) -> (x+1,y)
  // 边1 (右): (x+1,y) -> (x+1,y+1)
  // 边2 (上): (x,y+1) -> (x+1,y+1)
  // 边3 (左): (x,y) -> (x,y+1)
  const edgeTable: number[][] = [
    [],          // 0000
    [0, 3],      // 0001
    [0, 1],      // 0010
    [1, 3],      // 0011
    [1, 2],      // 0100
    [0, 1, 2, 3],// 0101 (歧义)
    [0, 2],      // 0110
    [2, 3],      // 0111
    [2, 3],      // 1000
    [0, 2],      // 1001 (歧义)
    [0, 1, 2, 3],// 1010 (歧义)
    [1, 2],      // 1011
    [1, 3],      // 1100
    [0, 1],      // 1101
    [0, 3],      // 1110
    []           // 1111
  ];

  for (let y = 0; y < G - 1; y++) {
    for (let x = 0; x < G - 1; x++) {
      const v00 = grid[y][x];       // 左下
      const v10 = grid[y][x + 1];   // 右下
      const v01 = grid[y + 1][x];   // 左上
      const v11 = grid[y + 1][x + 1]; // 右上

      for (const level of levels) {
        const interp = (va: number, vb: number) => {
          const d = vb - va;
          return Math.abs(d) < 1e-8 ? 0.5 : (level - va) / d;
        };

        // 四个值是否在等值线以上
        const b00 = v00 > level ? 1 : 0;
        const b10 = v10 > level ? 1 : 0;
        const b01 = v01 > level ? 1 : 0;
        const b11 = v11 > level ? 1 : 0;
        const caseIdx = (b11 << 3) | (b01 << 2) | (b10 << 1) | b00;

        if (caseIdx === 0 || caseIdx === 15) continue;

        // 计算四条边上的插值点坐标
        // 边0 (下): (x + tx0, y)
        const t0 = interp(v00, v10);
        const p0x = x + t0;
        const p0y = y;
        // 边1 (右): (x + 1, y + t1)
        const t1 = interp(v10, v11);
        const p1x = x + 1;
        const p1y = y + t1;
        // 边2 (上): (x + t2, y + 1)
        const t2 = interp(v01, v11);
        const p2x = x + t2;
        const p2y = y + 1;
        // 边3 (左): (x, y + t3)
        const t3 = interp(v00, v01);
        const p3x = x;
        const p3y = y + t3;

        const pts = [
          new THREE.Vector2(p0x, p0y), // 0
          new THREE.Vector2(p1x, p1y), // 1
          new THREE.Vector2(p2x, p2y), // 2
          new THREE.Vector2(p3x, p3y)  // 3
        ];

        const edges = edgeTable[caseIdx];
        const segs = contours.get(level)!;

        // 歧义情况: 0101 (5) 和 1010 (10)
        // 使用中点值作为歧义消解
        if (caseIdx === 5 || caseIdx === 10) {
          const midAvg = (v00 + v10 + v01 + v11) * 0.25;
          const connectOpposite = caseIdx === 5
            ? midAvg >= level  // 0101: 中点高 -> 连接 (下边-左边) 和 (右边-上边)
            : midAvg < level;  // 1010: 中点低 -> 连接 (下边-右边) 和 (左边-上边)

          if (connectOpposite) {
            // 连接边0-边3 和 边1-边2
            segs.push([pts[0].clone(), pts[3].clone()]);
            segs.push([pts[1].clone(), pts[2].clone()]);
          } else {
            // 连接边0-边1 和 边2-边3
            segs.push([pts[0].clone(), pts[1].clone()]);
            segs.push([pts[2].clone(), pts[3].clone()]);
          }
        } else {
          // 正常情况: 两条边连成一条线段
          if (edges.length >= 2) {
            segs.push([pts[edges[0]].clone(), pts[edges[1]].clone()]);
          }
          if (edges.length >= 4) {
            segs.push([pts[edges[2]].clone(), pts[edges[3]].clone()]);
          }
        }
      }
    }
  }

  return contours;
}

// ============ Visualizer 主类 ============

export class Visualizer {
  private scene: THREE.Scene;
  private rootGroup: THREE.Group;

  // 渲染对象分组
  private atmosphereBox: THREE.Group;
  private sliceGroup: THREE.Group;
  private tempPlane: THREE.Mesh | null = null;
  private contourLines: THREE.LineSegments | null = null;
  private arrowGroup: THREE.Group;
  private cutPlane: THREE.Mesh | null = null;

  private altitudeLabels: THREE.Group;

  // 渲染缓存
  private tempGeometry: THREE.PlaneGeometry | null = null;
  private currentAltitudeIndex: number = 2;
  private totalAltitudeLayers: number = 5;

  constructor(scene: THREE.Scene, totalAltitudeLayers: number = 5) {
    this.scene = scene;
    this.totalAltitudeLayers = totalAltitudeLayers;

    this.rootGroup = new THREE.Group();
    this.atmosphereBox = new THREE.Group();
    this.sliceGroup = new THREE.Group();
    this.arrowGroup = new THREE.Group();
    this.altitudeLabels = new THREE.Group();

    this.scene.add(this.rootGroup);
    this.rootGroup.add(this.atmosphereBox);
    this.rootGroup.add(this.sliceGroup);
    this.rootGroup.add(this.arrowGroup);
    this.rootGroup.add(this.altitudeLabels);

    this._buildAtmosphereBox();
    this._buildCutPlane();
  }

  // ============ 初始化构造方法 ============

  private _buildAtmosphereBox(): void {
    const halfSize = WORLD_SIZE / 2;
    const halfY = ALTITUDE_MAX_Y / 2;

    // 边框线
    const boxEdges = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(WORLD_SIZE, ALTITUDE_MAX_Y, WORLD_SIZE)
    );
    const boxMaterial = new THREE.LineBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.25
    });
    const box = new THREE.LineSegments(boxEdges, boxMaterial);
    this.atmosphereBox.add(box);

    // 底部半透明面
    const bottomGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE);
    const bottomMat = new THREE.MeshBasicMaterial({
      color: 0x0a1628,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const bottomPlane = new THREE.Mesh(bottomGeo, bottomMat);
    bottomPlane.rotation.x = -Math.PI / 2;
    bottomPlane.position.y = -halfY;
    this.atmosphereBox.add(bottomPlane);

    // 底部网格
    const gridHelper = new THREE.GridHelper(
      WORLD_SIZE, 10,
      0x00e5ff, 0x1a3a5c
    );
    gridHelper.position.y = -halfY + 0.001;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.5;
    this.atmosphereBox.add(gridHelper);

    // 5 层海拔标记（虚线）
    for (let i = 0; i < this.totalAltitudeLayers; i++) {
      const y = altitudeToY(i, this.totalAltitudeLayers);
      const layerEdges = new THREE.EdgesGeometry(
        new THREE.BoxGeometry(WORLD_SIZE, 0.01, WORLD_SIZE)
      );
      const layerMat = new THREE.LineDashedMaterial({
        color: 0x64d8ff,
        transparent: true,
        opacity: 0.15,
        dashSize: 0.3,
        gapSize: 0.15
      });
      const layer = new THREE.LineSegments(layerEdges, layerMat);
      layer.position.y = y;
      layer.computeLineDistances();
      this.atmosphereBox.add(layer);

      this._addAltitudeLabel(y, i);
    }
  }

  private _addAltitudeLabel(y: number, layerIndex: number): void {
    const halfSize = WORLD_SIZE / 2;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const altitudes = [1000, 3000, 5000, 8000, 10000];
    const text = `${altitudes[layerIndex]}m`;

    ctx.clearRect(0, 0, 256, 64);
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(100, 216, 255, 0.9)';
    ctx.shadowColor = 'rgba(0, 229, 255, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(-halfSize - 0.5, y, 0);
    sprite.scale.set(1.5, 0.38, 1);
    sprite.renderOrder = 999;
    this.altitudeLabels.add(sprite);
  }

  private _buildCutPlane(): void {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE * 1.02, WORLD_SIZE * 1.02);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0099ff,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.cutPlane = new THREE.Mesh(geo, mat);
    this.cutPlane.rotation.x = -Math.PI / 2;
    const y = altitudeToY(this.currentAltitudeIndex, this.totalAltitudeLayers);
    this.cutPlane.position.y = y;
    this.sliceGroup.add(this.cutPlane);

    // 边框
    const borderGeo = new THREE.EdgesGeometry(
      new THREE.PlaneGeometry(WORLD_SIZE * 1.02, WORLD_SIZE * 1.02)
    );
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.8
    });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    border.rotation.x = -Math.PI / 2;
    border.position.y = y + 0.001;
    (border.userData as any).isBorder = true;
    this.cutPlane.add(border);
  }

  // ============ 公共 API：渲染切片 ============

  renderSlice(slice: SliceData, animateAltitude: boolean = true): void {
    this.currentAltitudeIndex = slice.altitudeIndex;
    const y = altitudeToY(slice.altitudeIndex, this.totalAltitudeLayers);

    if (this.cutPlane) {
      if (animateAltitude) {
        this._animatePosition(this.cutPlane, y);
        const border = this.cutPlane.children[0];
        if (border) {
          this._animatePosition(border, 0.001);
        }
      } else {
        this.cutPlane.position.y = y;
      }
    }

    this._renderTemperature(slice, y);
    this._renderContours(slice, y);
    this._renderWindArrows(slice, y);
  }

  private _animatePosition(obj: THREE.Object3D, targetY: number): void {
    const startY = obj.position.y;
    const startTime = performance.now();
    const duration = 200;

    const tick = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      obj.position.y = startY + (targetY - startY) * eased;
      if (t < 1) requestAnimationFrame(tick);
    };
    tick();
  }

  // ============ 温度色阶渲染 ============

  private _renderTemperature(slice: SliceData, yPos: number): void {
    const G = slice.gridSize;
    const halfSize = WORLD_SIZE / 2;
    const cellSize = WORLD_SIZE / (G - 1);

    if (this.tempPlane) {
      this.sliceGroup.remove(this.tempPlane);
      if (this.tempGeometry) {
        this.tempGeometry.dispose();
      }
      (this.tempPlane.material as THREE.Material).dispose();
    }

    const geometry = new THREE.PlaneGeometry(
      WORLD_SIZE, WORLD_SIZE,
      G - 1, G - 1
    );
    this.tempGeometry = geometry;

    const colors: number[] = [];
    const position = geometry.attributes.position;
    const tempRange = this._calcTempRange(slice);

    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getY(i);

      const gi = Math.round((x + halfSize) / cellSize);
      const gj = Math.round((z + halfSize) / cellSize);

      const clampedI = Math.max(0, Math.min(G - 1, gi));
      const clampedJ = Math.max(0, Math.min(G - 1, gj));

      const t = slice.temperature[clampedJ][clampedI];
      const color = tempToColor(t, tempRange[0], tempRange[1]);

      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.tempPlane = new THREE.Mesh(geometry, material);
    this.tempPlane.rotation.x = -Math.PI / 2;
    this.tempPlane.position.y = yPos + 0.005;
    this.tempPlane.renderOrder = 10;
    this.sliceGroup.add(this.tempPlane);
  }

  private _calcTempRange(slice: SliceData): [number, number] {
    const stats = slice.stats;
    const padding = Math.max(2, (stats.temp_max - stats.temp_min) * 0.1);
    return [stats.temp_min - padding, stats.temp_max + padding];
  }

  // ============ 气压等高线渲染 ============

  private _renderContours(slice: SliceData, yPos: number): void {
    if (this.contourLines) {
      this.sliceGroup.remove(this.contourLines);
      this.contourLines.geometry.dispose();
      (this.contourLines.material as THREE.Material).dispose();
    }

    const stats = slice.stats;
    const minP = stats.pressure_min;
    const maxP = stats.pressure_max;
    const levelCount = 10;
    const levels: number[] = [];

    for (let i = 0; i <= levelCount; i++) {
      levels.push(minP + (maxP - minP) * (i / levelCount));
    }

    const contours = extractContours(slice.pressure, levels);
    const halfSize = WORLD_SIZE / 2;
    const cellSize = WORLD_SIZE / (slice.gridSize - 1);

    const allPositions: number[] = [];
    const allColors: number[] = [];

    for (let li = 0; li < levels.length; li++) {
      const level = levels[li];
      const segments = contours.get(level)!;
      const tNorm = li / levels.length;

      const r = 0.9 + tNorm * 0.1;
      const g = 0.95;
      const b = 1.0;
      const opacity = 0.25 + tNorm * 0.35;

      for (const [p1, p2] of segments) {
        const x1 = -halfSize + p1.x * cellSize;
        const z1 = -halfSize + p1.y * cellSize;
        const x2 = -halfSize + p2.x * cellSize;
        const z2 = -halfSize + p2.y * cellSize;

        allPositions.push(
          x1, yPos + 0.01, z1,
          x2, yPos + 0.01, z2
        );
        allColors.push(
          r, g, b, opacity,
          r, g, b, opacity
        );
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(allPositions, 3)
    );

    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45
    });

    this.contourLines = new THREE.LineSegments(geometry, material);
    this.contourLines.renderOrder = 11;
    this.sliceGroup.add(this.contourLines);
  }

  // ============ 风速粒子箭头渲染 ============

  private _renderWindArrows(slice: SliceData, yPos: number): void {
    // 清空旧的箭头
    while (this.arrowGroup.children.length > 0) {
      const child = this.arrowGroup.children[0];
      this.arrowGroup.remove(child);
      if ((child as any).geometry) (child as any).geometry.dispose();
      if ((child as any).material) {
        const mat = (child as any).material;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose());
        else mat.dispose();
      }
    }

    const G = slice.gridSize;
    const halfSize = WORLD_SIZE / 2;
    const cellSize = WORLD_SIZE / (G - 1);
    const step = GRID_VIS_SPACING;

    // 最大风速（用于归一化）
    const maxWind = Math.max(
      slice.stats.wind_max,
      slice.stats.wind_mean * 2.5
    );

    // 共享几何体（性能优化）
    const sharedShaftGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 6);
    sharedShaftGeo.translate(0, 0.5, 0);

    const sharedHeadGeo = new THREE.ConeGeometry(0.035, 0.12, 6);
    sharedHeadGeo.translate(0, 0.94, 0);

    for (let y = 0; y < G; y += step) {
      for (let x = 0; x < G; x += step) {
        const u = slice.wind_u[y][x];
        const v = slice.wind_v[y][x];
        const speed = slice.wind_speed[y][x];

        if (speed < 0.3) continue;

        // 位置
        const px = -halfSize + x * cellSize;
        const pz = -halfSize + y * cellSize;

        // 箭头长度（归一化）
        const normalizedLen = Math.min(1, speed / maxWind);
        const length = ARROW_MIN_LENGTH + normalizedLen * (ARROW_MAX_LENGTH - ARROW_MIN_LENGTH);

        // 风向角度（绕 Y 轴旋转）
        // wind_u 是 X方向(东), wind_v 是 Y方向(北) -> 注意与3D坐标的映射
        const angle = Math.atan2(u, v);

        // 颜色：由速度决定（慢蓝快青到白）
        const speedT = Math.min(1, speed / maxWind);
        const arrowColor = new THREE.Color().lerpColors(
          new THREE.Color(0x0066ff),
          new THREE.Color(0x00ffdd),
          speedT
        );

        // 创建箭头 Group
        const arrow = this._createArrow(
          sharedShaftGeo,
          sharedHeadGeo,
          length,
          arrowColor,
          speedT
        );

        arrow.position.set(px, yPos + 0.02, pz);
        arrow.rotation.y = angle;

        this.arrowGroup.add(arrow);
      }
    }
  }

  private _createArrow(
    shaftGeo: THREE.CylinderGeometry,
    headGeo: THREE.ConeGeometry,
    length: number,
    color: THREE.Color,
    glowT: number
  ): THREE.Group {
    const group = new THREE.Group();

    const shaftMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75 + glowT * 0.25
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.scale.y = length * 0.82;
    group.add(shaft);

    const headMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85 + glowT * 0.15
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = length * 0.82;
    const headScale = 0.7 + glowT * 0.5;
    head.scale.set(headScale, length * 0.18 / 0.12, headScale);
    group.add(head);

    return group;
  }

  // ============ 每帧更新（用于粒子微动画） ============

  update(delta: number): void {
    const t = performance.now() * 0.001;

    // 箭头轻微脉冲动画（表示风的流动感）
    for (let i = 0; i < this.arrowGroup.children.length; i++) {
      const arrow = this.arrowGroup.children[i];
      const pulse = 1 + Math.sin(t * 3 + i * 0.7) * 0.04;
      arrow.scale.setScalar(pulse);
    }

    // 切割平面边框闪烁
    if (this.cutPlane) {
      const border = this.cutPlane.children[0] as THREE.LineSegments;
      if (border && border.material) {
        const mat = border.material as THREE.LineBasicMaterial;
        mat.opacity = 0.6 + Math.sin(t * 2) * 0.2;
      }
    }
  }

  // ============ 资源清理 ============

  dispose(): void {
    this.scene.remove(this.rootGroup);
    this.rootGroup.traverse((obj) => {
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        const mat = (obj as any).material;
        if (Array.isArray(mat)) mat.forEach((m: THREE.Material) => m.dispose());
        else mat.dispose();
      }
    });
  }
}
