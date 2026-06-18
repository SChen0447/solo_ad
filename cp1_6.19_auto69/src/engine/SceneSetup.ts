import * as THREE from 'three';

export class SceneSetup {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private stars: THREE.Points | null = null;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDistance: number = 6;
  private cameraTheta: number = Math.PI / 4;
  private cameraPhi: number = Math.PI / 3;
  private readonly minDistance: number = 1;
  private readonly maxDistance: number = 12;
  private readonly rotationSpeed: number = 0.3 * (Math.PI / 180);

  private ambientLight: THREE.AmbientLight;
  private pointLight: THREE.PointLight;

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x0a0e27, 1);
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0xffffff, 0.8, 100);
    this.pointLight.position.set(5, 5, 5);
    this.scene.add(this.pointLight);

    this.createStarField();
    this.setupInteraction();
  }

  private createStarField(): void {
    const starCount = 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const opacities = new Float32Array(starCount);
    const phases = new Float32Array(starCount);

    const radius = 50;
    for (let i = 0; i < starCount; i++) {
      const r = radius * (0.7 + Math.random() * 0.3);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = 0.5 + Math.random() * 1.5;
      opacities[i] = 0.3 + Math.random() * 0.5;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float aOpacity;
        attribute float aPhase;
        varying float vOpacity;
        varying float vPhase;
        void main() {
          vOpacity = aOpacity;
          vPhase = aPhase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying float vOpacity;
        varying float vPhase;
        void main() {
          float baseOpacity = vOpacity;
          float phase = vPhase;
          float pulse = 0.5 + 0.5 * sin(time * (0.5 + fract(phase) * 1.5) + phase);
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = (1.0 - dist * 2.0) * baseOpacity * (0.7 + pulse * 0.3);
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private setupInteraction(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;

      this.cameraTheta -= dx * this.rotationSpeed;
      this.cameraPhi -= dy * this.rotationSpeed;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));

      this.updateCameraPosition();
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    dom.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      if (e.deltaY > 0) {
        this.cameraDistance = Math.min(this.maxDistance, this.cameraDistance * zoomFactor);
      } else {
        this.cameraDistance = Math.max(this.minDistance, this.cameraDistance / zoomFactor);
      }
      this.updateCameraPosition();
    }, { passive: false });
  }

  private updateCameraPosition(): void {
    const r = this.cameraDistance;
    const sinPhi = Math.sin(this.cameraPhi);
    this.camera.position.set(
      r * sinPhi * Math.cos(this.cameraTheta),
      r * Math.cos(this.cameraPhi),
      r * sinPhi * Math.sin(this.cameraTheta)
    );
    this.camera.lookAt(0, 0, 0);
  }

  public update(): void {
    if (this.stars && this.stars.material instanceof THREE.ShaderMaterial) {
      this.stars.material.uniforms.time.value = performance.now() * 0.001;
    }
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public onResize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public getIsDragging(): boolean {
    return this.isDragging;
  }
}
