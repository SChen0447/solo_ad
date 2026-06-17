import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { windDataService, RegionAnalysis } from './windDataService';
import { InteractionToolkit } from './interactionToolkit';
import { stateManager } from './stateManager';

const EARTH_RADIUS = 1.0;
const ATMOSPHERE_RADIUS = 1.12;

class GlobalWindExplorer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private canvas: HTMLCanvasElement;
  private container: HTMLElement;

  private earthMesh: THREE.Mesh | null = null;
  private atmosphereMesh: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;

  private interactionToolkit: InteractionToolkit | null = null;

  private clock: THREE.Clock;
  private rafId: number | null = null;
  private frameCount = 0;
  private lastFpsTime = 0;
  private fps = 0;

  constructor() {
    this.clock = new THREE.Clock();

    this.container = document.getElementById('app')!;
    const canvasEl = document.getElementById('scene-canvas')! as HTMLCanvasElement;
    this.canvas = canvasEl;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer(canvasEl);
    this.controls = this.createControls();

    this.createStars();
    this.createEarth();
    this.createAtmosphere();
    this.setupLighting();

    this.scene.add(windDataService.getParticleSystem());

    this.interactionToolkit = new InteractionToolkit(
      this.canvas,
      this.camera,
      this.scene,
      this.renderer,
      this.controls,
      {
        onRegionAnalyzed: this.onRegionAnalyzed,
        onClearSelection: this.onClearSelection,
      }
    );
    if (this.earthMesh) {
      this.interactionToolkit.setEarthMesh(this.earthMesh);
    }

    this.canvas.addEventListener('regionSelected', this.handleRegionSelected as EventListener);

    stateManager.subscribe('selectedRegion', (state) => {
      windDataService.highlightParticlesInRegion(state.selectedRegion);
    });

    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = null;
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const fov = 60;
    const aspect = window.innerWidth / window.innerHeight;
    const near = 0.01;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 2.6);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.9;
    controls.panSpeed = 0.7;
    controls.enablePan = false;
    controls.minDistance = 0.5 * EARTH_RADIUS * 2 + 0.3;
    controls.maxDistance = 3.0 * EARTH_RADIUS * 2 + 0.5;
    controls.minDistance = 1.3;
    controls.maxDistance = 7.8;
    controls.minPolarAngle = 0.1;
    controls.maxPolarAngle = Math.PI - 0.1;
    controls.autoRotate = false;
    return controls;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x6688cc, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.15);
    directionalLight.position.set(4, 3, 5);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88aaff, 0.35);
    fillLight.position.set(-5, -2, -3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xaaccff, 0.3);
    rimLight.position.set(0, -4, 2);
    this.scene.add(rimLight);
  }

  private createStars(): void {
    const starCount = 4000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const t = Math.random();
      const c = new THREE.Color();
      if (t < 0.7) {
        c.setRGB(0.9, 0.95, 1.0);
      } else if (t < 0.85) {
        c.setRGB(1.0, 0.9, 0.75);
      } else {
        c.setRGB(0.7, 0.85, 1.0);
      }
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      sizes[i] = 0.25 + Math.random() * 0.75;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;
          float alpha = (1.0 - smoothstep(0.0, 0.5, dist));
          gl_FragColor = vec4(vColor, alpha * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    this.stars = new THREE.Points(geometry, material);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  private createEarth(): void {
    const geometry = new THREE.SphereGeometry(EARTH_RADIUS, 20, 20);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const oceanColor = new THREE.Color(0x1a4d8c);
    const oceanDeep = new THREE.Color(0x0d2e5c);
    const landColor = new THREE.Color(0x2d6a4f);
    const landDark = new THREE.Color(0x1b4332);
    const desertColor = new THREE.Color(0xc9a96a);
    const polarColor = new THREE.Color(0xe8f0f8);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const v = new THREE.Vector3(x, y, z).normalize();
      const lat = (Math.asin(v.y) * 180) / Math.PI;
      const lon = (Math.atan2(v.z, v.x) * 180) / Math.PI;

      const isLand = this.sampleLand(lat, lon);
      const absLat = Math.abs(lat);

      const color = new THREE.Color();
      if (absLat > 78) {
        const t = (absLat - 78) / 12;
        color.lerpColors(isLand ? landDark : oceanDeep, polarColor, Math.min(1, t));
      } else if (isLand) {
        if (absLat < 30 && lon > -20 && lon < 60) {
          color.lerpColors(landColor, desertColor, 0.6);
        } else if (absLat < 20 && lon > 90 && lon < 150) {
          color.lerpColors(landColor, desertColor, 0.25);
        } else if (absLat > 55) {
          const t = (absLat - 55) / 23;
          color.lerpColors(landDark, landColor, 1 - t * 0.6);
        } else {
          color.copy(landColor);
        }
        const jitter = (Math.random() - 0.5) * 0.08;
        color.offsetHSL(0, 0, jitter);
      } else {
        const depthVar = (Math.sin(lon * 0.04) * 0.5 + 0.5);
        color.lerpColors(oceanDeep, oceanColor, 0.4 + depthVar * 0.5);
        const absLatT = absLat / 90;
        const polar = new THREE.Color(0x3a6ea5);
        color.lerp(polar, absLatT * 0.35);
        const jitter = (Math.random() - 0.5) * 0.06;
        color.offsetHSL(0, 0, jitter);
      }

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      shininess: 14,
      specular: new THREE.Color(0x1a2a4a),
      transparent: false,
      flatShading: true,
    });

    this.earthMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.earthMesh);

    const wireGeo = new THREE.WireframeGeometry(new THREE.SphereGeometry(EARTH_RADIUS + 0.001, 20, 20));
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x4477aa,
      transparent: true,
      opacity: 0.18,
    });
    const wireframe = new THREE.LineSegments(wireGeo, wireMat);
    this.scene.add(wireframe);
  }

  private sampleLand(lat: number, lon: number): boolean {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    let landProb = 0.0;

    const continents: { centerLat: number; centerLon: number; latSigma: number; lonSigma: number; amplitude: number; rotation?: number }[] = [
      { centerLat: 45, centerLon: 90, latSigma: 28, lonSigma: 60, amplitude: 1.1 },
      { centerLat: 12, centerLon: 80, latSigma: 15, lonSigma: 18, amplitude: 0.95 },
      { centerLat: 5, centerLon: -70, latSigma: 22, lonSigma: 28, amplitude: 1.0 },
      { centerLat: -15, centerLon: -58, latSigma: 18, lonSigma: 22, amplitude: 0.9 },
      { centerLat: 50, centerLon: 15, latSigma: 12, lonSigma: 22, amplitude: 0.8 },
      { centerLat: 28, centerLon: 20, latSigma: 10, lonSigma: 18, amplitude: 0.7 },
      { centerLat: -26, centerLon: 135, latSigma: 14, lonSigma: 22, amplitude: 0.8 },
      { centerLat: 65, centerLon: -105, latSigma: 18, lonSigma: 30, amplitude: 0.75 },
      { centerLat: 38, centerLon: -98, latSigma: 10, lonSigma: 25, amplitude: 0.8 },
      { centerLat: -84, centerLon: 0, latSigma: 10, lonSigma: 180, amplitude: 0.7 },
      { centerLat: 78, centerLon: 30, latSigma: 8, lonSigma: 35, amplitude: 0.5 },
      { centerLat: 0, centerLon: 125, latSigma: 6, lonSigma: 14, amplitude: 0.7 },
      { centerLat: -6, centerLon: 140, latSigma: 8, lonSigma: 10, amplitude: 0.55 },
      { centerLat: 52, centerLon: 100, latSigma: 8, lonSigma: 16, amplitude: 0.5 },
    ];

    for (const c of continents) {
      const dLat = (lat - c.centerLat) / c.latSigma;
      let dLon = ((lon - c.centerLon + 540) % 360) - 180;
      dLon = dLon / c.lonSigma;
      const rot = c.rotation || 0;
      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const rx = dLon * cosR - dLat * sinR;
      const ry = dLon * sinR + dLat * cosR;
      const dist2 = rx * rx + ry * ry;
      landProb += c.amplitude * Math.exp(-dist2 * 0.9);
    }

    const noise =
      Math.sin(lonRad * 4 + latRad * 1.3) * 0.1 +
      Math.sin(lonRad * 9 - latRad * 2.7) * 0.055 +
      Math.cos(lonRad * 6 + latRad * 3.2) * 0.04 +
      Math.sin((latRad + lonRad) * 7) * 0.03;

    landProb += noise;
    landProb += 0.04 * Math.sign(Math.random() - 0.5);

    return landProb > 0.4;
  }

  private createAtmosphere(): void {
    const atmosphereShader = {
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vPosition = mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float intensity = pow(0.72 - dot(vNormal, viewDir), 2.8);
          vec3 atmColor1 = vec3(0.35, 0.65, 1.0);
          vec3 atmColor2 = vec3(0.55, 0.8, 1.0);
          vec3 color = mix(atmColor1, atmColor2, intensity * 0.6);
          float alpha = intensity * 0.85;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    };

    const atmosphereGeo = new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 48, 48);
    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: atmosphereShader.uniforms,
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    this.atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    this.scene.add(this.atmosphereMesh);

    const innerGlowGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.025, 48, 48);
    const innerGlowMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float rim = 1.0 - max(0.0, dot(viewDir, normalize(vNormal)));
          rim = pow(rim, 4.5);
          vec3 glowColor = vec3(0.4, 0.75, 1.0);
          gl_FragColor = vec4(glowColor, rim * 0.55);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: false,
    });
    const innerGlow = new THREE.Mesh(innerGlowGeo, innerGlowMat);
    this.scene.add(innerGlow);
  }

  private handleRegionSelected = (e: CustomEvent): void => {
    const { lat, lon, worldPoint } = e.detail;
    const analysis = windDataService.analyzeRegion(lat, lon, 200);
    if (this.interactionToolkit) {
      this.interactionToolkit.showInfoCard(analysis);
    }
  };

  private onRegionAnalyzed = (_analysis: RegionAnalysis, _worldPoint: THREE.Vector3): void => {};

  private onClearSelection = (): void => {};

  private onResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.stars) {
      const mat = this.stars.material as THREE.ShaderMaterial;
      mat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
  };

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const safeDelta = Math.min(delta, 0.05);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    try {
      this.controls.update();
    } catch (e) {}

    windDataService.update(safeDelta);

    if (this.stars) {
      this.stars.rotation.y += safeDelta * 0.003;
    }

    this.renderer.render(this.scene, this.camera);
  };

  start(): void {
    if (this.rafId === null) {
      this.clock.start();
      this.lastFpsTime = performance.now();
      this.animate();
    }
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  getFps(): number {
    return this.fps;
  }

  dispose(): void {
    this.stop();

    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('regionSelected', this.handleRegionSelected as EventListener);

    if (this.interactionToolkit) {
      this.interactionToolkit.dispose();
      this.interactionToolkit = null;
    }

    windDataService.dispose();

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat) => {
          const shaderMat = mat as THREE.ShaderMaterial;
          if (shaderMat.uniforms) {
            for (const k of Object.keys(shaderMat.uniforms)) {
              const v = shaderMat.uniforms[k].value;
              if (v && typeof v.dispose === 'function') {
                v.dispose();
              }
            }
          }
          mat.dispose();
        });
      }
    });

    this.controls.dispose();
    this.renderer.dispose();
  }
}

function boot(): void {
  const explorer = new GlobalWindExplorer();
  explorer.start();
  (window as any).__globalWindExplorer = explorer;
  console.log('[GlobalWindExplorer] Started successfully.');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export default GlobalWindExplorer;
