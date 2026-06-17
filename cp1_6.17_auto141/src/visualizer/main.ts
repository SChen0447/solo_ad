import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DataLoader, type VolumeData, type MetadataResponse } from '../utils/dataLoader.js';
import { UIController } from '../components/uiController.js';

const REFLECTIVITY_COLORMAP: [number, number, number, number][] = [
  [0.00, 10, 30, 120, 0.02],
  [0.15, 20, 80, 200, 0.08],
  [0.30, 0, 160, 200, 0.18],
  [0.45, 0, 210, 120, 0.30],
  [0.60, 80, 230, 40, 0.45],
  [0.75, 220, 220, 0, 0.60],
  [0.85, 255, 140, 0, 0.75],
  [0.95, 255, 40, 20, 0.88],
  [1.00, 200, 0, 0, 0.95],
];

function reflectivityToRGBA(value: number): [number, number, number, number] {
  const t = Math.max(0, Math.min(1, value / 255));
  for (let i = 1; i < REFLECTIVITY_COLORMAP.length; i++) {
    const [t0, r0, g0, b0, a0] = REFLECTIVITY_COLORMAP[i - 1];
    const [t1, r1, g1, b1, a1] = REFLECTIVITY_COLORMAP[i];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      return [
        r0 + (r1 - r0) * f,
        g0 + (g1 - g0) * f,
        b0 + (b1 - b0) * f,
        a0 + (a1 - a0) * f,
      ];
    }
  }
  const last = REFLECTIVITY_COLORMAP[REFLECTIVITY_COLORMAP.length - 1];
  return [last[1], last[2], last[3], last[4]];
}

class RadarVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private dataLoader: DataLoader;
  private uiController: UIController;

  private volumeMesh: THREE.InstancedMesh | null = null;
  private clippingPlanes: Map<string, THREE.Plane> = new Map();
  private clippingMeshes: Map<string, THREE.Mesh> = new Map();
  private contourCanvases: Map<string, HTMLCanvasElement> = new Map();

  private currentFrame: VolumeData | null = null;
  private allFrames: Map<string, VolumeData> = new Map();
  private timestamps: string[] = [];
  private currentTimestamp: string = '';
  private isPlaying: boolean = false;
  private playInterval: ReturnType<typeof setInterval> | null = null;

  private gridHelper: THREE.GridHelper;
  private animationId: number = 0;

  private readonly VOXEL_SIZE = 4;
  private readonly DOWNSAMPLE = 4;

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e1a);
    this.scene.fog = new THREE.FogExp2(0x0a0e1a, 0.0004);

    this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.5, 5000);
    this.camera.position.set(200, 180, 280);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 1500;
    this.controls.target.set(0, 60, 0);

    const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 200, 150);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0x4488cc, 0.3);
    dirLight2.position.set(-100, 50, -100);
    this.scene.add(dirLight2);

    this.gridHelper = new THREE.GridHelper(400, 40, 0x1a2a4a, 0x0f1a30);
    this.gridHelper.material.opacity = 0.3;
    this.gridHelper.material.transparent = true;
    this.scene.add(this.gridHelper);

    this.addAxesIndicator();

    this.dataLoader = new DataLoader();

    this.uiController = new UIController({
      onUpload: (files: FileList) => this.handleUpload(files),
      onClippingToggle: (axis: string, enabled: boolean) => this.toggleClipping(axis, enabled),
      onTimeChange: (index: number) => this.handleTimeChange(index),
      onPlayToggle: () => this.togglePlay(),
      onResetView: () => this.resetView(),
    });

    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  private addAxesIndicator(): void {
    const axisLen = 30;
    const positions = [
      [axisLen, 0, 0], [0, axisLen, 0], [0, 0, axisLen],
    ];
    const colors = [0xff4444, 0x44ff44, 0x4488ff];
    const labels = ['X', 'Y', 'Z'];

    positions.forEach((pos, i) => {
      const geom = new THREE.CylinderGeometry(0.5, 0.5, axisLen, 6);
      const mat = new THREE.MeshBasicMaterial({ color: colors[i] });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(pos[0] / 2, pos[1] / 2 + 0.5, pos[2] / 2);
      if (i === 0) mesh.rotation.z = -Math.PI / 2;
      if (i === 2) mesh.rotation.x = Math.PI / 2;
      this.scene.add(mesh);
    });
  }

  private async handleUpload(files: FileList): Promise<void> {
    const loading = document.getElementById('loading')!;
    loading.classList.add('visible');

    try {
      const uploadResult = await this.dataLoader.uploadFiles(files);
      if (!uploadResult.success) {
        alert('上传失败，请检查文件格式');
        return;
      }

      const metadata = await this.dataLoader.fetchMetadata();
      this.timestamps = metadata.timestamps;
      this.uiController.setTimestamps(metadata.timestamps);

      await this.loadFrame(metadata.timestamps[0]);

      this.updateStatusBar();
    } catch (err) {
      console.error('Upload error:', err);
      this.generateDemoData();
    } finally {
      loading.classList.remove('visible');
    }
  }

  private async loadFrame(timestamp: string): Promise<void> {
    if (this.allFrames.has(timestamp)) {
      this.currentFrame = this.allFrames.get(timestamp)!;
    } else {
      const metadata = await this.dataLoader.fetchMetadata();
      const sliceCount = metadata.interpolated_levels.length;
      const firstSlice = await this.dataLoader.fetchSlice(timestamp, metadata.interpolated_levels[0]);
      if (!firstSlice) {
        this.generateDemoData();
        return;
      }

      const w = firstSlice.width;
      const h = firstSlice.height;
      const depth = Math.min(sliceCount, 200);
      const ds = this.DOWNSAMPLE;
      const dw = Math.floor(w / ds);
      const dh = Math.floor(h / ds);
      const volumeData = new Uint8Array(dw * dh * depth);

      for (let z = 0; z < depth; z++) {
        const level = metadata.interpolated_levels[Math.floor(z * sliceCount / depth)];
        const slice = z === 0 ? firstSlice : await this.dataLoader.fetchSlice(timestamp, level);
        if (!slice) continue;
        const src = slice.data;
        for (let y = 0; y < dh; y++) {
          for (let x = 0; x < dw; x++) {
            const si = (y * ds * w + x * ds) * 4;
            const gray = src[si];
            volumeData[z * dw * dh + y * dw + x] = gray;
          }
        }
      }

      this.currentFrame = { width: dw, height: dh, depth, data: volumeData };
      this.allFrames.set(timestamp, this.currentFrame);
    }

    this.currentTimestamp = timestamp;
    this.renderVolume(this.currentFrame);
    this.uiController.setCurrentTime(timestamp);
  }

  private renderVolume(volume: VolumeData): void {
    if (this.volumeMesh) {
      this.scene.remove(this.volumeMesh);
      this.volumeMesh.geometry.dispose();
      (this.volumeMesh.material as THREE.Material).dispose();
      this.volumeMesh = null;
    }

    const { width, height, depth, data } = volume;
    const vs = this.VOXEL_SIZE;
    const threshold = 15;

    const positions: [number, number, number][] = [];
    const colors: number[] = [];
    const opacities: number[] = [];

    for (let z = 0; z < depth; z++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const val = data[z * width * height + y * width + x];
          if (val < threshold) continue;
          const [r, g, b, a] = reflectivityToRGBA(val);
          if (a < 0.03) continue;
          positions.push([x, z, y]);
          colors.push(r / 255, g / 255, b / 255);
          opacities.push(a);
        }
      }
    }

    const count = positions.length;
    if (count === 0) return;

    const geometry = new THREE.BoxGeometry(vs, vs, vs);
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      side: THREE.DoubleSide,
      clippingPlanes: Array.from(this.clippingPlanes.values()),
    });

    this.volumeMesh = new THREE.InstancedMesh(geometry, material, count);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const instanceColor = new Float32Array(count * 3);
    const centerX = width * vs / 2;
    const centerZ = height * vs / 2;

    for (let i = 0; i < count; i++) {
      const [px, py, pz] = positions[i];
      dummy.position.set(px * vs - centerX, py * vs, pz * vs - centerZ);
      dummy.updateMatrix();
      this.volumeMesh.setMatrixAt(i, dummy.matrix);
      color.setRGB(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]);
      instanceColor[i * 3] = colors[i * 3];
      instanceColor[i * 3 + 1] = colors[i * 3 + 1];
      instanceColor[i * 3 + 2] = colors[i * 3 + 2];
    }

    this.volumeMesh.instanceMatrix.needsUpdate = true;
    this.volumeMesh.instanceColor = new THREE.InstancedBufferAttribute(instanceColor, 3);
    this.volumeMesh.instanceColor.needsUpdate = true;

    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         gl_FragColor.a = diffuseColor.a * 0.85;`
      );
      const opacityAttr = new Float32Array(opacities);
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
         attribute float instanceOpacity;`
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         diffuseColor.a *= instanceOpacity;`
      );
      geometry.setAttribute('instanceOpacity', new THREE.InstancedBufferAttribute(opacityAttr, 1));
    };

    this.scene.add(this.volumeMesh);

    document.getElementById('status-voxels')!.textContent = count.toLocaleString();
  }

  private toggleClipping(axis: string, enabled: boolean): void {
    const key = axis.toLowerCase();

    if (enabled) {
      let plane: THREE.Plane;
      let mesh: THREE.Mesh;

      if (key === 'x') {
        plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
        const geom = new THREE.PlaneGeometry(400, 400);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x888899,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(0, 100, 0);
      } else if (key === 'y') {
        plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
        const geom = new THREE.PlaneGeometry(400, 400);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x888899,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        mesh = new THREE.Mesh(geom, mat);
        mesh.rotation.x = Math.PI / 2;
        mesh.position.set(0, 100, 0);
      } else {
        plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
        const geom = new THREE.PlaneGeometry(400, 400);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x888899,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(0, 100, 0);
      }

      mesh.userData.axis = key;
      mesh.userData.draggable = true;

      this.clippingPlanes.set(key, plane);
      this.clippingMeshes.set(key, mesh);
      this.scene.add(mesh);

      this.updateClippingOnVolume();

      this.addDragHandler(mesh, plane, key);
      this.addContourOverlay(mesh, key);
    } else {
      this.scene.remove(this.clippingMeshes.get(key)!);
      this.clippingPlanes.delete(key);
      this.clippingMeshes.delete(key);
      this.contourCanvases.delete(key);
      this.updateClippingOnVolume();
    }
  }

  private addDragHandler(mesh: THREE.Mesh, plane: THREE.Plane, axis: string): void {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let dragStart = 0;

    const onPointerDown = (event: PointerEvent) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(mesh);
      if (intersects.length > 0) {
        isDragging = true;
        this.controls.enabled = false;
        dragStart = intersects[0].point[axis as 'x' | 'y' | 'z'];
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!isDragging) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const planeNormal = new THREE.Vector3();
      if (axis === 'x') planeNormal.set(1, 0, 0);
      else if (axis === 'y') planeNormal.set(0, 1, 0);
      else planeNormal.set(0, 0, 1);

      const intersectPlane = new THREE.Plane(planeNormal, 0);
      const point = new THREE.Vector3();
      raycaster.ray.intersectPlane(intersectPlane, point);
      if (point) {
        const val = point[axis as 'x' | 'y' | 'z'];
        mesh.position[axis as 'x' | 'y' | 'z'] = val;
        const negAxis = new THREE.Vector3();
        if (axis === 'x') negAxis.set(-1, 0, 0);
        else if (axis === 'y') negAxis.set(0, -1, 0);
        else negAxis.set(0, 0, -1);
        plane.set(negAxis, -val);
        this.updateContourOverlay(axis);
      }
    };

    const onPointerUp = () => {
      if (isDragging) {
        isDragging = false;
        this.controls.enabled = true;
      }
    };

    this.renderer.domElement.addEventListener('pointerdown', onPointerDown);
    this.renderer.domElement.addEventListener('pointermove', onPointerMove);
    this.renderer.domElement.addEventListener('pointerup', onPointerUp);
  }

  private addContourOverlay(mesh: THREE.Mesh, axis: string): void {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    this.contourCanvases.set(axis, canvas);
    this.updateContourOverlay(axis);
  }

  private updateContourOverlay(axis: string): void {
    const canvas = this.contourCanvases.get(axis);
    const mesh = this.clippingMeshes.get(axis);
    if (!canvas || !mesh || !this.currentFrame) return;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const { width, height, depth, data } = this.currentFrame;
    const pos = mesh.position;
    const vs = this.VOXEL_SIZE;

    let sliceIdx: number;
    let sliceW: number;
    let sliceH: number;

    if (axis === 'x') {
      sliceIdx = Math.floor((pos.x + width * vs / 2) / vs);
      sliceW = depth;
      sliceH = height;
    } else if (axis === 'y') {
      sliceIdx = Math.floor(pos.y / vs);
      sliceW = width;
      sliceH = depth;
    } else {
      sliceIdx = Math.floor((pos.z + height * vs / 2) / vs);
      sliceW = width;
      sliceH = height;
    }

    const cw = canvas.width;
    const ch = canvas.height;

    const imageData = ctx.createImageData(cw, ch);
    const contourData = ctx.createImageData(cw, ch);

    for (let py = 0; py < ch; py++) {
      for (let px = 0; px < cw; px++) {
        const sx = Math.floor(px * sliceW / cw);
        const sy = Math.floor(py * sliceH / ch);
        let val = 0;

        if (axis === 'x' && sliceIdx >= 0 && sliceIdx < width) {
          if (sy < height && sx < depth) {
            val = data[sx * width * height + sy * width + sliceIdx];
          }
        } else if (axis === 'y' && sliceIdx >= 0 && sliceIdx < depth) {
          if (sy < depth && sx < width) {
            val = data[sy * width * height + (sliceIdx) * width + sx];
          }
        } else if (axis === 'z' && sliceIdx >= 0 && sliceIdx < height) {
          if (sy < height && sx < width) {
            val = data[0 * width * height + sy * width + sx];
          }
        }

        const [r, g, b, a] = reflectivityToRGBA(val);
        const idx = (py * cw + px) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = val > 15 ? 100 : 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const levels = [40, 80, 120, 160, 200, 240];
    ctx.lineWidth = 1;
    ctx.font = '10px Rajdhani';

    levels.forEach((level, li) => {
      ctx.strokeStyle = `hsl(${180 - li * 30}, 80%, 60%)`;
      ctx.beginPath();
      for (let py = 0; py < ch; py += 3) {
        for (let px = 0; px < cw; px += 3) {
          const sx = Math.floor(px * sliceW / cw);
          const sy = Math.floor(py * sliceH / ch);
          let val = 0;
          if (axis === 'x' && sliceIdx >= 0 && sliceIdx < width) {
            if (sy < height && sx < depth) val = data[sx * width * height + sy * width + sliceIdx];
          } else if (axis === 'y' && sliceIdx >= 0 && sliceIdx < depth) {
            if (sy < depth && sx < width) val = data[sy * width * height + sliceIdx * width + sx];
          } else if (axis === 'z' && sliceIdx >= 0 && sliceIdx < height) {
            if (sy < height && sx < width) val = data[0 * width * height + sy * width + sx];
          }

          const diff = Math.abs(val - level);
          if (diff < 8) {
            ctx.moveTo(px, py);
            ctx.arc(px, py, 0.5, 0, Math.PI * 2);
          }
        }
      }
      ctx.stroke();

      const labelX = cw - 30;
      const labelY = 15 + li * 14;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fillText(`${level}`, labelX, labelY);
    });
  }

  private updateClippingOnVolume(): void {
    if (!this.volumeMesh) return;
    const mat = this.volumeMesh.material as THREE.MeshPhongMaterial;
    mat.clippingPlanes = Array.from(this.clippingPlanes.values());
    mat.needsUpdate = true;
  }

  private async handleTimeChange(index: number): Promise<void> {
    if (this.timestamps.length === 0) return;
    const ts = this.timestamps[index];
    if (ts === this.currentTimestamp) return;
    await this.loadFrame(ts);
    this.updateStatusBar();
  }

  private togglePlay(): void {
    if (this.isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  }

  private startPlay(): void {
    if (this.timestamps.length < 2) return;
    this.isPlaying = true;
    this.uiController.setPlaying(true);
    this.playInterval = setInterval(() => {
      const idx = this.timestamps.indexOf(this.currentTimestamp);
      const nextIdx = (idx + 1) % this.timestamps.length;
      this.handleTimeChange(nextIdx);
      this.uiController.setTimeSlider(nextIdx);
    }, 1000);
  }

  private stopPlay(): void {
    this.isPlaying = false;
    this.uiController.setPlaying(false);
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  private resetView(): void {
    this.camera.position.set(200, 180, 280);
    this.controls.target.set(0, 60, 0);
    this.controls.update();
  }

  private updateStatusBar(): void {
    const timeEl = document.getElementById('status-time')!;
    const altEl = document.getElementById('status-alt')!;
    timeEl.textContent = this.currentTimestamp || '--';
    altEl.textContent = this.currentFrame ? `0-${this.currentFrame.depth * 50}m` : '--';
  }

  private generateDemoData(): void {
    const w = 64, h = 64, d = 40;
    const data = new Uint8Array(w * h * d);

    for (let z = 0; z < d; z++) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const cx = x - w / 2, cy = y - h / 2, cz = z - d / 2;
          const r = Math.sqrt(cx * cx + cy * cy + cz * cz);
          const maxR = 25 - Math.abs(cz) * 0.3;
          if (r < maxR) {
            const val = Math.max(0, Math.min(255, (1 - r / maxR) * 200 + Math.random() * 30));
            data[z * w * h + y * w + x] = val;
          }
        }
      }
    }

    this.currentFrame = { width: w, height: h, depth: d, data };
    this.timestamps = ['DEMO_1200', 'DEMO_1210', 'DEMO_1220'];
    this.currentTimestamp = this.timestamps[0];
    this.allFrames.set(this.timestamps[0], this.currentFrame);

    for (let t = 1; t < this.timestamps.length; t++) {
      const frameData = new Uint8Array(w * h * d);
      for (let z = 0; z < d; z++) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const cx = x - w / 2 + t * 3, cy = y - h / 2 + t * 2, cz = z - d / 2;
            const r = Math.sqrt(cx * cx + cy * cy + cz * cz);
            const maxR = 25 - Math.abs(cz) * 0.3 + t * 2;
            if (r < maxR) {
              const val = Math.max(0, Math.min(255, (1 - r / maxR) * 180 + Math.random() * 40));
              frameData[z * w * h + y * w + x] = val;
            }
          }
        }
      }
      this.allFrames.set(this.timestamps[t], { width: w, height: h, depth: d, data: frameData });
    }

    this.uiController.setTimestamps(this.timestamps);
    this.renderVolume(this.currentFrame);
    this.updateStatusBar();
  }

  private onResize(): void {
    const container = document.getElementById('canvas-container')!;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

new RadarVisualizer();
