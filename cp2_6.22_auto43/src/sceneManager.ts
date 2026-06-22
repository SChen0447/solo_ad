import * as THREE from 'three';

export class SceneManager {
  private scene: THREE.Scene;
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private pointLight!: THREE.PointLight;
  private ground!: THREE.Mesh;
  private glowLight!: THREE.PointLight;
  private glowMesh!: THREE.Mesh;
  private glowMaterial!: THREE.ShaderMaterial;
  private currentGlowColor: THREE.Color;
  private targetGlowColor: THREE.Color;
  private glowColorTransition: number = 0;
  private glowColorDuration: number = 0.6;
  private isGlowAnimating: boolean = false;

  constructor() {
    this.scene = new THREE.Scene();

    this.currentGlowColor = new THREE.Color(0x4A90D9);
    this.targetGlowColor = new THREE.Color(0x4A90D9);

    this.setupBackground();
    this.setupLights();
    this.setupGround();
    this.setupGlowMesh();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 512);
    gradient.addColorStop(0, '#1A0A2E');
    gradient.addColorStop(0.5, '#120A28');
    gradient.addColorStop(1, '#0A0A23');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private setupLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(5, 10, 7);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -10;
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;
    this.directionalLight.shadow.bias = -0.001;
    this.scene.add(this.directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    this.pointLight = new THREE.PointLight(0xffffff, 0.5, 20);
    this.pointLight.position.set(0, 5, 0);
    this.scene.add(this.pointLight);

    this.glowLight = new THREE.PointLight(this.currentGlowColor, 2.0, 10);
    this.glowLight.position.set(0, 1, 0);
    this.scene.add(this.glowLight);
  }

  private setupGround(): void {
    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0A0A15,
      roughness: 0.8,
      metalness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.5;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }

  private setupGlowMesh(): void {
    const glowGeo = new THREE.PlaneGeometry(6, 3);
    this.glowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uGlowColor: { value: this.currentGlowColor.clone() },
        uOpacity: { value: 0.5 },
        uTime: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uGlowColor;
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          vec2 center = vec2(0.5);
          float dist = distance(vUv, center);

          float innerRadius = 0.0;
          float outerRadius = 0.45;

          float alpha = 1.0 - smoothstep(innerRadius, outerRadius, dist);
          alpha *= uOpacity;

          alpha *= 0.5 + 0.05 * sin(uTime * 0.5);

          gl_FragColor = vec4(uGlowColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });

    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
    this.glowMesh.rotation.x = -Math.PI / 2;
    this.glowMesh.position.y = -0.48;
    this.glowMesh.renderOrder = -1;
    this.scene.add(this.glowMesh);
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public setAmbientIntensity(intensity: number): void {
    this.ambientLight.intensity = intensity;
  }

  public getAmbientIntensity(): number {
    return this.ambientLight.intensity;
  }

  public setGlowColor(color: number): void {
    this.currentGlowColor.setHex(color);
    this.targetGlowColor.setHex(color);
    this.glowLight.color.setHex(color);
    this.glowMaterial.uniforms.uGlowColor.value.copy(this.currentGlowColor);
    this.isGlowAnimating = false;
  }

  public animateGlowColor(targetColor: number, duration: number): void {
    if (this.isGlowAnimating) {
      this.currentGlowColor.copy(this.glowLight.color);
    }
    this.targetGlowColor.setHex(targetColor);
    this.glowColorDuration = duration;
    this.glowColorTransition = 0;
    this.isGlowAnimating = true;
  }

  public update(delta: number): void {
    if (this.isGlowAnimating) {
      this.glowColorTransition += delta;
      const t = Math.min(this.glowColorTransition / this.glowColorDuration, 1);
      const easedT = this.easeInOut(t);

      const r = this.currentGlowColor.r + (this.targetGlowColor.r - this.currentGlowColor.r) * easedT;
      const g = this.currentGlowColor.g + (this.targetGlowColor.g - this.currentGlowColor.g) * easedT;
      const b = this.currentGlowColor.b + (this.targetGlowColor.b - this.currentGlowColor.b) * easedT;

      this.glowLight.color.setRGB(r, g, b);
      this.glowMaterial.uniforms.uGlowColor.value.setRGB(r, g, b);

      if (t >= 1) {
        this.currentGlowColor.copy(this.targetGlowColor);
        this.isGlowAnimating = false;
      }
    }

    const time = Date.now() * 0.001;
    this.glowLight.intensity = 2.0 + Math.sin(time * 0.5) * 0.2;
    this.glowMaterial.uniforms.uTime.value = time;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}
