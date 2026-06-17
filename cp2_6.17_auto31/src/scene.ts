import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { MetricData, Thresholds, METRIC_KEYS, METRIC_COLORS, METRIC_LABELS, HISTORY_SIZE, HistoryPoint, FLASH_PERIOD } from './dataStream';

const PILLAR_RADIUS = 0.3;
const MAX_HEIGHT = 5;
const SPHERE_RADIUS = 0.2;
const RING_RADIUS = 0.6;
const RING_TUBE = 0.02;
const PILLAR_X: Record<keyof MetricData, number> = { cpu: -3, memory: 0, network: 3 };
const LERP_SPEED = 15;
const CHART_WIDTH = 320;
const CHART_HEIGHT = 180;

interface PillarGroup {
  key: keyof MetricData;
  group: THREE.Group;
  pillar: THREE.Mesh;
  sphere: THREE.Mesh;
  rings: THREE.Mesh[];
  thresholdLine: THREE.Mesh;
  valueDiv: HTMLDivElement;
  targetHeight: number;
  currentHeight: number;
  isOverThreshold: boolean;
  flashTimer: number;
  baseColor: THREE.Color;
  alertColor: THREE.Color;
  currentColor: THREE.Color;
  thresholdHeight: number;
}

export class MonitorScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private controls: OrbitControls;
  private pillars: PillarGroup[] = [];
  private clock: THREE.Clock;
  private animId = 0;
  private container: HTMLElement;
  private chartPanel: HTMLDivElement;
  private chartCanvas: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D;
  private history: HistoryPoint[] = [];
  private flashOn = false;
  private flashTimer = 0;
  private onFlashChange: ((on: boolean) => void) | null = null;

  constructor(container: HTMLElement, onFlashChange?: (on: boolean) => void) {
    this.container = container;
    this.clock = new THREE.Clock();
    if (onFlashChange) this.onFlashChange = onFlashChange;

    this.scene = new THREE.Scene();
    this.scene.background = this.createGradient();

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 6, 10);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '0';
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0';
    this.labelRenderer.domElement.style.left = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.labelRenderer.domElement.style.zIndex = '1';
    container.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 2, 0);
    this.controls.update();

    this.addLights();
    this.addGrid();
    this.addPillars();
    this.addChartPanel();

    window.addEventListener('resize', this.onResize);
    this.animate();
  }

  private createGradient(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, '#0a0a2e');
    g.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 512);
    return new THREE.CanvasTexture(c);
  }

  private addLights(): void {
    this.scene.add(new THREE.AmbientLight(0x404060, 1.5));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    this.scene.add(dir);
    const p1 = new THREE.PointLight(0x00ffff, 0.5, 20);
    p1.position.set(-3, 5, 2);
    this.scene.add(p1);
    const p2 = new THREE.PointLight(0xaa66ff, 0.5, 20);
    p2.position.set(3, 5, 2);
    this.scene.add(p2);
  }

  private addGrid(): void {
    const grid = new THREE.GridHelper(10, 20, 0x333333, 0x333333);
    const mat = grid.material as THREE.Material;
    mat.opacity = 0.5;
    mat.transparent = true;
    this.scene.add(grid);
  }

  private addPillars(): void {
    METRIC_KEYS.forEach(key => {
      const colorHex = METRIC_COLORS[key];
      const base = new THREE.Color(colorHex);
      const alert = new THREE.Color('#ff3333');
      const x = PILLAR_X[key];

      const group = new THREE.Group();
      group.position.set(x, 0, 0);

      const pillarGeo = new THREE.CylinderGeometry(PILLAR_RADIUS, PILLAR_RADIUS, 1, 16);
      pillarGeo.translate(0, 0.5, 0);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: base, emissive: base, emissiveIntensity: 0.5,
        metalness: 0.3, roughness: 0.4, transparent: true, opacity: 0.9,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.scale.y = 0.01;
      group.add(pillar);

      const sphereGeo = new THREE.SphereGeometry(SPHERE_RADIUS, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: base, emissive: base, emissiveIntensity: 0.8,
        metalness: 0.3, roughness: 0.2,
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.y = 0.01;
      group.add(sphere);

      const rings: THREE.Mesh[] = [];
      for (let i = 0; i < 4; i++) {
        const rGeo = new THREE.TorusGeometry(RING_RADIUS, RING_TUBE, 8, 32);
        const rMat = new THREE.MeshBasicMaterial({ color: base, transparent: true, opacity: 0.3 });
        const ring = new THREE.Mesh(rGeo, rMat);
        ring.rotation.x = Math.PI / 2 + (i % 2 === 0 ? 0.15 : -0.15);
        ring.position.y = 0.5 + i * 1.2;
        ring.userData.speed = (2 * Math.PI) / 0.5;
        ring.userData.offset = i * (Math.PI / 4);
        group.add(ring);
        rings.push(ring);
      }

      const tGeo = new THREE.BoxGeometry(1.2, 0.03, 0.03);
      const tMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });
      const thresholdLine = new THREE.Mesh(tGeo, tMat);
      group.add(thresholdLine);

      const labelDiv = document.createElement('div');
      labelDiv.style.cssText = `color:white;font-size:14px;font-family:monospace;text-align:center;text-shadow:0 0 8px ${colorHex}`;
      const nameEl = document.createElement('div');
      nameEl.textContent = METRIC_LABELS[key];
      nameEl.style.fontWeight = 'bold';
      labelDiv.appendChild(nameEl);
      const valueDiv = document.createElement('div');
      valueDiv.textContent = '0.0';
      labelDiv.appendChild(valueDiv);
      const labelObj = new CSS2DObject(labelDiv);
      labelObj.position.set(0, -0.3, 0);
      group.add(labelObj);

      this.scene.add(group);

      this.pillars.push({
        key, group, pillar, sphere, rings, thresholdLine, valueDiv,
        targetHeight: 0, currentHeight: 0, isOverThreshold: false,
        flashTimer: 0, baseColor: base, alertColor: alert,
        currentColor: base.clone(), thresholdHeight: 0,
      });
    });
  }

  private addChartPanel(): void {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: ${CHART_WIDTH}px;
      height: ${CHART_HEIGHT}px;
      background: rgba(20, 20, 30, 0.85);
      border: 1px solid #446;
      border-radius: 12px;
      padding: 8px;
      z-index: 10;
      pointer-events: none;
      box-shadow: 0 0 20px rgba(102, 102, 255, 0.2);
      max-width: calc(100vw - 32px);
      box-sizing: border-box;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      color: #aabbff;
      font-size: 11px;
      font-family: monospace;
      margin-bottom: 4px;
      text-shadow: 0 0 4px #6666ff;
    `;
    title.textContent = '◈ DATA TREND';
    panel.appendChild(title);

    const canvas = document.createElement('canvas');
    canvas.width = CHART_WIDTH - 16;
    canvas.height = CHART_HEIGHT - 28;
    canvas.style.width = '100%';
    canvas.style.height = `calc(100% - 16px)`;
    panel.appendChild(canvas);

    const legend = document.createElement('div');
    legend.style.cssText = `
      position: absolute;
      top: 8px;
      right: 10px;
      display: flex;
      gap: 8px;
      font-size: 10px;
      font-family: monospace;
    `;
    METRIC_KEYS.forEach(key => {
      const item = document.createElement('span');
      item.style.cssText = `color: ${METRIC_COLORS[key]}; text-shadow: 0 0 4px ${METRIC_COLORS[key]};`;
      item.textContent = METRIC_LABELS[key];
      legend.appendChild(item);
    });
    panel.appendChild(legend);

    this.container.appendChild(panel);

    this.chartPanel = panel;
    this.chartCanvas = canvas;
    this.chartCtx = canvas.getContext('2d')!;
    this.drawChart();
  }

  private drawChart(): void {
    const ctx = this.chartCtx;
    const w = this.chartCanvas.width;
    const h = this.chartCanvas.height;
    const padL = 28;
    const padR = 6;
    const padT = 4;
    const padB = 18;
    const chartW = w - padL - padR;
    const chartH = h - padT - padB;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(100, 100, 130, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(160, 160, 190, 0.7)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const val = 100 - i * 25;
      const y = padT + (chartH / 4) * i;
      ctx.fillText(String(val), padL - 4, y);
    }

    const hist = this.history;
    const n = hist.length;
    if (n < 2) {
      ctx.fillStyle = 'rgba(160, 160, 190, 0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('waiting for data...', w / 2, h / 2);
      return;
    }

    const nowMs = hist[n - 1].timestamp;
    const startMs = hist[0].timestamp;
    const totalSpan = Math.max(1, nowMs - startMs);
    const xStep = chartW / (HISTORY_SIZE - 1);

    METRIC_KEYS.forEach(key => {
      const color = METRIC_COLORS[key];
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      hist.forEach((pt, i) => {
        const rel = (pt.timestamp - startMs) / totalSpan;
        const x = padL + rel * chartW + (HISTORY_SIZE - n) * xStep;
        const y = padT + chartH - (pt.data[key] / 100) * chartH;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    ctx.fillStyle = 'rgba(160, 160, 190, 0.7)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const visibleLabels = Math.min(5, n);
    for (let i = 0; i < visibleLabels; i++) {
      const idx = Math.floor(i * (n - 1) / Math.max(1, visibleLabels - 1));
      const pt = hist[idx];
      const rel = (pt.timestamp - startMs) / totalSpan;
      const x = padL + rel * chartW + (HISTORY_SIZE - n) * xStep;
      const secondsAgo = ((nowMs - pt.timestamp) / 1000).toFixed(1);
      ctx.fillText(`${secondsAgo}s`, x, padT + chartH + 2);
    }
  }

  updateData(data: MetricData, thresholds: Thresholds, history: HistoryPoint[]): void {
    this.history = history;
    this.pillars.forEach(p => {
      const v = data[p.key];
      const t = thresholds[p.key];
      p.targetHeight = (v / 100) * MAX_HEIGHT;
      p.isOverThreshold = v > t;
      p.thresholdHeight = (t / 100) * MAX_HEIGHT;
      p.thresholdLine.position.y = p.thresholdHeight;
      p.valueDiv.textContent = v.toFixed(1);
    });
    this.drawChart();
  }

  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  };

  private animate = (): void => {
    this.animId = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    const t = this.clock.getElapsedTime();

    this.controls.update();

    this.flashTimer += dt;
    const newFlashOn = Math.floor(this.flashTimer / FLASH_PERIOD) % 2 === 0;
    if (newFlashOn !== this.flashOn) {
      this.flashOn = newFlashOn;
      if (this.onFlashChange) this.onFlashChange(this.flashOn);
    }

    this.pillars.forEach(p => {
      const f = 1 - Math.exp(-LERP_SPEED * dt);
      p.currentHeight += (p.targetHeight - p.currentHeight) * f;
      const h = Math.max(0.01, p.currentHeight);

      p.pillar.scale.y = h;
      p.sphere.position.y = h;

      const target = p.isOverThreshold ? p.alertColor : p.baseColor;
      p.currentColor.lerp(target, f);

      const pm = p.pillar.material as THREE.MeshStandardMaterial;
      pm.color.copy(p.currentColor);
      pm.emissive.copy(p.currentColor);

      const sm = p.sphere.material as THREE.MeshStandardMaterial;
      sm.color.copy(p.currentColor);
      sm.emissive.copy(p.currentColor);

      if (p.isOverThreshold) {
        pm.emissiveIntensity = this.flashOn ? 1.5 : 0.2;
        sm.emissiveIntensity = this.flashOn ? 2.0 : 0.3;
      } else {
        p.flashTimer = 0;
        pm.emissiveIntensity = 0.5;
        sm.emissiveIntensity = 0.8;
      }

      p.rings.forEach((ring, i) => {
        ring.position.y = h * (0.2 + i * 0.2);
        ring.rotation.z = ring.userData.offset + t * ring.userData.speed;
        (ring.material as THREE.MeshBasicMaterial).color.copy(p.currentColor);
      });
    });

    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };

  dispose(): void {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animId);
    this.controls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.container.removeChild(this.renderer.domElement);
    }
    if (this.labelRenderer.domElement.parentNode) {
      this.container.removeChild(this.labelRenderer.domElement);
    }
    if (this.chartPanel && this.chartPanel.parentNode) {
      this.container.removeChild(this.chartPanel);
    }
  }
}
