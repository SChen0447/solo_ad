import * as THREE from 'three';
import { Platform, PlatformType, Level } from './level';

export enum EditorTool {
  FIXED = 'fixed',
  MOVING = 'moving',
  DISAPPEARING = 'disappearing',
  TRIGGER = 'trigger',
  SPAWN = 'spawn',
  GOAL = 'goal',
  ERASER = 'eraser'
}

export interface EditorPlatformData {
  type: PlatformType;
  x: number;
  y: number;
  width: number;
  height: number;
  moveSpeed?: number;
  moveRange?: number;
  moveAxis?: 'x' | 'y';
  disappearDelay?: number;
  linkedDoorId?: number;
}

export interface LevelData {
  name: string;
  spawnX: number;
  spawnY: number;
  goalX: number;
  goalY: number;
  platforms: EditorPlatformData[];
}

export class Editor {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;

  private isActive: boolean = false;
  private currentTool: EditorTool = EditorTool.FIXED;
  private platforms: Platform[] = [];
  private platformDataList: EditorPlatformData[] = [];

  private gridGroup: THREE.Group = new THREE.Group();
  private toolbarGroup: THREE.Group = new THREE.Group();
  private cursorGroup: THREE.Group = new THREE.Group();
  private dimOverlay: THREE.Mesh | null = null;

  private spawnX: number = 0;
  private spawnY: number = -150;
  private spawnMarker: THREE.Sprite | null = null;
  private goalX: number = 200;
  private goalY: number = 100;
  private goalMarker: THREE.Sprite | null = null;

  private movingFirstPoint: { x: number; y: number } | null = null;
  private movingFirstMarker: THREE.Mesh | null = null;

  private disappearDelay: number = 1.5;

  private nextId: number = 0;
  private gridSize: number = 64;

  private mouseWorldX: number = 0;
  private mouseWorldY: number = 0;

  private selectedToolSprite: THREE.Sprite | null = null;
  private toolSprites: Map<EditorTool, THREE.Sprite> = new Map();
  private toolLabels: Map<EditorTool, THREE.Sprite> = new Map();

  private helpTextSprite: THREE.Sprite | null = null;
  private statusTextSprite: THREE.Sprite | null = null;

  private viewWidth: number = 800;
  private viewHeight: number = 600;
  private bounds: { minX: number; maxX: number; minY: number; maxY: number } = {
    minX: -400, maxX: 400, minY: -300, maxY: 300
  };

  private onClickHandler: ((e: MouseEvent) => void) | null = null;
  private onMoveHandler: ((e: MouseEvent) => void) | null = null;
  private onKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private onContextMenuHandler: ((e: Event) => void) | null = null;

  private onExitCallback: (() => void) | null = null;
  private onPlayCallback: ((data: LevelData) => void) | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.OrthographicCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  public enter(): void {
    if (this.isActive) return;
    this.isActive = true;
    this.platforms = [];
    this.platformDataList = [];
    this.nextId = 0;
    this.movingFirstPoint = null;
    this.spawnX = 0;
    this.spawnY = -150;
    this.goalX = 200;
    this.goalY = 100;

    this.createDimOverlay();
    this.createGrid();
    this.createToolbar();
    this.createCursor();
    this.createSpawnMarker();
    this.createGoalMarker();
    this.createHelpText();
    this.createStatusText();

    this.setupInput();
  }

  public exit(): void {
    if (!this.isActive) return;
    this.isActive = false;

    this.removeInput();

    this.clearPlatforms();

    if (this.spawnMarker) {
      this.scene.remove(this.spawnMarker);
      this.spawnMarker.geometry.dispose();
      (this.spawnMarker.material as THREE.Material).dispose();
      this.spawnMarker = null;
    }
    if (this.goalMarker) {
      this.scene.remove(this.goalMarker);
      this.goalMarker.geometry.dispose();
      (this.goalMarker.material as THREE.Material).dispose();
      this.goalMarker = null;
    }
    if (this.movingFirstMarker) {
      this.scene.remove(this.movingFirstMarker);
      this.movingFirstMarker.geometry.dispose();
      (this.movingFirstMarker.material as THREE.Material).dispose();
      this.movingFirstMarker = null;
    }

    this.scene.remove(this.gridGroup);
    this.scene.remove(this.toolbarGroup);
    this.scene.remove(this.cursorGroup);

    if (this.dimOverlay) {
      this.scene.remove(this.dimOverlay);
      this.dimOverlay.geometry.dispose();
      (this.dimOverlay.material as THREE.Material).dispose();
      this.dimOverlay = null;
    }

    this.disposeGroup(this.gridGroup);
    this.disposeGroup(this.toolbarGroup);
    this.disposeGroup(this.cursorGroup);
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

  public getIsActive(): boolean {
    return this.isActive;
  }

  public setCallbacks(onExit: () => void, onPlay: (data: LevelData) => void): void {
    this.onExitCallback = onExit;
    this.onPlayCallback = onPlay;
  }

  public resize(width: number, height: number): void {
    this.viewWidth = width;
    this.viewHeight = height;
    if (this.dimOverlay) {
      const scale = Math.max(width, height) * 2;
      this.dimOverlay.scale.set(scale, scale, 1);
    }
    this.updateToolbarPositions();
  }

  public loadLevelData(data: LevelData): void {
    this.clearPlatforms();
    this.spawnX = data.spawnX;
    this.spawnY = data.spawnY;
    this.goalX = data.goalX;
    this.goalY = data.goalY;

    if (this.spawnMarker) {
      this.spawnMarker.position.set(this.spawnX, this.spawnY, 1);
    }
    if (this.goalMarker) {
      this.goalMarker.position.set(this.goalX, this.goalY + 10, 1);
    }

    for (const pd of data.platforms) {
      this.addPlatformFromData(pd);
    }
  }

  private createDimOverlay(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthTest: false,
      depthWrite: false
    });
    this.dimOverlay = new THREE.Mesh(geometry, material);
    this.dimOverlay.position.z = -5;
    this.dimOverlay.frustumCulled = false;
    const scale = Math.max(this.viewWidth, this.viewHeight) * 2;
    this.dimOverlay.scale.set(scale, scale, 1);
    this.scene.add(this.dimOverlay);
  }

  private createGrid(): void {
    this.gridGroup.clear();
    const material = new THREE.LineBasicMaterial({
      color: 0x4A90D9,
      transparent: true,
      opacity: 0.15
    });

    for (let x = this.bounds.minX; x <= this.bounds.maxX; x += this.gridSize) {
      const points = [
        new THREE.Vector3(x, this.bounds.minY, -2),
        new THREE.Vector3(x, this.bounds.maxY, -2)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      this.gridGroup.add(line);
    }

    for (let y = this.bounds.minY; y <= this.bounds.maxY; y += this.gridSize) {
      const points = [
        new THREE.Vector3(this.bounds.minX, y, -2),
        new THREE.Vector3(this.bounds.maxX, y, -2)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      this.gridGroup.add(line);
    }

    this.scene.add(this.gridGroup);
  }

  private createToolbar(): void {
    this.toolbarGroup.clear();
    this.toolSprites.clear();
    this.toolLabels.clear();

    const tools = [
      { tool: EditorTool.FIXED, label: '1:固定', color: 0x8E8E93 },
      { tool: EditorTool.MOVING, label: '2:移动', color: 0x007AFF },
      { tool: EditorTool.DISAPPEARING, label: '3:消失', color: 0xFF3B30 },
      { tool: EditorTool.TRIGGER, label: '4:机关', color: 0xFF9500 },
      { tool: EditorTool.SPAWN, label: '5:起点', color: 0x34C759 },
      { tool: EditorTool.GOAL, label: '6:终点', color: 0xFFD700 },
      { tool: EditorTool.ERASER, label: '7:删除', color: 0xFF453A }
    ];

    for (let i = 0; i < tools.length; i++) {
      const { tool, label, color } = tools[i];

      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = 80;
      bgCanvas.height = 28;
      const ctx = bgCanvas.getContext('2d')!;

      ctx.fillStyle = i === 0 ? '#4A90D9' : '#333344';
      ctx.beginPath();
      ctx.roundRect(0, 0, 80, 28, 4);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 40, 14);

      const texture = new THREE.CanvasTexture(bgCanvas);
      texture.minFilter = THREE.LinearFilter;

      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(80, 28, 1);
      sprite.userData = { tool };

      this.toolSprites.set(tool, sprite);
      this.toolbarGroup.add(sprite);
    }

    const playCanvas = document.createElement('canvas');
    playCanvas.width = 80;
    playCanvas.height = 28;
    const playCtx = playCanvas.getContext('2d')!;
    playCtx.fillStyle = '#34C759';
    playCtx.beginPath();
    playCtx.roundRect(0, 0, 80, 28, 4);
    playCtx.fill();
    playCtx.fillStyle = '#ffffff';
    playCtx.font = '13px monospace';
    playCtx.textAlign = 'center';
    playCtx.textBaseline = 'middle';
    playCtx.fillText('▶ 测试', 40, 14);

    const playTexture = new THREE.CanvasTexture(playCanvas);
    playTexture.minFilter = THREE.LinearFilter;
    const playMat = new THREE.SpriteMaterial({ map: playTexture, transparent: true, depthTest: false });
    const playSprite = new THREE.Sprite(playMat);
    playSprite.scale.set(80, 28, 1);
    playSprite.userData = { tool: 'play' };
    this.toolSprites.set('play' as EditorTool, playSprite);
    this.toolbarGroup.add(playSprite);

    const saveCanvas = document.createElement('canvas');
    saveCanvas.width = 80;
    saveCanvas.height = 28;
    const saveCtx = saveCanvas.getContext('2d')!;
    saveCtx.fillStyle = '#5856D6';
    saveCtx.beginPath();
    saveCtx.roundRect(0, 0, 80, 28, 4);
    saveCtx.fill();
    saveCtx.fillStyle = '#ffffff';
    saveCtx.font = '13px monospace';
    saveCtx.textAlign = 'center';
    saveCtx.textBaseline = 'middle';
    saveCtx.fillText('💾 保存', 40, 14);

    const saveTexture = new THREE.CanvasTexture(saveCanvas);
    saveTexture.minFilter = THREE.LinearFilter;
    const saveMat = new THREE.SpriteMaterial({ map: saveTexture, transparent: true, depthTest: false });
    const saveSprite = new THREE.Sprite(saveMat);
    saveSprite.scale.set(80, 28, 1);
    saveSprite.userData = { tool: 'save' };
    this.toolSprites.set('save' as EditorTool, saveSprite);
    this.toolbarGroup.add(saveSprite);

    const exitCanvas = document.createElement('canvas');
    exitCanvas.width = 80;
    exitCanvas.height = 28;
    const exitCtx = exitCanvas.getContext('2d')!;
    exitCtx.fillStyle = '#8E8E93';
    exitCtx.beginPath();
    exitCtx.roundRect(0, 0, 80, 28, 4);
    exitCtx.fill();
    exitCtx.fillStyle = '#ffffff';
    exitCtx.font = '13px monospace';
    exitCtx.textAlign = 'center';
    exitCtx.textBaseline = 'middle';
    exitCtx.fillText('✕ 返回', 40, 14);

    const exitTexture = new THREE.CanvasTexture(exitCanvas);
    exitTexture.minFilter = THREE.LinearFilter;
    const exitMat = new THREE.SpriteMaterial({ map: exitTexture, transparent: true, depthTest: false });
    const exitSprite = new THREE.Sprite(exitMat);
    exitSprite.scale.set(80, 28, 1);
    exitSprite.userData = { tool: 'exit' };
    this.toolSprites.set('exit' as EditorTool, exitSprite);
    this.toolbarGroup.add(exitSprite);

    this.toolbarGroup.position.z = 10;
    this.scene.add(this.toolbarGroup);
    this.updateToolbarPositions();
  }

  private updateToolbarPositions(): void {
    const left = -this.viewWidth / 2;
    const top = this.viewHeight / 2;
    const startX = left + 50;
    const startY = top - 20;

    const tools = [
      EditorTool.FIXED, EditorTool.MOVING, EditorTool.DISAPPEARING, EditorTool.TRIGGER,
      EditorTool.SPAWN, EditorTool.GOAL, EditorTool.ERASER
    ];

    for (let i = 0; i < tools.length; i++) {
      const sprite = this.toolSprites.get(tools[i]);
      if (sprite) {
        const row = Math.floor(i / 4);
        const col = i % 4;
        sprite.position.set(startX + col * 90, startY - row * 35, 0);
      }
    }

    const playSprite = this.toolSprites.get('play' as EditorTool);
    if (playSprite) {
      playSprite.position.set(startX, startY - 2 * 35, 0);
    }
    const saveSprite = this.toolSprites.get('save' as EditorTool);
    if (saveSprite) {
      saveSprite.position.set(startX + 90, startY - 2 * 35, 0);
    }
    const exitSprite = this.toolSprites.get('exit' as EditorTool);
    if (exitSprite) {
      exitSprite.position.set(startX + 180, startY - 2 * 35, 0);
    }
  }

  private createCursor(): void {
    this.cursorGroup.clear();
    const geometry = new THREE.PlaneGeometry(64, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthTest: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = 3;
    this.cursorGroup.add(mesh);
    this.cursorGroup.position.z = 10;
    this.scene.add(this.cursorGroup);
  }

  private createSpawnMarker(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#34C759';
    ctx.fillRect(8, 2, 16, 12);
    ctx.fillStyle = '#007AFF';
    ctx.fillRect(6, 14, 20, 10);
    ctx.fillStyle = '#8E8E93';
    ctx.fillRect(8, 24, 6, 6);
    ctx.fillRect(18, 24, 6, 6);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    this.spawnMarker = new THREE.Sprite(material);
    this.spawnMarker.scale.set(24, 24, 1);
    this.spawnMarker.position.set(this.spawnX, this.spawnY, 1);
    this.scene.add(this.spawnMarker);
  }

  private createGoalMarker(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(14, 0, 3, 40);
    ctx.fillStyle = '#FF3B30';
    ctx.beginPath();
    ctx.moveTo(17, 2);
    ctx.lineTo(30, 8);
    ctx.lineTo(17, 14);
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    this.goalMarker = new THREE.Sprite(material);
    this.goalMarker.scale.set(30, 40, 1);
    this.goalMarker.position.set(this.goalX, this.goalY + 10, 1);
    this.scene.add(this.goalMarker);
  }

  private createHelpText(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 28;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('左键放置 | 右键删除 | 数字键切换工具 | Esc返回菜单', 5, 14);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.helpTextSprite = new THREE.Sprite(material);
    this.helpTextSprite.scale.set(300, 20, 1);
    this.helpTextSprite.position.z = 0;
    this.toolbarGroup.add(this.helpTextSprite);
  }

  private createStatusText(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 22;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#4A90D9';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('工具: 固定平台 | 消失延迟: 1.5s', 5, 11);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.statusTextSprite = new THREE.Sprite(material);
    this.statusTextSprite.scale.set(240, 18, 1);
    this.statusTextSprite.position.z = 0;
    this.toolbarGroup.add(this.statusTextSprite);
  }

  private updateStatusText(): void {
    if (!this.statusTextSprite) return;

    const toolNames: Record<string, string> = {
      [EditorTool.FIXED]: '固定平台',
      [EditorTool.MOVING]: '移动平台(点两次)',
      [EditorTool.DISAPPEARING]: '消失平台',
      [EditorTool.TRIGGER]: '触发机关',
      [EditorTool.SPAWN]: '玩家起点',
      [EditorTool.GOAL]: '终点旗帜',
      [EditorTool.ERASER]: '删除工具'
    };

    let text = `工具: ${toolNames[this.currentTool] || '未知'}`;
    if (this.currentTool === EditorTool.DISAPPEARING) {
      text += ` | 延迟: ${this.disappearDelay.toFixed(1)}s (+/-调整)`;
    }
    if (this.currentTool === EditorTool.MOVING && this.movingFirstPoint) {
      text += ' | 已选起点,请点终点';
    }

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 22;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#4A90D9';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 5, 11);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    (this.statusTextSprite.material as THREE.SpriteMaterial).map?.dispose();
    (this.statusTextSprite.material as THREE.SpriteMaterial).map = texture;
    texture.needsUpdate = true;
  }

  private updateHelpTextPosition(): void {
    if (this.helpTextSprite) {
      const bottom = -this.viewHeight / 2;
      this.helpTextSprite.position.set(0, bottom + 20, 0);
    }
    if (this.statusTextSprite) {
      const bottom = -this.viewHeight / 2;
      this.statusTextSprite.position.set(0, bottom + 40, 0);
    }
  }

  private setupInput(): void {
    this.onClickHandler = (e: MouseEvent) => this.handleClick(e);
    this.onMoveHandler = (e: MouseEvent) => this.handleMouseMove(e);
    this.onKeyHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.onContextMenuHandler = (e: Event) => e.preventDefault();

    this.renderer.domElement.addEventListener('click', this.onClickHandler);
    this.renderer.domElement.addEventListener('mousemove', this.onMoveHandler);
    window.addEventListener('keydown', this.onKeyHandler);
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenuHandler);
  }

  private removeInput(): void {
    if (this.onClickHandler) {
      this.renderer.domElement.removeEventListener('click', this.onClickHandler);
    }
    if (this.onMoveHandler) {
      this.renderer.domElement.removeEventListener('mousemove', this.onMoveHandler);
    }
    if (this.onKeyHandler) {
      window.removeEventListener('keydown', this.onKeyHandler);
    }
    if (this.onContextMenuHandler) {
      this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenuHandler);
    }
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1;

    const worldX = ndcX * (this.camera.right - this.camera.left) / 2 + (this.camera.right + this.camera.left) / 2;
    const worldY = ndcY * (this.camera.top - this.camera.bottom) / 2 + (this.camera.top + this.camera.bottom) / 2;

    return { x: worldX, y: worldY };
  }

  private snapToGrid(val: number): number {
    return Math.round(val / this.gridSize) * this.gridSize;
  }

  private handleClick(e: MouseEvent): void {
    if (!this.isActive) return;

    const world = this.screenToWorld(e.clientX, e.clientY);

    if (this.checkToolbarClick(e.clientX, e.clientY)) return;

    if (e.button === 0) {
      this.handleLeftClick(world.x, world.y);
    } else if (e.button === 2) {
      this.handleRightClick(world.x, world.y);
    }
  }

  private checkToolbarClick(screenX: number, screenY: number): boolean {
    const world = this.screenToWorld(screenX, screenY);

    for (const [key, sprite] of this.toolSprites) {
      if (!sprite.visible) continue;
      const sx = sprite.position.x;
      const sy = sprite.position.y;
      const hw = 40;
      const hh = 14;

      if (world.x >= sx - hw && world.x <= sx + hw && world.y >= sy - hh && world.y <= sy + hh) {
        const tool = sprite.userData.tool as string;
        if (tool === 'play') {
          this.testLevel();
          return true;
        }
        if (tool === 'save') {
          this.saveLevel();
          return true;
        }
        if (tool === 'exit') {
          this.exit();
          if (this.onExitCallback) this.onExitCallback();
          return true;
        }
        this.selectTool(tool as EditorTool);
        return true;
      }
    }
    return false;
  }

  private handleLeftClick(wx: number, wy: number): void {
    const sx = this.snapToGrid(wx);
    const sy = this.snapToGrid(wy);

    switch (this.currentTool) {
      case EditorTool.FIXED:
        this.addPlatform(EditorTool.FIXED, sx, sy);
        break;
      case EditorTool.DISAPPEARING:
        this.addPlatform(EditorTool.DISAPPEARING, sx, sy);
        break;
      case EditorTool.TRIGGER:
        this.addPlatform(EditorTool.TRIGGER, sx, sy);
        break;
      case EditorTool.MOVING:
        this.handleMovingClick(sx, sy);
        break;
      case EditorTool.SPAWN:
        this.spawnX = sx;
        this.spawnY = sy;
        if (this.spawnMarker) {
          this.spawnMarker.position.set(sx, sy, 1);
        }
        break;
      case EditorTool.GOAL:
        this.goalX = sx;
        this.goalY = sy;
        if (this.goalMarker) {
          this.goalMarker.position.set(sx, sy + 10, 1);
        }
        break;
      case EditorTool.ERASER:
        this.eraseAt(wx, wy);
        break;
    }
  }

  private handleRightClick(wx: number, wy: number): void {
    this.eraseAt(wx, wy);
  }

  private handleMovingClick(sx: number, sy: number): void {
    if (!this.movingFirstPoint) {
      this.movingFirstPoint = { x: sx, y: sy };

      const geometry = new THREE.PlaneGeometry(64, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0x007AFF,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      this.movingFirstMarker = new THREE.Mesh(geometry, material);
      this.movingFirstMarker.position.set(sx, sy, 1);
      this.scene.add(this.movingFirstMarker);

      this.updateStatusText();
    } else {
      const dx = sx - this.movingFirstPoint.x;
      const dy = sy - this.movingFirstPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const isHorizontal = Math.abs(dx) >= Math.abs(dy);
        const data: EditorPlatformData = {
          type: PlatformType.MOVING,
          x: this.movingFirstPoint.x,
          y: this.movingFirstPoint.y,
          width: 64,
          height: 16,
          moveSpeed: 60,
          moveRange: dist,
          moveAxis: isHorizontal ? 'x' : 'y'
        };
        this.addPlatformFromData(data);
      }

      if (this.movingFirstMarker) {
        this.scene.remove(this.movingFirstMarker);
        this.movingFirstMarker.geometry.dispose();
        (this.movingFirstMarker.material as THREE.Material).dispose();
        this.movingFirstMarker = null;
      }
      this.movingFirstPoint = null;
      this.updateStatusText();
    }
  }

  private addPlatform(tool: EditorTool, x: number, y: number): void {
    let platformType: PlatformType;
    switch (tool) {
      case EditorTool.FIXED: platformType = PlatformType.FIXED; break;
      case EditorTool.DISAPPEARING: platformType = PlatformType.DISAPPEARING; break;
      case EditorTool.TRIGGER: platformType = PlatformType.TRIGGER; break;
      default: return;
    }

    const data: EditorPlatformData = {
      type: platformType,
      x, y,
      width: 64,
      height: 16
    };

    if (tool === EditorTool.DISAPPEARING) {
      data.disappearDelay = this.disappearDelay;
    }

    this.addPlatformFromData(data);
  }

  private addPlatformFromData(data: EditorPlatformData): void {
    const options: Partial<Platform> = {};
    if (data.moveSpeed !== undefined) options.moveSpeed = data.moveSpeed;
    if (data.moveRange !== undefined) options.moveRange = data.moveRange;
    if (data.moveAxis !== undefined) options.moveAxis = data.moveAxis;
    if (data.disappearDelay !== undefined) options.disappearDelay = data.disappearDelay;
    if (data.linkedDoorId !== undefined) options.linkedDoorId = data.linkedDoorId;

    const platform = new Platform(
      this.nextId++,
      data.type,
      data.x,
      data.y,
      data.width,
      data.height,
      options
    );

    this.platforms.push(platform);
    this.platformDataList.push(data);
    this.scene.add(platform.mesh);
  }

  private eraseAt(wx: number, wy: number): void {
    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      const aabb = p.getAABB();
      if (wx >= aabb.minX && wx <= aabb.maxX && wy >= aabb.minY && wy <= aabb.maxY) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.platforms.splice(i, 1);
        this.platformDataList.splice(i, 1);
        break;
      }
    }
  }

  private clearPlatforms(): void {
    for (const p of this.platforms) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.platforms = [];
    this.platformDataList = [];
    this.nextId = 0;
  }

  private selectTool(tool: EditorTool): void {
    this.currentTool = tool;
    this.movingFirstPoint = null;

    if (this.movingFirstMarker) {
      this.scene.remove(this.movingFirstMarker);
      this.movingFirstMarker.geometry.dispose();
      (this.movingFirstMarker.material as THREE.Material).dispose();
      this.movingFirstMarker = null;
    }

    this.updateToolbarHighlight();
    this.updateCursorVisual();
    this.updateStatusText();
  }

  private updateToolbarHighlight(): void {
    const toolOrder = [
      EditorTool.FIXED, EditorTool.MOVING, EditorTool.DISAPPEARING, EditorTool.TRIGGER,
      EditorTool.SPAWN, EditorTool.GOAL, EditorTool.ERASER
    ];

    const toolLabels = ['1:固定', '2:移动', '3:消失', '4:机关', '5:起点', '6:终点', '7:删除'];
    const toolColors = [0x8E8E93, 0x007AFF, 0xFF3B30, 0xFF9500, 0x34C759, 0xFFD700, 0xFF453A];

    for (let i = 0; i < toolOrder.length; i++) {
      const sprite = this.toolSprites.get(toolOrder[i]);
      if (!sprite) continue;

      const isActive = toolOrder[i] === this.currentTool;
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = 80;
      bgCanvas.height = 28;
      const ctx = bgCanvas.getContext('2d')!;

      ctx.fillStyle = isActive ? '#4A90D9' : '#333344';
      ctx.beginPath();
      ctx.roundRect(0, 0, 80, 28, 4);
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(1, 1, 78, 26, 4);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(toolLabels[i], 40, 14);

      const texture = new THREE.CanvasTexture(bgCanvas);
      texture.minFilter = THREE.LinearFilter;
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      (sprite.material as THREE.SpriteMaterial).map = texture;
      texture.needsUpdate = true;
    }
  }

  private updateCursorVisual(): void {
    const cursorMesh = this.cursorGroup.children[0] as THREE.Mesh | undefined;
    if (!cursorMesh) return;

    let color = 0xffffff;
    let scaleX = 64;
    let scaleY = 16;

    switch (this.currentTool) {
      case EditorTool.FIXED: color = 0x8E8E93; break;
      case EditorTool.MOVING: color = 0x007AFF; break;
      case EditorTool.DISAPPEARING: color = 0xFF3B30; break;
      case EditorTool.TRIGGER: color = 0xFF9500; break;
      case EditorTool.SPAWN: color = 0x34C759; scaleX = 16; scaleY = 16; break;
      case EditorTool.GOAL: color = 0xFFD700; scaleX = 16; scaleY = 16; break;
      case EditorTool.ERASER: color = 0xFF453A; break;
    }

    (cursorMesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    cursorMesh.scale.set(scaleX / 64, scaleY / 16, 1);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isActive) return;

    const world = this.screenToWorld(e.clientX, e.clientY);
    this.mouseWorldX = world.x;
    this.mouseWorldY = world.y;

    const sx = this.snapToGrid(world.x);
    const sy = this.snapToGrid(world.y);

    const cursorMesh = this.cursorGroup.children[0];
    if (cursorMesh) {
      cursorMesh.position.set(sx, sy, 3);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isActive) return;

    switch (e.code) {
      case 'Digit1': this.selectTool(EditorTool.FIXED); break;
      case 'Digit2': this.selectTool(EditorTool.MOVING); break;
      case 'Digit3': this.selectTool(EditorTool.DISAPPEARING); break;
      case 'Digit4': this.selectTool(EditorTool.TRIGGER); break;
      case 'Digit5': this.selectTool(EditorTool.SPAWN); break;
      case 'Digit6': this.selectTool(EditorTool.GOAL); break;
      case 'Digit7': this.selectTool(EditorTool.ERASER); break;
      case 'Escape':
        this.exit();
        if (this.onExitCallback) this.onExitCallback();
        break;
      case 'Equal':
      case 'NumpadAdd':
        if (this.currentTool === EditorTool.DISAPPEARING) {
          this.disappearDelay = Math.min(5, this.disappearDelay + 0.5);
          this.updateStatusText();
        }
        break;
      case 'Minus':
      case 'NumpadSubtract':
        if (this.currentTool === EditorTool.DISAPPEARING) {
          this.disappearDelay = Math.max(0.5, this.disappearDelay - 0.5);
          this.updateStatusText();
        }
        break;
    }
  }

  private getLevelData(): LevelData {
    return {
      name: `level_${Date.now()}`,
      spawnX: this.spawnX,
      spawnY: this.spawnY,
      goalX: this.goalX,
      goalY: this.goalY,
      platforms: [...this.platformDataList]
    };
  }

  public saveLevel(): void {
    const data = this.getLevelData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `level_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private testLevel(): void {
    const data = this.getLevelData();
    if (this.onPlayCallback) {
      this.onPlayCallback(data);
    }
  }

  public static loadLevelFromJSON(json: string): LevelData | null {
    try {
      const data = JSON.parse(json) as LevelData;
      if (data.platforms && Array.isArray(data.platforms) && typeof data.spawnX === 'number') {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static buildLevelFromData(data: LevelData, scene: THREE.Scene): Level {
    const level = new Level();

    for (const pd of data.platforms) {
      const options: Partial<Platform> = {};
      if (pd.moveSpeed !== undefined) options.moveSpeed = pd.moveSpeed;
      if (pd.moveRange !== undefined) options.moveRange = pd.moveRange;
      if (pd.moveAxis !== undefined) options.moveAxis = pd.moveAxis;
      if (pd.disappearDelay !== undefined) options.disappearDelay = pd.disappearDelay;
      if (pd.linkedDoorId !== undefined) options.linkedDoorId = pd.linkedDoorId;

      const platform = new Platform(
        level.platforms.length,
        pd.type,
        pd.x,
        pd.y,
        pd.width,
        pd.height,
        options
      );
      level.platforms.push(platform);
      scene.add(platform.mesh);
    }

    level.goalX = data.goalX;
    level.goalY = data.goalY;

    const goalCanvas = document.createElement('canvas');
    goalCanvas.width = 30;
    goalCanvas.height = 40;
    const ctx = goalCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(14, 0, 2, 40);
    ctx.fillStyle = '#FF3B30';
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(28, 8);
    ctx.lineTo(16, 14);
    ctx.closePath();
    ctx.fill();
    const goalTexture = new THREE.CanvasTexture(goalCanvas);
    goalTexture.magFilter = THREE.NearestFilter;
    goalTexture.minFilter = THREE.NearestFilter;
    const goalMaterial = new THREE.MeshBasicMaterial({ map: goalTexture, transparent: true, side: THREE.DoubleSide });
    const goalGeometry = new THREE.PlaneGeometry(30, 40);
    level.goalMesh = new THREE.Mesh(goalGeometry, goalMaterial);
    level.goalMesh.position.set(level.goalX, level.goalY + 20, 0);
    scene.add(level.goalMesh);

    level.createBoundary(scene);

    return level;
  }

  public update(): void {
    this.updateHelpTextPosition();
    this.updateToolbarPositions();
  }
}
