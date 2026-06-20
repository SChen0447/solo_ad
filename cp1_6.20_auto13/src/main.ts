import * as THREE from 'three';
import { GalaxyGenerator, StarData, GalaxyData } from './galaxyGenerator';
import { StarInteraction } from './starInteraction';
import { UIManager } from './uiManager';

class GalaxyExplorer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private galaxyGenerator: GalaxyGenerator;
  private galaxyData!: GalaxyData;
  private starsPoints!: THREE.Points;
  private backgroundStars!: THREE.Points;
  private starInteraction!: StarInteraction;
  private uiManager: UIManager;
  private clock: THREE.Clock;
  private isRunning: boolean = true;

  private cameraPosition: THREE.Vector3;
  private cameraDistance: number = 600;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 2;
  private targetDistance: number = 600;
  private targetTheta: number = 0;
  private targetPhi: number = Math.PI / 2;
  private cameraLookAt: THREE.Vector3;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };

  private keys: { [key: string]: boolean } = {};
  private moveSpeed: number = 50;

  private starTexture!: THREE.Texture;
  private glowSprites: THREE.Sprite[] = [];
  private glowBaseScales: number[] = [];

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.uiManager = new UIManager();
    this.clock = new THREE.Clock();
    this.galaxyGenerator = new GalaxyGenerator(2000, 5000, 500, 50);

    this.cameraPosition = new THREE.Vector3();
    this.cameraLookAt = new THREE.Vector3(0, 0, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      3000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupScene();
    this.generateGalaxy();
    this.setupCamera();
    this.setupEventListeners();
    this.setupStarInteraction();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a2e, 1);
    this.renderer.sortObjects = false;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupScene(): void {
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.0008);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    this.createBackgroundGradient();
  }

  private createBackgroundGradient(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#0d0d35');
    gradient.addColorStop(1, '#050510');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const backgroundGeo = new THREE.SphereGeometry(2000, 32, 32);
    const backgroundMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      fog: false
    });

    const background = new THREE.Mesh(backgroundGeo, backgroundMat);
    this.scene.add(background);
  }

  private generateGalaxy(): void {
    this.galaxyData = this.galaxyGenerator.generate();
    this.starTexture = this.galaxyGenerator.createStarTexture();

    this.createStarPoints();
    this.createBackgroundStars();
    this.createGlowSprites();
  }

  private createStarPoints(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.galaxyData.stars.length * 3);
    const colors = new Float32Array(this.galaxyData.stars.length * 3);
    const sizes = new Float32Array(this.galaxyData.stars.length);

    this.galaxyData.stars.forEach((star: StarData, index: number) => {
      positions[index * 3] = star.position.x;
      positions[index * 3 + 1] = star.position.y;
      positions[index * 3 + 2] = star.position.z;

      colors[index * 3] = star.color.r;
      colors[index * 3 + 1] = star.color.g;
      colors[index * 3 + 2] = star.color.b;

      sizes[index] = star.size;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: this.starTexture },
        pixelRatio: { value: this.renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        varying float vSize;
        uniform float pixelRatio;
        void main() {
          vColor = color;
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * pixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          if (texColor.a < 0.1) discard;
          gl_FragColor = vec4(vColor, 1.0) * texColor;
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });

    this.starsPoints = new THREE.Points(geometry, material);
    this.starsPoints.frustumCulled = false;
    this.scene.add(this.starsPoints);
  }

  private createBackgroundStars(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.galaxyData.backgroundStars.length * 3);

    this.galaxyData.backgroundStars.forEach((star: THREE.Vector3, index: number) => {
      positions[index * 3] = star.x;
      positions[index * 3 + 1] = star.y;
      positions[index * 3 + 2] = star.z;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
      fog: false
    });

    this.backgroundStars = new THREE.Points(geometry, material);
    this.backgroundStars.frustumCulled = false;
    this.scene.add(this.backgroundStars);
  }

  private createGlowSprites(): void {
    const glowTexture = this.galaxyGenerator.createGlowTexture();
    const glowCount = 50;
    
    for (let i = 0; i < glowCount; i++) {
      const starIndex = Math.floor(Math.random() * this.galaxyData.stars.length);
      const star = this.galaxyData.stars[starIndex];
      
      const glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        color: star.color,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const glowSprite = new THREE.Sprite(glowMaterial);
      glowSprite.position.copy(star.position);
      const scale = star.size * (8 + Math.random() * 6);
      glowSprite.scale.set(scale, scale, 1);
      this.scene.add(glowSprite);
      this.glowSprites.push(glowSprite);
      this.glowBaseScales.push(scale);
    }
  }

  private setupCamera(): void {
    this.targetDistance = 600;
    this.targetTheta = Math.PI * 0.2;
    this.targetPhi = Math.PI * 0.4;
    this.cameraDistance = this.targetDistance;
    this.cameraTheta = this.targetTheta;
    this.cameraPhi = this.targetPhi;

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const sinPhi = Math.sin(this.cameraPhi);
    const cosPhi = Math.cos(this.cameraPhi);
    const sinTheta = Math.sin(this.cameraTheta);
    const cosTheta = Math.cos(this.cameraTheta);

    this.cameraPosition.set(
      this.cameraDistance * sinPhi * cosTheta,
      this.cameraDistance * cosPhi,
      this.cameraDistance * sinPhi * sinTheta
    );

    this.camera.position.copy(this.cameraPosition);
    this.camera.lookAt(this.cameraLookAt);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.previousMouse = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.previousMouse.x;
        const deltaY = e.clientY - this.previousMouse.y;

        this.targetTheta -= deltaX * 0.005;
        this.targetPhi -= deltaY * 0.005;

        this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi));

        this.previousMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1.1 : 0.9;
      this.targetDistance *= delta;
      this.targetDistance = Math.max(50, Math.min(1500, this.targetDistance));
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    document.getElementById('close-panel')?.addEventListener('click', () => {
      this.starInteraction.updateSelectedHighlight();
    });
  }

  private setupStarInteraction(): void {
    this.starInteraction = new StarInteraction(
      this.scene,
      this.camera,
      this.renderer,
      this.starsPoints,
      this.galaxyData,
      this.uiManager
    );
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.uiManager.handleResize();

    const material = this.starsPoints.material as THREE.ShaderMaterial;
    if (material.uniforms) {
      material.uniforms.pixelRatio.value = this.renderer.getPixelRatio();
    }
  }

  private handleInput(deltaTime: number): void {
    const moveSpeed = this.moveSpeed * deltaTime;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveVector = new THREE.Vector3();

    if (this.keys['w']) {
      moveVector.add(forward.clone().multiplyScalar(moveSpeed));
    }
    if (this.keys['s']) {
      moveVector.add(forward.clone().multiplyScalar(-moveSpeed));
    }
    if (this.keys['a']) {
      moveVector.add(right.clone().multiplyScalar(-moveSpeed));
    }
    if (this.keys['d']) {
      moveVector.add(right.clone().multiplyScalar(moveSpeed));
    }
    if (this.keys['q']) {
      moveVector.y -= moveSpeed;
    }
    if (this.keys['e']) {
      moveVector.y += moveSpeed;
    }

    if (moveVector.length() > 0) {
      this.cameraLookAt.add(moveVector);
      
      const offset = this.cameraPosition.clone().sub(this.cameraLookAt);
      this.cameraDistance = offset.length();
      
      this.targetDistance = this.cameraDistance;
      this.targetTheta = Math.atan2(offset.x, offset.z);
      this.targetPhi = Math.acos(offset.y / this.cameraDistance);
      this.cameraTheta = this.targetTheta;
      this.cameraPhi = this.targetPhi;
      
      this.camera.position.add(moveVector);
      this.cameraPosition.copy(this.camera.position);
    }
  }

  private updateCamera(deltaTime: number): void {
    const smoothSpeed = 5;
    const factor = 1 - Math.exp(-smoothSpeed * deltaTime);

    this.cameraDistance += (this.targetDistance - this.cameraDistance) * factor;
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * factor;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * factor;

    this.updateCameraPosition();
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.handleInput(deltaTime);
    this.updateCamera(deltaTime);
    this.starInteraction.update(deltaTime);
    this.updateGlowSprites(deltaTime);
    this.rotateBackgroundStars(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  private updateGlowSprites(_deltaTime: number): void {
    const time = performance.now() * 0.001;
    this.glowSprites.forEach((sprite, index) => {
      const baseScale = this.glowBaseScales[index];
      const pulse = 1 + Math.sin(time * 0.5 + index * 0.5) * 0.15;
      sprite.scale.set(baseScale * pulse, baseScale * pulse, 1);
      sprite.material.opacity = 0.15 + Math.sin(time * 0.8 + index) * 0.1;
    });
  }

  private rotateBackgroundStars(deltaTime: number): void {
    if (this.backgroundStars) {
      this.backgroundStars.rotation.y += deltaTime * 0.005;
    }
  }

  public destroy(): void {
    this.isRunning = false;
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GalaxyExplorer();
});
