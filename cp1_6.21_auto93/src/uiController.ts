import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { Room, RoomConfig, WallReflectivity, WallName } from './room';
import { SoundSource } from './soundSource';
import { RayTracer } from './rayTracer';

export interface UIControllerCallbacks {
  onRoomChanged: (config: RoomConfig) => void;
  onSourcePositionChanged: (position: THREE.Vector3) => void;
  onRayParamsChanged: (rayCount: number, maxReflections: number) => void;
  onReflectivityChanged: (reflectivity: WallReflectivity) => void;
  onRecalculateRays: () => void;
}

export interface UIParams {
  sourceX: number;
  sourceY: number;
  sourceZ: number;
  roomWidth: number;
  roomDepth: number;
  roomHeight: number;
  rayCount: number;
  maxReflections: number;
  globalReflectivity: boolean;
  reflectionGlobal: number;
  reflectionLeft: number;
  reflectionRight: number;
  reflectionFront: number;
  reflectionBack: number;
  reflectionFloor: number;
  reflectionCeiling: number;
}

export class UIController {
  private gui: GUI;
  private params: UIParams;
  private callbacks: UIControllerCallbacks;
  private room: Room;
  private source: SoundSource;

  private folders: {
    source: GUI;
    room: GUI;
    rays: GUI;
    reflectivity: GUI;
  };

  private rayCountController: any;
  private maxReflectionsController: any;
  private sourceXController: any;
  private sourceYController: any;
  private sourceZController: any;
  private widthController: any;
  private depthController: any;
  private heightController: any;

  private rayRecalcTimeout: number | null = null;
  private roomRecalcTimeout: number | null = null;

  constructor(container: HTMLElement, room: Room, source: SoundSource, callbacks: UIControllerCallbacks) {
    this.room = room;
    this.source = source;
    this.callbacks = callbacks;

    const roomConfig = room.data.config;
    const sourcePos = source.getPosition();
    const bounds = room.data.getBounds();

    this.params = {
      sourceX: sourcePos.x,
      sourceY: sourcePos.y,
      sourceZ: sourcePos.z,
      roomWidth: roomConfig.width,
      roomDepth: roomConfig.depth,
      roomHeight: roomConfig.height,
      rayCount: 16,
      maxReflections: 6,
      globalReflectivity: true,
      reflectionGlobal: 0.75,
      reflectionLeft: room.data.reflectivity.left,
      reflectionRight: room.data.reflectivity.right,
      reflectionFront: room.data.reflectivity.front,
      reflectionBack: room.data.reflectivity.back,
      reflectionFloor: room.data.reflectivity.floor,
      reflectionCeiling: room.data.reflectivity.ceiling,
    };

    this.gui = new GUI({ autoPlace: false, width: 300 });
    container.appendChild(this.gui.domElement);

    this.gui.domElement.style.position = 'absolute';
    this.gui.domElement.style.top = '0';
    this.gui.domElement.style.right = '0';

    this.folders = {
      source: this.gui.addFolder('声源参数'),
      room: this.gui.addFolder('房间参数'),
      rays: this.gui.addFolder('射线参数'),
      reflectivity: this.gui.addFolder('墙面反射系数'),
    };

    Object.values(this.folders).forEach((folder) => {
      folder.open();
    });

    this.buildSourceFolder();
    this.buildRoomFolder();
    this.buildRaysFolder();
    this.buildReflectivityFolder();

    this.updateSourceRanges();
  }

  private buildSourceFolder(): void {
    const folder = this.folders.source;

    this.sourceXController = folder
      .add(this.params, 'sourceX', -5, 5, 0.05)
      .name('X 位置')
      .onChange(() => this.scheduleRayRecalc(80));

    this.sourceYController = folder
      .add(this.params, 'sourceY', 0.1, 3.9, 0.05)
      .name('Y 位置')
      .onChange(() => this.scheduleRayRecalc(80));

    this.sourceZController = folder
      .add(this.params, 'sourceZ', -3, 3, 0.05)
      .name('Z 位置')
      .onChange(() => this.scheduleRayRecalc(80));

    folder
      .add({ reset: () => this.resetSource() }, 'reset')
      .name('重置声源位置');
  }

  private buildRoomFolder(): void {
    const folder = this.folders.room;
    const minDim = Room.MIN_DIM;
    const maxDim = Room.MAX_DIM;

    this.widthController = folder
      .add(this.params, 'roomWidth', minDim, maxDim, 0.1)
      .name('宽度 (m)')
      .onChange(() => this.scheduleRoomRecalc(150));

    this.depthController = folder
      .add(this.params, 'roomDepth', minDim, maxDim, 0.1)
      .name('深度 (m)')
      .onChange(() => this.scheduleRoomRecalc(150));

    this.heightController = folder
      .add(this.params, 'roomHeight', minDim, maxDim, 0.1)
      .name('高度 (m)')
      .onChange(() => this.scheduleRoomRecalc(150));

    folder
      .add({ reset: () => this.resetRoom() }, 'reset')
      .name('重置房间尺寸');
  }

  private buildRaysFolder(): void {
    const folder = this.folders.rays;

    this.rayCountController = folder
      .add(this.params, 'rayCount', 1, 64, 1)
      .name('射线数量')
      .onChange(() => this.scheduleRayRecalc(50));

    this.maxReflectionsController = folder
      .add(this.params, 'maxReflections', 1, 6, 1)
      .name('最大反射次数')
      .onChange(() => this.scheduleRayRecalc(50));

    folder
      .add({ recalc: () => this.callbacks.onRecalculateRays() }, 'recalc')
      .name('重新生成射线');
  }

  private buildReflectivityFolder(): void {
    const folder = this.folders.reflectivity;

    folder
      .add(this.params, 'globalReflectivity')
      .name('全局统一设置')
      .onChange(() => this.toggleGlobalReflectivity());

    const globalController = folder
      .add(this.params, 'reflectionGlobal', 0, 1, 0.01)
      .name('全局反射系数')
      .onChange((val: number) => {
        if (this.params.globalReflectivity) {
          this.applyGlobalReflectivity(val);
        }
      });

    const perWallControllers = [
      folder.add(this.params, 'reflectionLeft', 0, 1, 0.01).name('左墙').onChange(() => this.notifyReflectivity()),
      folder.add(this.params, 'reflectionRight', 0, 1, 0.01).name('右墙').onChange(() => this.notifyReflectivity()),
      folder.add(this.params, 'reflectionFront', 0, 1, 0.01).name('前墙').onChange(() => this.notifyReflectivity()),
      folder.add(this.params, 'reflectionBack', 0, 1, 0.01).name('后墙').onChange(() => this.notifyReflectivity()),
      folder.add(this.params, 'reflectionFloor', 0, 1, 0.01).name('地板').onChange(() => this.notifyReflectivity()),
      folder.add(this.params, 'reflectionCeiling', 0, 1, 0.01).name('天花板').onChange(() => this.notifyReflectivity()),
    ];

    this.toggleGlobalReflectivity();
  }

  private toggleGlobalReflectivity(): void {
    const isGlobal = this.params.globalReflectivity;
    const reflectivityFolder = this.folders.reflectivity;

    const controllers = (reflectivityFolder as any).__controllers as any[];
    controllers.forEach((ctrl) => {
      const name = (ctrl as any).name as string;
      if (name === '全局反射系数') {
        (ctrl.domElement.style as any).display = isGlobal ? '' : 'none';
      } else if (['左墙', '右墙', '前墙', '后墙', '地板', '天花板'].includes(name)) {
        (ctrl.domElement.style as any).display = isGlobal ? 'none' : '';
        (ctrl as any).domElement.parentElement.style.display = isGlobal ? 'none' : '';
      }
    });

    if (isGlobal) {
      this.applyGlobalReflectivity(this.params.reflectionGlobal);
    }
  }

  private applyGlobalReflectivity(val: number): void {
    this.params.reflectionLeft = val;
    this.params.reflectionRight = val;
    this.params.reflectionFront = val;
    this.params.reflectionBack = val;
    this.params.reflectionFloor = val;
    this.params.reflectionCeiling = val;
    this.notifyReflectivity();
  }

  private notifyReflectivity(): void {
    const reflectivity: WallReflectivity = {
      left: this.params.reflectionLeft,
      right: this.params.reflectionRight,
      front: this.params.reflectionFront,
      back: this.params.reflectionBack,
      floor: this.params.reflectionFloor,
      ceiling: this.params.reflectionCeiling,
    };
    this.callbacks.onReflectivityChanged(reflectivity);
    this.scheduleRayRecalc(60);
  }

  private scheduleRayRecalc(delay: number): void {
    if (this.rayRecalcTimeout !== null) {
      window.clearTimeout(this.rayRecalcTimeout);
    }

    const pos = new THREE.Vector3(this.params.sourceX, this.params.sourceY, this.params.sourceZ);
    this.callbacks.onSourcePositionChanged(pos);

    this.callbacks.onRayParamsChanged(this.params.rayCount, this.params.maxReflections);

    this.rayRecalcTimeout = window.setTimeout(() => {
      this.rayRecalcTimeout = null;
      this.callbacks.onRecalculateRays();
    }, delay);
  }

  private scheduleRoomRecalc(delay: number): void {
    if (this.roomRecalcTimeout !== null) {
      window.clearTimeout(this.roomRecalcTimeout);
    }

    this.roomRecalcTimeout = window.setTimeout(() => {
      this.roomRecalcTimeout = null;
      this.applyRoomChange();
    }, delay);
  }

  private applyRoomChange(): void {
    const config: RoomConfig = Room.clampConfig({
      width: this.params.roomWidth,
      depth: this.params.roomDepth,
      height: this.params.roomHeight,
    });

    this.params.roomWidth = config.width;
    this.params.roomDepth = config.depth;
    this.params.roomHeight = config.height;

    const bounds = this.room.data.getBounds();

    if (this.params.sourceX < bounds.min.x + 0.2) this.params.sourceX = bounds.min.x + 0.2;
    if (this.params.sourceX > bounds.max.x - 0.2) this.params.sourceX = bounds.max.x - 0.2;
    if (this.params.sourceY < bounds.min.y + 0.2) this.params.sourceY = bounds.min.y + 0.2;
    if (this.params.sourceY > bounds.max.y - 0.2) this.params.sourceY = bounds.max.y - 0.2;
    if (this.params.sourceZ < bounds.min.z + 0.2) this.params.sourceZ = bounds.min.z + 0.2;
    if (this.params.sourceZ > bounds.max.z - 0.2) this.params.sourceZ = bounds.max.z - 0.2;

    this.callbacks.onRoomChanged(config);
    this.updateSourceRanges();
    this.refreshControllers();
    this.callbacks.onRecalculateRays();
  }

  private updateSourceRanges(): void {
    const bounds = this.room.data.getBounds();

    if (this.sourceXController) {
      this.sourceXController.min(bounds.min.x + 0.1).max(bounds.max.x - 0.1);
      this.sourceXController.updateDisplay();
    }
    if (this.sourceYController) {
      this.sourceYController.min(bounds.min.y + 0.1).max(bounds.max.y - 0.1);
      this.sourceYController.updateDisplay();
    }
    if (this.sourceZController) {
      this.sourceZController.min(bounds.min.z + 0.1).max(bounds.max.z - 0.1);
      this.sourceZController.updateDisplay();
    }
  }

  public refreshControllers(): void {
    [this.widthController, this.depthController, this.heightController,
     this.sourceXController, this.sourceYController, this.sourceZController,
     this.rayCountController, this.maxReflectionsController].forEach((ctrl) => {
      if (ctrl) ctrl.updateDisplay();
    });
  }

  public resetSource(): void {
    this.params.sourceX = 0;
    this.params.sourceY = 1.5;
    this.params.sourceZ = 0;
    this.scheduleRayRecalc(10);
    this.refreshControllers();
  }

  public resetRoom(): void {
    this.params.roomWidth = 10;
    this.params.roomDepth = 6;
    this.params.roomHeight = 4;
    this.applyRoomChange();
  }

  public getParams(): UIParams {
    return { ...this.params };
  }

  public setRayCount(count: number): void {
    this.params.rayCount = Math.max(1, Math.min(64, count));
    this.rayCountController.updateDisplay();
  }

  public dispose(): void {
    if (this.rayRecalcTimeout !== null) window.clearTimeout(this.rayRecalcTimeout);
    if (this.roomRecalcTimeout !== null) window.clearTimeout(this.roomRecalcTimeout);
    this.gui.destroy();
  }
}
