import * as THREE from 'three';

export class SceneManager {
  private scene: THREE.Scene;
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private pointLight!: THREE.PointLight;
  private ground!: THREE.Mesh;
  private glowLight!: THREE.PointLight;
  private glowSprite: THREE.Sprite | null = null;
  private currentGlowColor: THREE.Color;
  private targetGlowColor: THREE.Color;
  private glowColorTransition: number = 0;
  private glowColorDuration: number = 0.6;
  private isGlowAnimating: boolean = false;
  private glowSpriteCanvas: HTMLCanvasElement | null = null;
  private glowSpriteCtx: CanvasRenderingContext2D | null = null;
  private glowSpriteTexture: THREE.CanvasTexture | null = null;

  constructor() {
    this.scene = new THREE.Scene();

    this.currentGlowColor = new THREE.Color(0x4A90D9);
    this.targetGlowColor = new THREE.Color(0x4A90D9);

    this.setupBackground();
    this.setupLights();
    this.setupGround();
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

    this.createGlowTexture();
  }

  private createGlowTexture(): void {
    this.glowSpriteCanvas = document.createElement('canvas');
    this.glowSpriteCanvas.width = 512;
    this.glowSpriteCanvas.height = 512;
    this.glowSpriteCtx = this.glowSpriteCanvas.getContext('2d')!;

    this.updateGlowSpriteColor(this.currentGlowColor);

    this.glowSpriteTexture = new THREE.CanvasTexture(this.glowSpriteCanvas);
    this.glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowSpriteTexture,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.glowSprite.scale.set(6, 3, 1);
    this.glowSprite.position.set(0, -0.48, 0);
    this.glowSprite.rotation.x = -Math.PI / 2;
    this.scene.add(this.glowSprite);
  }

  private updateGlowSpriteColor(color: THREE.Color): void {
    if (!this.glowSpriteCtx || !this.glowSpriteCanvas) return;

    const ctx = this.glowSpriteCtx;
    const w = this.glowSpriteCanvas.width;
    const h = this.glowSpriteCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);

    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 200);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.2)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    if (this.glowSpriteTexture) {
      this.glowSpriteTexture.needsUpdate = true;
    }
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
    this.updateGlowSpriteColor(this.currentGlowColor);
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
      
      const tempColor = new THREE.Color(r, g, b);
      this.updateGlowSpriteColor(tempColor);

      if (t >= 1) {
        this.currentGlowColor.copy(this.targetGlowColor);
        this.isGlowAnimating = false;
      }
    }

    const time = Date.now() * 0.001;
    this.glowLight.intensity = 2.0 + Math.sin(time * 0.5) * 0.2;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}
