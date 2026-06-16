import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { showTooltip, hideTooltip, createTooltip, type TooltipData } from './uiUtils';
import type { ParsedData } from './dataLoader';

export interface ScatterConfig {
  xColumn: string;
  yColumn: string;
  zColumn: string;
  categoryColumn: string | null;
}

export interface VisualizerParams {
  opacity: number;
  showLabels: boolean;
  backgroundColor: string;
  pointScale: number;
}

const PALETTE = [
  0x4fc3f7, 0xf06292, 0x81c784, 0xffb74d,
  0xba68c8, 0x4db6ac, 0xe57373, 0x64b5f6,
  0xdce775, 0xf48fb1, 0x4dd0e1, 0xffd54f,
];

export class Visualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private instancedMesh: THREE.InstancedMesh | null = null;
  private labelSprites: THREE.Sprite[] = [];
  private axisSprites: THREE.Sprite[] = [];
  private parsedData: ParsedData | null = null;
  private config: ScatterConfig | null = null;
  private params: VisualizerParams = {
    opacity: 0.9,
    showLabels: true,
    backgroundColor: '#0a0a1a',
    pointScale: 1.0,
  };
  private dummy: THREE.Matrix4;
  private colorArray: Float32Array = new Float32Array(0);
  private rowMap: Record<string, string | number>[] = [];
  private hoveredIndex: number = -1;
  private baseScales: Float32Array = new Float32Array(0);
  private animationId: number = 0;
  private initialCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private initialCameraTarget: THREE.Vector3 = new THREE.Vector3();
  private pointBaseSize: number = 5;
  private throttledMouseMove: ((e: MouseEvent) => void) | null = null;
  private lastMoveTime: number = 0;

  constructor(container: HTMLElement) {
    this.dummy = new THREE.Matrix4();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.params.backgroundColor);

    const fogColor = new THREE.Color(this.params.backgroundColor);
    this.scene.fog = new THREE.FogExp2(fogColor, 0.0015);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      20000
    );
    this.camera.position.set(150, 120, 150);
    this.camera.lookAt(0, 0, 0);
    this.initialCameraPosition.copy(this.camera.position);
    this.initialCameraTarget.set(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 5000;
    this.controls.target.set(0, 0, 0);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 1 };
    this.mouse = new THREE.Vector2(-999, -999);

    this.setupLights();
    this.setupGrid();
    createTooltip();
    this.setupMouseEvents(container);

    window.addEventListener('resize', () => this.onResize(container));
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(100, 200, 100);
    this.scene.add(directional);

    const pointLight = new THREE.PointLight(0x4488ff, 0.3, 500);
    pointLight.position.set(-50, 100, -50);
    this.scene.add(pointLight);
  }

  private setupGrid(): void {
    const gridHelper = new THREE.GridHelper(300, 30, 0x222244, 0x111133);
    gridHelper.position.y = -1;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);
  }

  private setupMouseEvents(container: HTMLElement): void {
    container.addEventListener('mousemove', (e: MouseEvent) => {
      const now = Date.now();
      if (now - this.lastMoveTime < 30) return;
      this.lastMoveTime = now;

      const rect = container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.checkHover(e.clientX, e.clientY);
    });

    container.addEventListener('mouseleave', () => {
      this.mouse.set(-999, -999);
      this.resetHover();
      hideTooltip();
    });
  }

  private checkHover(clientX: number, clientY: number): void {
    if (!this.instancedMesh || !this.parsedData) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.instancedMesh);

    if (intersects.length > 0) {
      const idx = intersects[0].instanceId ?? -1;
      if (idx >= 0 && idx < this.rowMap.length) {
        if (this.hoveredIndex !== idx) {
          this.resetHover();
          this.hoveredIndex = idx;
          const scale = this.baseScales[idx] * 1.5;
          this.dummy.makeScale(scale, scale, scale);
          const pos = new THREE.Vector3();
          const quat = new THREE.Quaternion();
          this.instancedMesh.getMatrixAt(idx, this.dummy);
          pos.setFromMatrixPosition(this.dummy);
          this.dummy.makeScale(scale, scale, scale);
          this.dummy.setPosition(pos);
          this.instancedMesh.setMatrixAt(idx, this.dummy);
          this.instancedMesh.instanceMatrix.needsUpdate = true;
        }

        const rowData = this.rowMap[idx];
        const fields: TooltipData['fields'] = [];
        for (const key of Object.keys(rowData)) {
          fields.push({ key, value: rowData[key] as string | number });
        }
        showTooltip({ x: clientX, y: clientY, fields });
      }
    } else {
      this.resetHover();
      hideTooltip();
    }
  }

  private resetHover(): void {
    if (this.hoveredIndex >= 0 && this.instancedMesh && this.hoveredIndex < this.rowMap.length) {
      const scale = this.baseScales[this.hoveredIndex];
      const pos = new THREE.Vector3();
      this.instancedMesh.getMatrixAt(this.hoveredIndex, this.dummy);
      pos.setFromMatrixPosition(this.dummy);
      this.dummy.makeScale(scale, scale, scale);
      this.dummy.setPosition(pos);
      this.instancedMesh.setMatrixAt(this.hoveredIndex, this.dummy);
      this.instancedMesh.instanceMatrix.needsUpdate = true;
      this.hoveredIndex = -1;
    }
  }

  buildScatter(data: ParsedData, config: ScatterConfig): void {
    this.parsedData = data;
    this.config = config;

    this.clearScene();

    const rows = data.rows;
    const count = rows.length;
    if (count === 0) return;

    const xValues = rows.map((r) => Number(r[config.xColumn]) || 0);
    const yValues = rows.map((r) => Number(r[config.yColumn]) || 0);
    const zValues = rows.map((r) => Number(r[config.zColumn]) || 0);

    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues);

    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const zRange = zMax - zMin || 1;

    const scale = 100;

    const categoryMap = new Map<string, number>();
    if (config.categoryColumn) {
      let ci = 0;
      for (const row of rows) {
        const cat = String(row[config.categoryColumn] ?? 'unknown');
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, ci % PALETTE.length);
          ci++;
        }
      }
    }

    const density = Math.max(1, count);
    this.pointBaseSize = Math.max(2, Math.min(8, 500 / Math.sqrt(density)));

    const geometry = new THREE.SphereGeometry(1, 12, 8);
    const material = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: this.params.opacity,
      shininess: 60,
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    this.instancedMesh.userData = { isScatterPlot: true };

    this.colorArray = new Float32Array(count * 3);
    this.baseScales = new Float32Array(count);
    this.rowMap = rows;

    const color = new THREE.Color();
    const position = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const x = ((xValues[i] - xMin) / xRange - 0.5) * scale;
      const y = ((yValues[i] - yMin) / yRange - 0.5) * scale;
      const z = ((zValues[i] - zMin) / zRange - 0.5) * scale;
      position.set(x, y, z);

      const s = this.pointBaseSize * this.params.pointScale;
      this.baseScales[i] = s;

      this.dummy.makeScale(s, s, s);
      this.dummy.setPosition(position);
      this.instancedMesh.setMatrixAt(i, this.dummy);

      if (config.categoryColumn) {
        const cat = String(rows[i][config.categoryColumn] ?? 'unknown');
        const paletteIdx = categoryMap.get(cat) ?? 0;
        color.set(PALETTE[paletteIdx]);
      } else {
        color.set(PALETTE[i % PALETTE.length]);
      }

      this.colorArray[i * 3] = color.r;
      this.colorArray[i * 3 + 1] = color.g;
      this.colorArray[i * 3 + 2] = color.b;
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(this.colorArray, 3);
    this.scene.add(this.instancedMesh);

    this.createAxisLabels(config, scale);

    this.camera.position.set(scale * 1.2, scale * 0.9, scale * 1.2);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.initialCameraPosition.copy(this.camera.position);
    this.initialCameraTarget.set(0, 0, 0);
    this.controls.update();

    this.updateStats(data, config, categoryMap);
  }

  private createAxisLabels(config: ScatterConfig, scale: number): void {
    this.clearAxisLabels();

    const halfScale = scale / 2 + 10;
    const labels = [
      { text: config.xColumn, pos: new THREE.Vector3(halfScale, -5, 0) },
      { text: config.yColumn, pos: new THREE.Vector3(0, halfScale, 0) },
      { text: config.zColumn, pos: new THREE.Vector3(0, -5, halfScale) },
    ];

    for (const label of labels) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#cccccc';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label.text, 128, 32);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.8 });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(label.pos);
      sprite.scale.set(20, 5, 1);
      this.scene.add(sprite);
      this.axisSprites.push(sprite);
    }
  }

  private clearAxisLabels(): void {
    for (const sprite of this.axisSprites) {
      this.scene.remove(sprite);
      sprite.material.dispose();
      if ((sprite.material as THREE.SpriteMaterial).map) {
        (sprite.material as THREE.SpriteMaterial).map!.dispose();
      }
    }
    this.axisSprites = [];
  }

  private clearScene(): void {
    if (this.instancedMesh) {
      this.scene.remove(this.instancedMesh);
      this.instancedMesh.geometry.dispose();
      (this.instancedMesh.material as THREE.Material).dispose();
      this.instancedMesh = null;
    }
    this.clearAxisLabels();
    this.hoveredIndex = -1;
  }

  updateOpacity(value: number): void {
    this.params.opacity = value;
    if (this.instancedMesh) {
      (this.instancedMesh.material as THREE.MeshPhongMaterial).opacity = value;
    }
  }

  updateShowLabels(show: boolean): void {
    this.params.showLabels = show;
    for (const sprite of this.axisSprites) {
      sprite.visible = show;
    }
  }

  updateBackgroundColor(color: string): void {
    this.params.backgroundColor = color;
    this.scene.background = new THREE.Color(color);
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.set(color);
    }
  }

  updatePointScale(scale: number): void {
    this.params.pointScale = scale;
    if (!this.instancedMesh) return;

    for (let i = 0; i < this.rowMap.length; i++) {
      const s = Math.max(2, this.pointBaseSize * scale);
      this.baseScales[i] = s;
      const pos = new THREE.Vector3();
      this.instancedMesh.getMatrixAt(i, this.dummy);
      pos.setFromMatrixPosition(this.dummy);
      this.dummy.makeScale(s, s, s);
      this.dummy.setPosition(pos);
      this.instancedMesh.setMatrixAt(i, this.dummy);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  resetCamera(): void {
    const from = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };
    const to = {
      x: this.initialCameraPosition.x,
      y: this.initialCameraPosition.y,
      z: this.initialCameraPosition.z,
    };

    new TWEEN.Tween(from)
      .to(to, 800)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.camera.position.set(from.x, from.y, from.z);
      })
      .start();

    const targetFrom = {
      x: this.controls.target.x,
      y: this.controls.target.y,
      z: this.controls.target.z,
    };
    const targetTo = {
      x: this.initialCameraTarget.x,
      y: this.initialCameraTarget.y,
      z: this.initialCameraTarget.z,
    };

    new TWEEN.Tween(targetFrom)
      .to(targetTo, 800)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate(() => {
        this.controls.target.set(targetFrom.x, targetFrom.y, targetFrom.z);
      })
      .start();
  }

  exportScreenshot(): void {
    this.renderer.render(this.scene, this.camera);
    const dataURL = this.renderer.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'scatter-plot.png';
    link.href = dataURL;
    link.click();
  }

  private updateStats(
    data: ParsedData,
    config: ScatterConfig,
    categoryMap: Map<string, number>
  ): void {
    const statsEl = document.getElementById('stats-panel');
    if (!statsEl) return;

    const rows = data.rows;
    const xValues = rows.map((r) => Number(r[config.xColumn]) || 0);
    const yValues = rows.map((r) => Number(r[config.yColumn]) || 0);
    const zValues = rows.map((r) => Number(r[config.zColumn]) || 0);

    const xMin = Math.min(...xValues).toFixed(2);
    const xMax = Math.max(...xValues).toFixed(2);
    const yMin = Math.min(...yValues).toFixed(2);
    const yMax = Math.max(...yValues).toFixed(2);

    let html = `
      <div class="stat-title"><i class="fas fa-chart-bar"></i> Data Statistics</div>
      <div class="stat-item"><span class="stat-label">Particles:</span> <span class="stat-value">${rows.length}</span></div>
      <div class="stat-item"><span class="stat-label">X Range:</span> <span class="stat-value">${xMin} ~ ${xMax}</span></div>
      <div class="stat-item"><span class="stat-label">Y Range:</span> <span class="stat-value">${yMin} ~ ${yMax}</span></div>
    `;

    if (config.categoryColumn && categoryMap.size > 0) {
      html += `<div class="stat-title" style="margin-top:8px;"><i class="fas fa-palette"></i> Categories</div>`;
      const totalCount = rows.length;
      for (const [cat, paletteIdx] of categoryMap) {
        const catCount = rows.filter(
          (r) => String(r[config.categoryColumn!] ?? 'unknown') === cat
        ).length;
        const pct = ((catCount / totalCount) * 100).toFixed(1);
        const colorHex = '#' + new THREE.Color(PALETTE[paletteIdx]).getHexString();
        html += `
          <div class="stat-category">
            <span class="cat-label" style="color:${colorHex};">${cat}</span>
            <div class="cat-bar-container">
              <div class="cat-bar" style="width:${pct}%; background:${colorHex};"></div>
            </div>
            <span class="cat-pct">${pct}%</span>
          </div>
        `;
      }
    }

    statsEl.innerHTML = html;
  }

  private onResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    TWEEN.update();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.clearScene();
    this.renderer.dispose();
    this.controls.dispose();
  }
}
