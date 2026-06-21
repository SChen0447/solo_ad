import * as THREE from 'three';
import { LevelData } from './editor';

export type MenuAction = 'play' | 'editor' | 'load' | 'none';

const MENU_ACTIONS = {
  play: 'play' as MenuAction,
  editor: 'editor' as MenuAction,
  load: 'load' as MenuAction
};

export class Menu {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;

  private isActive: boolean = false;
  private menuGroup: THREE.Group = new THREE.Group();
  private titleSprite: THREE.Sprite | null = null;
  private buttonSprites: THREE.Sprite[] = [];
  private loadFileInput: HTMLInputElement | null = null;

  private viewWidth: number = 800;
  private viewHeight: number = 600;

  private onClickHandler: ((e: MouseEvent) => void) | null = null;
  private onAction: (action: MenuAction, data?: LevelData) => void = () => {};

  constructor(
    scene: THREE.Scene,
    camera: THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  public enter(onAction: (action: MenuAction, data?: LevelData) => void): void {
    if (this.isActive) return;
    this.isActive = true;
    this.onAction = onAction;

    this.createMenu();
    this.setupInput();
  }

  public exit(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.removeInput();
    this.disposeGroup(this.menuGroup);
    this.scene.remove(this.menuGroup);
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public resize(width: number, height: number): void {
    this.viewWidth = width;
    this.viewHeight = height;
    this.updatePositions();
  }

  private createMenu(): void {
    this.menuGroup.clear();
    this.buttonSprites = [];

    const titleCanvas = document.createElement('canvas');
    titleCanvas.width = 500;
    titleCanvas.height = 80;
    const titleCtx = titleCanvas.getContext('2d')!;
    titleCtx.fillStyle = '#5AC8FA';
    titleCtx.font = 'bold 36px monospace';
    titleCtx.textAlign = 'center';
    titleCtx.textBaseline = 'middle';
    titleCtx.fillText('⏳ 时间回溯', 250, 30);
    titleCtx.fillStyle = '#8E8E93';
    titleCtx.font = '16px monospace';
    titleCtx.fillText('2D Platformer with Time Rewind', 250, 60);

    const titleTexture = new THREE.CanvasTexture(titleCanvas);
    titleTexture.minFilter = THREE.LinearFilter;
    const titleMat = new THREE.SpriteMaterial({ map: titleTexture, transparent: true, depthTest: false });
    this.titleSprite = new THREE.Sprite(titleMat);
    this.titleSprite.scale.set(350, 56, 1);
    this.menuGroup.add(this.titleSprite);

    const buttons = [
      { label: '▶ 开始游戏', color: '#34C759', action: MENU_ACTIONS.play },
      { label: '🔧 编辑模式', color: '#007AFF', action: MENU_ACTIONS.editor },
      { label: '📂 加载关卡', color: '#FF9500', action: MENU_ACTIONS.load }
    ];

    for (const btn of buttons) {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 50;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = btn.color;
      ctx.beginPath();
      ctx.roundRect(0, 0, 240, 50, 8);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, 120, 25);

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(200, 42, 1);
      sprite.userData = { action: btn.action };

      this.buttonSprites.push(sprite);
      this.menuGroup.add(sprite);
    }

    const hintCanvas = document.createElement('canvas');
    hintCanvas.width = 400;
    hintCanvas.height = 24;
    const hintCtx = hintCanvas.getContext('2d')!;
    hintCtx.fillStyle = '#8E8E93';
    hintCtx.font = '12px monospace';
    hintCtx.textAlign = 'center';
    hintCtx.textBaseline = 'middle';
    hintCtx.fillText('方向键移动 | 空格跳跃 | R时间回溯', 200, 12);

    const hintTexture = new THREE.CanvasTexture(hintCanvas);
    hintTexture.minFilter = THREE.LinearFilter;
    const hintMat = new THREE.SpriteMaterial({ map: hintTexture, transparent: true, depthTest: false });
    const hintSprite = new THREE.Sprite(hintMat);
    hintSprite.scale.set(300, 18, 1);
    this.menuGroup.add(hintSprite);

    this.menuGroup.position.z = 10;
    this.scene.add(this.menuGroup);
    this.updatePositions();
  }

  private updatePositions(): void {
    if (this.titleSprite) {
      this.titleSprite.position.set(0, this.viewHeight / 2 - 100, 0);
    }

    for (let i = 0; i < this.buttonSprites.length; i++) {
      this.buttonSprites[i].position.set(0, this.viewHeight / 2 - 180 - i * 55, 0);
    }

    const hintSprite = this.menuGroup.children[this.menuGroup.children.length - 1];
    if (hintSprite instanceof THREE.Sprite) {
      hintSprite.position.set(0, -this.viewHeight / 2 + 40, 0);
    }
  }

  private setupInput(): void {
    this.onClickHandler = (e: MouseEvent) => this.handleClick(e);
    this.renderer.domElement.addEventListener('click', this.onClickHandler);
  }

  private removeInput(): void {
    if (this.onClickHandler) {
      this.renderer.domElement.removeEventListener('click', this.onClickHandler);
      this.onClickHandler = null;
    }
  }

  private handleClick(e: MouseEvent): void {
    if (!this.isActive) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const worldX = ndcX * (this.camera.right - this.camera.left) / 2;
    const worldY = ndcY * (this.camera.top - this.camera.bottom) / 2;

    for (const sprite of this.buttonSprites) {
      const sx = sprite.position.x;
      const sy = sprite.position.y;
      const hw = 100;
      const hh = 21;

      if (worldX >= sx - hw && worldX <= sx + hw && worldY >= sy - hh && worldY <= sy + hh) {
        const action = sprite.userData.action as MenuAction;

        if (action === 'load') {
          this.openFilePicker();
          return;
        }

        this.onAction(action);
        return;
      }
    }
  }

  private openFilePicker(): void {
    if (!this.loadFileInput) {
      this.loadFileInput = document.createElement('input');
      this.loadFileInput.type = 'file';
      this.loadFileInput.accept = '.json';
      this.loadFileInput.style.display = 'none';
      document.body.appendChild(this.loadFileInput);

      this.loadFileInput.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
          const json = ev.target?.result as string;
          try {
            const data = JSON.parse(json) as LevelData;
            if (data.platforms && Array.isArray(data.platforms)) {
              this.onAction('load', data);
            }
          } catch {
            alert('无效的关卡文件格式');
          }
        };
        reader.readAsText(file);
        this.loadFileInput!.value = '';
      });
    }

    this.loadFileInput.click();
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
        child.geometry.dispose();
        const mat = child.material as THREE.Material;
        if ('map' in mat && (mat as THREE.MeshBasicMaterial).map) {
          ((mat as THREE.MeshBasicMaterial).map as THREE.Texture).dispose();
        }
        mat.dispose();
      }
    });
  }
}
