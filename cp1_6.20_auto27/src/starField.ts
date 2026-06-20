import * as THREE from 'three';

export class StarField {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points;
  private nebulaParticles: THREE.Points;
  private rotationSpeed: number = 0.0003;
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private currentRotationX: number = 0;
  private currentRotationY: number = 0;
  private time: number = 0;
  private colors: Float32Array;
  private particleCount: number = 5000;
  private nebulaCount: number = 2000;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.z = 400;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a, 1);

    this.colors = new Float32Array(this.particleCount * 3);
    this.particles = this.createStarParticles();
    this.nebulaParticles = this.createNebulaParticles();

    this.scene.add(this.particles);
    this.scene.add(this.nebulaParticles);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private createStarParticles(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const radius = 300 + Math.random() * 700;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const color = this.getStarColor();
      this.colors[i3] = color.r;
      this.colors[i3 + 1] = color.g;
      this.colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  private createNebulaParticles(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.nebulaCount * 3);
    const colors = new Float32Array(this.nebulaCount * 3);
    const sizes = new Float32Array(this.nebulaCount);

    for (let i = 0; i < this.nebulaCount; i++) {
      const i3 = i * 3;
      const radius = 100 + Math.random() * 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1) * 0.6;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.5;
      positions[i3 + 2] = radius * Math.cos(phi);

      const color = this.getNebulaColor(Math.random());
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 8 + 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 5,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    return new THREE.Points(geometry, material);
  }

  private getStarColor(): { r: number; g: number; b: number } {
    const temp = Math.random();
    if (temp < 0.3) {
      return { r: 1, g: 0.8, b: 0.6 };
    } else if (temp < 0.6) {
      return { r: 1, g: 1, b: 1 };
    } else if (temp < 0.85) {
      return { r: 0.7, g: 0.8, b: 1 };
    } else {
      return { r: 0.9, g: 0.7, b: 1 };
    }
  }

  private getNebulaColor(t: number): { r: number; g: number; b: number } {
    const colors = [
      { r: 0.4, g: 0.2, b: 0.8 },
      { r: 0.2, g: 0.3, b: 0.9 },
      { r: 0.8, g: 0.3, b: 0.6 },
      { r: 0.6, g: 0.2, b: 0.7 },
      { r: 0.3, g: 0.4, b: 0.9 }
    ];

    const idx = Math.floor(t * (colors.length - 1));
    const frac = (t * (colors.length - 1)) % 1;
    const c1 = colors[idx];
    const c2 = colors[Math.min(idx + 1, colors.length - 1)];

    return {
      r: c1.r + (c2.r - c1.r) * frac,
      g: c1.g + (c2.g - c1.g) * frac,
      b: c1.b + (c2.b - c1.b) * frac
    };
  }

  rotateBy(deltaX: number, deltaY: number): void {
    this.targetRotationY += deltaX * 0.005;
    this.targetRotationX += deltaY * 0.005;
    this.targetRotationX = Math.max(-0.5, Math.min(0.5, this.targetRotationX));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  update(deltaTime: number): void {
    this.time += deltaTime;

    this.targetRotationY += this.rotationSpeed;

    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.05;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.05;

    this.particles.rotation.x = this.currentRotationX;
    this.particles.rotation.y = this.currentRotationY;
    this.nebulaParticles.rotation.x = this.currentRotationX * 0.8;
    this.nebulaParticles.rotation.y = this.currentRotationY * 0.8;

    this.animateNebulaColors();

    this.renderer.render(this.scene, this.camera);
  }

  private animateNebulaColors(): void {
    const colors = this.nebulaParticles.geometry.attributes.color.array as Float32Array;
    const positions = this.nebulaParticles.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < this.nebulaCount; i++) {
      const i3 = i * 3;
      const noise = Math.sin(this.time * 0.5 + positions[i3] * 0.01) * 0.5 + 0.5;
      const color = this.getNebulaColor((noise + i / this.nebulaCount * 0.5) % 1);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    this.nebulaParticles.geometry.attributes.color.needsUpdate = true;

    const pulse = 0.9 + Math.sin(this.time * 0.3) * 0.1;
    (this.nebulaParticles.material as THREE.PointsMaterial).opacity = 0.35 * pulse;
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    this.nebulaParticles.geometry.dispose();
    (this.nebulaParticles.material as THREE.Material).dispose();
  }
}
