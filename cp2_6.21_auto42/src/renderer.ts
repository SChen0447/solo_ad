import * as THREE from 'three';

export class GameRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private width: number;
  private height: number;

  private tintOverlay: THREE.Mesh | null = null;
  private uiSprites: Map<string, THREE.Sprite> = new Map();
  private uiLayer: THREE.Group;

  private rewindIconSprite: THREE.Sprite | null = null;
  private rewindCountSprite: THREE.Sprite | null = null;
  private timerSprite: THREE.Sprite | null = null;
  private starsSprite: THREE.Sprite | null = null;
  private positionSprite: THREE.Sprite | null = null;

  private pixelsPerUnit: number = 1;

  constructor(
    scene: THREE.Scene,
    camera: THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.width = width;
    this.height = height;

    this.uiLayer = new THREE.Group();
    this.uiLayer.position.z = 10;
    this.scene.add(this.uiLayer);

    this.setupTintOverlay();
    this.setupUI();
  }

  private setupTintOverlay(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4A90D9,
      transparent: true,
      opacity: 0,
      blending: THREE.MultiplyBlending,
      depthTest: false,
      depthWrite: false
    });

    this.tintOverlay = new THREE.Mesh(geometry, material);
    this.tintOverlay.position.z = 5;
    this.tintOverlay.frustumCulled = false;
    this.uiLayer.add(this.tintOverlay);
  }

  private setupUI(): void {
    this.createRewindUI();
    this.createTimerUI();
    this.createStarsUI();
    this.createPositionUI();
  }

  private createTextTexture(
    text: string,
    fontSize: number = 16,
    color: string = '#ffffff',
    fontFamily: string = 'monospace'
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    ctx.font = `${fontSize}px ${fontFamily}`;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width) + 10;
    const textHeight = fontSize * 1.5;

    canvas.width = textWidth;
    canvas.height = textHeight;

    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, 5, textHeight / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }

  private createRewindUI(): void {
    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 48;
    iconCanvas.height = 48;
    const ctx = iconCanvas.getContext('2d')!;

    const centerX = 24;
    const centerY = 24;
    const radius = 20;

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, '#34C759');
    gradient.addColorStop(1, '#28A745');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⟲', centerX, centerY);

    const iconTexture = new THREE.CanvasTexture(iconCanvas);
    iconTexture.minFilter = THREE.LinearFilter;
    const iconMaterial = new THREE.SpriteMaterial({
      map: iconTexture,
      transparent: true,
      depthTest: false
    });
    this.rewindIconSprite = new THREE.Sprite(iconMaterial);
    this.rewindIconSprite.scale.set(24, 24, 1);
    this.uiLayer.add(this.rewindIconSprite);

    const countTexture = this.createTextTexture('3', 16, '#ffffff');
    const countMaterial = new THREE.SpriteMaterial({
      map: countTexture,
      transparent: true,
      depthTest: false
    });
    this.rewindCountSprite = new THREE.Sprite(countMaterial);
    this.rewindCountSprite.scale.set(20, 24, 1);
    this.uiLayer.add(this.rewindCountSprite);
  }

  private createTimerUI(): void {
    const texture = this.createTextTexture('00:00.00', 16, '#ffffff');
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    this.timerSprite = new THREE.Sprite(material);
    this.timerSprite.scale.set(120, 24, 1);
    this.uiLayer.add(this.timerSprite);
  }

  private createStarsUI(): void {
    const texture = this.createTextTexture('★ 0', 16, '#FFD700');
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    this.starsSprite = new THREE.Sprite(material);
    this.starsSprite.scale.set(50, 24, 1);
    this.uiLayer.add(this.starsSprite);
  }

  private createPositionUI(): void {
    const texture = this.createTextTexture('X: 0  Y: 0', 12, '#ffffff');
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    this.positionSprite = new THREE.Sprite(material);
    this.positionSprite.scale.set(100, 20, 1);
    this.uiLayer.add(this.positionSprite);
  }

  public updateRewindUI(uses: number, maxUses: number): void {
    if (!this.rewindIconSprite) return;

    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = 48;
    iconCanvas.height = 48;
    const ctx = iconCanvas.getContext('2d')!;

    const centerX = 24;
    const centerY = 24;
    const radius = 20;

    let color = '#34C759';
    if (uses <= 0) {
      color = '#FF3B30';
    } else if (uses <= 2) {
      color = '#FF9500';
    }

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.8));

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⟲', centerX, centerY);

    const iconTexture = new THREE.CanvasTexture(iconCanvas);
    iconTexture.minFilter = THREE.LinearFilter;
    (this.rewindIconSprite.material as THREE.SpriteMaterial).map = iconTexture;
    iconTexture.needsUpdate = true;

    if (this.rewindCountSprite) {
      const countTexture = this.createTextTexture(String(uses), 16, '#ffffff');
      (this.rewindCountSprite.material as THREE.SpriteMaterial).map = countTexture;
      countTexture.needsUpdate = true;
    }
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const dr = Math.floor(r * factor);
    const dg = Math.floor(g * factor);
    const db = Math.floor(b * factor);

    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  }

  public updateTimerUI(time: number): void {
    if (!this.timerSprite) return;

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

    const texture = this.createTextTexture(timeStr, 16, '#ffffff');
    (this.timerSprite.material as THREE.SpriteMaterial).map = texture;
    texture.needsUpdate = true;
  }

  public updateStarsUI(stars: number): void {
    if (!this.starsSprite) return;

    const starStr = `★ ${stars}`;
    const texture = this.createTextTexture(starStr, 16, '#FFD700');
    (this.starsSprite.material as THREE.SpriteMaterial).map = texture;
    texture.needsUpdate = true;
  }

  public updatePositionUI(x: number, y: number): void {
    if (!this.positionSprite) return;

    const posStr = `X: ${Math.round(x)}  Y: ${Math.round(y)}`;
    const texture = this.createTextTexture(posStr, 12, '#ffffff');
    (this.positionSprite.material as THREE.SpriteMaterial).map = texture;
    texture.needsUpdate = true;
  }

  public updateTint(progress: number): void {
    if (this.tintOverlay) {
      (this.tintOverlay.material as THREE.MeshBasicMaterial).opacity = progress * 0.5;
    }
  }

  public updateUIPositions(): void {
    const left = -this.width / 2;
    const right = this.width / 2;
    const top = this.height / 2;
    const bottom = -this.height / 2;

    if (this.rewindIconSprite) {
      this.rewindIconSprite.position.set(left + 30, top - 30, 0);
    }

    if (this.rewindCountSprite) {
      this.rewindCountSprite.position.set(left + 60, top - 30, 0);
    }

    if (this.timerSprite) {
      this.timerSprite.position.set(right - 70, top - 30, 0);
    }

    if (this.starsSprite) {
      this.starsSprite.position.set(right - 35, top - 55, 0);
    }

    if (this.positionSprite) {
      this.positionSprite.position.set(0, bottom + 15, 0);
    }
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    if (this.tintOverlay) {
      const scale = Math.max(width, height);
      this.tintOverlay.scale.set(scale, scale, 1);
    }

    this.updateUIPositions();
  }

  public dispose(): void {
    if (this.tintOverlay) {
      this.tintOverlay.geometry.dispose();
      (this.tintOverlay.material as THREE.Material).dispose();
    }

    this.uiSprites.forEach((sprite) => {
      sprite.geometry.dispose();
      const material = sprite.material as THREE.SpriteMaterial;
      if (material.map) {
        material.map.dispose();
      }
      material.dispose();
    });

    this.scene.remove(this.uiLayer);
  }
}
