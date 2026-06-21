import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public controls: OrbitControls;
  public earth: THREE.Mesh;
  public earthGroup: THREE.Group;
  public clouds: THREE.Mesh;

  private container: HTMLElement;
  private animationId: number = 0;
  private clock: THREE.Clock;
  private readonly EARTH_RADIUS = 2.0;
  private readonly AXIS_TILT = 23.5 * (Math.PI / 180);

  private onRenderCallbacks: Array<(delta: number) => void> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.earthGroup = new THREE.Group();
    this.earthGroup.rotation.z = this.AXIS_TILT;
    this.scene.add(this.earthGroup);

    this.earth = this.createEarth();
    this.earthGroup.add(this.earth);

    this.clouds = this.createClouds();
    this.earthGroup.add(this.clouds);

    this.createLights();
    this.createStars();

    window.addEventListener('resize', this.onResize.bind(this));
    this.onResize();
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0.8, 6.5);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controls.enablePan = false;
    controls.minDistance = 2.8;
    controls.maxDistance = 12;
    controls.minPolarAngle = Math.PI * 0.15;
    controls.maxPolarAngle = Math.PI * 0.85;
    return controls;
  }

  private createEarth(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.EARTH_RADIUS, 96, 96);

    const earthTexture = this.generateEarthTexture();
    const bumpTexture = this.generateBumpTexture();

    const material = new THREE.MeshPhongMaterial({
      map: earthTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.03,
      specular: new THREE.Color(0x335577),
      shininess: 15,
      emissive: new THREE.Color(0x0a0f1a),
      emissiveIntensity: 0.4
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = -Math.PI / 2.5;
    return mesh;
  }

  private generateEarthTexture(): THREE.Texture {
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0c2d4f');
    gradient.addColorStop(0.3, '#0a3a5c');
    gradient.addColorStop(0.5, '#0e4a6e');
    gradient.addColorStop(0.7, '#0a3a5c');
    gradient.addColorStop(1, '#0c2d4f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const continents = [
      { cx: 0.2, cy: 0.32, rx: 0.12, ry: 0.18, color: '#1a5c3a' },
      { cx: 0.25, cy: 0.55, rx: 0.10, ry: 0.14, color: '#1e6b42' },
      { cx: 0.52, cy: 0.32, rx: 0.16, ry: 0.20, color: '#1f7a4a' },
      { cx: 0.54, cy: 0.58, rx: 0.09, ry: 0.13, color: '#1a6b40' },
      { cx: 0.78, cy: 0.35, rx: 0.14, ry: 0.16, color: '#217a48' },
      { cx: 0.72, cy: 0.62, rx: 0.08, ry: 0.10, color: '#1a6b40' },
      { cx: 0.92, cy: 0.80, rx: 0.07, ry: 0.07, color: '#1a6b40' },
      { cx: 0.45, cy: 0.15, rx: 0.25, ry: 0.06, color: '#b0c4de', alpha: 0.3 },
      { cx: 0.45, cy: 0.92, rx: 0.30, ry: 0.07, color: '#b0c4de', alpha: 0.3 }
    ];

    ctx.save();
    for (let i = 0; i < 40; i++) {
      const lat = (i / 40) * Math.PI - Math.PI / 2;
      const y = (i / 40) * canvas.height;
      const latColor = Math.abs(lat) > 1.0 ? '#0e3d5e' : '#0a4a70';
      ctx.fillStyle = latColor;
      ctx.fillRect(0, y, canvas.width, canvas.height / 40);
    }
    ctx.restore();

    for (const cont of continents) {
      this.drawContinent(ctx, cont.cx * canvas.width, cont.cy * canvas.height,
        cont.rx * canvas.width, cont.ry * canvas.height, cont.color, (cont as any).alpha || 0.85);
    }

    for (let i = 0; i < 60; i++) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      const rr = 10 + Math.random() * 40;
      const g = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
      g.addColorStop(0, `rgba(30, 120, 80, ${0.3 + Math.random() * 0.4})`);
      g.addColorStop(1, 'rgba(30, 120, 80, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }

    for (let y = 0; y < canvas.height; y += 2) {
      for (let x = 0; x < canvas.width; x += 2) {
        const n = (Math.random() - 0.5) * 25;
        const p = ctx.getImageData(x, y, 1, 1).data;
        ctx.fillStyle = `rgba(${Math.min(255, p[0] + n)}, ${Math.min(255, p[1] + n)}, ${Math.min(255, p[2] + n)}, 1)`;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  private drawContinent(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, rx: number, ry: number,
    color: string, alpha: number = 0.9
  ) {
    ctx.save();
    const points = 28;
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const noise = 0.75 + Math.sin(angle * 5 + cx) * 0.12 + Math.cos(angle * 7 + cy) * 0.10 + Math.random() * 0.15;
      const x = cx + Math.cos(angle) * rx * noise;
      const y = cy + Math.sin(angle) * ry * noise;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 0, cx, cy, Math.max(rx, ry) * 1.2);
    grad.addColorStop(0, this.shadeColor(color, 25));
    grad.addColorStop(0.5, color);
    grad.addColorStop(1, this.shadeColor(color, -20));
    ctx.fillStyle = grad;
    ctx.globalAlpha = alpha;
    ctx.fill();

    for (let i = 0; i < 8; i++) {
      const dx = cx + (Math.random() - 0.5) * rx;
      const dy = cy + (Math.random() - 0.5) * ry;
      const dr = Math.min(rx, ry) * (0.1 + Math.random() * 0.25);
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, dr);
      g.addColorStop(0, `rgba(60, 140, 90, ${0.4 + Math.random() * 0.3})`);
      g.addColorStop(1, 'rgba(60, 140, 90, 0)');
      ctx.fillStyle = g;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillRect(dx - dr, dy - dr, dr * 2, dr * 2);
    }
    ctx.restore();
  }

  private shadeColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
    return '#' + (0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1);
  }

  private generateBumpTexture(): THREE.Texture {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 30; i++) {
      const rx = Math.random() * canvas.width;
      const ry = Math.random() * canvas.height;
      const rr = 40 + Math.random() * 180;
      const g = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
      g.addColorStop(0, '#b0b0b0');
      g.addColorStop(1, '#808080');
      ctx.fillStyle = g;
      ctx.fillRect(rx - rr, ry - rr, rr * 2, rr * 2);
    }

    for (let i = 0; i < 1200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const v = 128 + Math.floor((Math.random() - 0.5) * 60);
      ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
      ctx.fillRect(x, y, 2, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createClouds(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.EARTH_RADIUS * 1.015, 64, 64);
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 120; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = 30 + Math.random() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.25 + Math.random() * 0.2})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshPhongMaterial({
      map: texture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createLights(): void {
    const ambient = new THREE.AmbientLight(0x6a8caf, 0.55);
    this.scene.add(ambient);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.6);
    sunLight.position.set(6, 3, 5);
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x4a7cff, 0.45);
    fillLight.position.set(-5, -2, -4);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x9370db, 0.3);
    rimLight.position.set(0, -4, 5);
    this.scene.add(rimLight);
  }

  private createStars(): void {
    const starCount = 3500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const c = 0.7 + Math.random() * 0.3;
      const tint = Math.random();
      if (tint < 0.3) {
        colors[i * 3] = c * 0.8; colors[i * 3 + 1] = c * 0.9; colors[i * 3 + 2] = c;
      } else if (tint < 0.6) {
        colors[i * 3] = c; colors[i * 3 + 1] = c * 0.95; colors[i * 3 + 2] = c * 0.85;
      } else {
        colors[i * 3] = c; colors[i * 3 + 1] = c; colors[i * 3 + 2] = c;
      }
      sizes[i] = 0.4 + Math.random() * 1.2;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starCanvas = document.createElement('canvas');
    starCanvas.width = 64;
    starCanvas.height = 64;
    const sctx = starCanvas.getContext('2d')!;
    const g = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 64, 64);
    const starTex = new THREE.CanvasTexture(starCanvas);

    const mat = new THREE.PointsMaterial({
      size: 0.25,
      map: starTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(geom, mat);
    this.scene.add(stars);
  }

  public onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  public addRenderCallback(cb: (delta: number) => void): void {
    this.onRenderCallbacks.push(cb);
  }

  public removeRenderCallback(cb: (delta: number) => void): void {
    const i = this.onRenderCallbacks.indexOf(cb);
    if (i > -1) this.onRenderCallbacks.splice(i, 1);
  }

  public latLonToVector3(lat: number, lon: number, radius?: number): THREE.Vector3 {
    const r = radius ?? this.EARTH_RADIUS;
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.cos(phi);
    const z = r * Math.sin(phi) * Math.sin(theta);
    const v = new THREE.Vector3(x, y, z);
    return v.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.AXIS_TILT);
  }

  public vector3ToLatLon(vec: THREE.Vector3): { lat: number; lon: number } {
    const v = vec.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), -this.AXIS_TILT);
    const r = v.length();
    const phi = Math.acos(v.y / r);
    const theta = Math.atan2(v.z, -v.x);
    const lat = 90 - phi * (180 / Math.PI);
    const lon = theta * (180 / Math.PI) - 180;
    return { lat, lon };
  }

  public getEarthRadius(): number {
    return this.EARTH_RADIUS;
  }

  public start(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();

      TWEEN.update();
      this.controls.update();

      this.clouds.rotation.y += delta * 0.008;

      for (const cb of this.onRenderCallbacks) {
        try { cb(delta); } catch (e) { console.error(e); }
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
  }

  public projectToScreen(position: THREE.Vector3): { x: number; y: number } {
    const v = position.clone();
    v.project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight
    };
  }

  public isInFrontOfCamera(position: THREE.Vector3): boolean {
    const dir = position.clone().sub(this.camera.position).normalize();
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    return dir.dot(camDir) > 0;
  }
}
