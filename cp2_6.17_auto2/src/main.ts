import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { windDataService } from './windDataService';
import { InteractionToolkit } from './interactionToolkit';
import { stateManager, type MonthKey, type SelectedRegion } from './stateManager';
import './styles.css';

class WindExplorerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private canvas: HTMLCanvasElement;

  private earth: THREE.Mesh;
  private atmosphere: THREE.Mesh;
  private particles: THREE.Points;
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.ShaderMaterial;

  private markerRing: THREE.Mesh;
  private markerVisible: boolean = false;

  private clock: THREE.Clock;
  private animationId: number = 0;

  private infoCard: HTMLElement;
  private infoLat: HTMLElement;
  private infoLon: HTMLElement;
  private infoSpeed: HTMLElement;
  private infoDir: HTMLElement;

  private interactionToolkit: InteractionToolkit;

  private baseCameraDistance: number = 300;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });

    this.infoCard = document.getElementById('infoCard') as HTMLElement;
    this.infoLat = document.getElementById('infoLat') as HTMLElement;
    this.infoLon = document.getElementById('infoLon') as HTMLElement;
    this.infoSpeed = document.getElementById('infoSpeed') as HTMLElement;
    this.infoDir = document.getElementById('infoDir') as HTMLElement;

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleMaterial = this.createParticleMaterial();

    this.earth = this.createEarth();
    this.atmosphere = this.createAtmosphere();
    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.markerRing = this.createMarkerRing();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.interactionToolkit = new InteractionToolkit({
      canvas: this.canvas,
      camera: this.camera,
      earthRadius: windDataService.getEarthRadius(),
      onRegionSelect: this.handleRegionSelect.bind(this),
    });

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupCamera();
    this.setupControls();
    this.setupLights();
    this.setupObjects();
    this.setupEventListeners();
    this.setupUIListeners();
    this.updateParticlesGeometry();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a2e, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  private setupCamera(): void {
    this.camera.position.set(0, 60, this.baseCameraDistance);
    this.camera.lookAt(0, 0, 0);
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = this.baseCameraDistance * 0.5;
    this.controls.maxDistance = this.baseCameraDistance * 3;
    this.controls.enablePan = false;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(200, 100, 150);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.3);
    fillLight.position.set(-150, -50, -100);
    this.scene.add(fillLight);
  }

  private setupObjects(): void {
    this.scene.add(this.earth);
    this.scene.add(this.atmosphere);
    this.scene.add(this.particles);
    this.scene.add(this.markerRing);
    this.markerRing.visible = false;
  }

  private createEarth(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(windDataService.getEarthRadius(), 20, 20);
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a3a5c,
      emissive: 0x0a1a2e,
      emissiveIntensity: 0.3,
      shininess: 10,
      flatShading: true,
      transparent: true,
      opacity: 0.9,
    });

    const mesh = new THREE.Mesh(geometry, material);

    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0x2a5a8c,
        transparent: true,
        opacity: 0.3,
      })
    );
    mesh.add(wireframe);

    return mesh;
  }

  private createAtmosphere(): THREE.Mesh {
    const atmosphereGeometry = new THREE.SphereGeometry(windDataService.getEarthRadius() * 1.05, 32, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
          gl_FragColor = vec4(atmosphereColor, 1.0) * intensity * 1.5;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });

    return new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  }

  private createParticleMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: 4.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private createMarkerRing(): THREE.Mesh {
    const ringRadius = windDataService.getEarthRadius() * 1.001;
    const tubeRadius = 2;
    const geometry = new THREE.TorusGeometry(ringRadius, tubeRadius, 16, 100);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.4,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.visible = false;
    return ring;
  }

  private updateParticlesGeometry(): void {
    const particles = windDataService.getParticles();
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 3);
    const sizes = new Float32Array(particles.length);
    const alphas = new Float32Array(particles.length);

    const transitionAlpha = windDataService.getTransitionAlpha();

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;

      sizes[i] = p.size;

      const lifeRatio = p.life / p.maxLife;
      let alpha = 1;
      if (lifeRatio < 0.1) {
        alpha = lifeRatio / 0.1;
      } else if (lifeRatio > 0.7) {
        alpha = (1 - lifeRatio) / 0.3;
      }
      alphas[i] = alpha * transitionAlpha;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.aColor.needsUpdate = true;
    this.particleGeometry.attributes.aSize.needsUpdate = true;
    this.particleGeometry.attributes.aAlpha.needsUpdate = true;
  }

  private updateMarker(region: SelectedRegion | null): void {
    if (!region) {
      this.markerRing.visible = false;
      this.markerVisible = false;
      return;
    }

    const earthRadius = windDataService.getEarthRadius();
    const ringRadius = (60 / 40075) * 2 * Math.PI * earthRadius;

    const latRad = (region.lat * Math.PI) / 180;
    const lonRad = (region.lon * Math.PI) / 180;

    const x = -earthRadius * Math.sin(Math.PI / 2 - latRad) * Math.cos(lonRad + Math.PI);
    const y = earthRadius * Math.cos(Math.PI / 2 - latRad);
    const z = earthRadius * Math.sin(Math.PI / 2 - latRad) * Math.sin(lonRad + Math.PI);

    this.markerRing.position.set(x, y, z);

    const normal = new THREE.Vector3(x, y, z).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
    this.markerRing.quaternion.copy(quaternion);

    this.markerRing.visible = true;
    this.markerVisible = true;

    const ringScale = ringRadius / earthRadius;
    this.markerRing.scale.set(ringScale, ringScale, ringScale);
  }

  private handleRegionSelect(lat: number, lon: number): void {
    const analysis = windDataService.analyzeRegion(lat, lon, 200);

    this.infoLat.textContent = lat.toFixed(2) + '°';
    this.infoLon.textContent = lon.toFixed(2) + '°';
    this.infoSpeed.textContent = analysis.avgSpeed.toFixed(1) + ' m/s';
    this.infoDir.textContent = analysis.dominantDirection;

    this.infoCard.style.display = 'flex';
    requestAnimationFrame(() => {
      this.infoCard.classList.add('visible');
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));

    stateManager.subscribe((state) => {
      this.controls.minDistance = this.baseCameraDistance * 0.5 / state.zoomLevel;
      this.controls.maxDistance = this.baseCameraDistance * 3 / state.zoomLevel;

      if (state.selectedRegion) {
        this.updateMarker(state.selectedRegion);
      } else {
        this.updateMarker(null);
        this.infoCard.classList.remove('visible');
        setTimeout(() => {
          if (!stateManager.get('selectedRegion')) {
            this.infoCard.style.display = 'none';
          }
        }, 200);
      }
    });
  }

  private setupUIListeners(): void {
    const monthButtons = document.querySelectorAll('.month-btn');
    monthButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const month = btn.getAttribute('data-month') as MonthKey;
        if (month && month !== stateManager.get('currentMonth')) {
          monthButtons.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          stateManager.set('currentMonth', month);
        }
      });
    });

    const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    const speedValue = document.getElementById('speedValue') as HTMLElement;

    speedSlider.addEventListener('input', () => {
      const value = parseFloat(speedSlider.value);
      stateManager.set('animationSpeed', value);
      speedValue.textContent = value.toFixed(1) + 'x';
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.particleMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const speedMultiplier = stateManager.get('animationSpeed');

    windDataService.update(delta, speedMultiplier);

    this.updateParticlesGeometry();

    if (this.markerVisible && stateManager.get('selectedRegion')) {
      const pulse = 1 + Math.sin(Date.now() * 0.003) * 0.1;
      this.markerRing.scale.multiplyScalar(pulse / (this.markerRing.userData.lastPulse || 1));
      this.markerRing.userData.lastPulse = pulse;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.interactionToolkit.dispose();
    this.controls.dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new WindExplorerApp();
});

export { WindExplorerApp };
