import GUI from 'lil-gui';
import type { PhysicsEngine, PhysicsConfig } from './physicsEngine';
import type { RenderModule } from './renderModule';

interface DisplayData {
  bulletSpeed: number;
  bulletPosX: number;
  bulletPosY: number;
  bulletCount: number;
}

export class ControlPanel {
  private gui: GUI;
  private physicsEngine: PhysicsEngine;
  private renderModule: RenderModule;

  private params: {
    bulletSpeed: number;
    bulletAngle: number;
    gravity: number;
    obstacleType: 'circle' | 'rectangle' | 'triangle';
    collisionMode: 'bounce' | 'penetrate';
    showTrails: boolean;
    resetScene: () => void;
    resetCamera: () => void;
  };

  private displayData: DisplayData;
  private displayFolder!: GUI;

  constructor(physicsEngine: PhysicsEngine, renderModule: RenderModule) {
    this.physicsEngine = physicsEngine;
    this.renderModule = renderModule;

    const config = physicsEngine.getConfig();

    this.params = {
      bulletSpeed: config.bulletSpeed,
      bulletAngle: config.bulletAngle,
      gravity: config.gravity,
      obstacleType: config.obstacleType,
      collisionMode: config.collisionMode,
      showTrails: true,
      resetScene: () => this.handleResetScene(),
      resetCamera: () => this.handleResetCamera()
    };

    this.displayData = {
      bulletSpeed: 0,
      bulletPosX: 0,
      bulletPosY: 0,
      bulletCount: 0
    };

    this.gui = new GUI({
      title: '控制面板',
      width: 300,
      container: document.getElementById('app') || undefined
    });

    this.positionPanel();
    this.setupFolders();
  }

  private positionPanel(): void {
    const dom = this.gui.domElement;
    dom.style.position = 'fixed';
    dom.style.right = '20px';
    dom.style.bottom = '20px';
    dom.style.zIndex = '1000';

    const checkScreenSize = () => {
      if (window.innerWidth <= 1440) {
        dom.style.right = '10px';
        dom.style.bottom = '10px';
        this.gui.close();
      } else {
        dom.style.right = '20px';
        dom.style.bottom = '20px';
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
  }

  private setupFolders(): void {
    const bulletFolder = this.gui.addFolder('子弹参数');
    bulletFolder.add(this.params, 'bulletSpeed', 1, 30, 0.1)
      .name('初始速度')
      .onChange((value: number) => {
        this.physicsEngine.setConfig({ bulletSpeed: value });
      });

    bulletFolder.add(this.params, 'bulletAngle', -180, 180, 0.5)
      .name('发射角度 (°)')
      .onChange((value: number) => {
        this.physicsEngine.setConfig({ bulletAngle: value });
      });

    bulletFolder.add(this.params, 'gravity', 0, 30, 0.1)
      .name('重力加速度')
      .onChange((value: number) => {
        this.physicsEngine.setConfig({ gravity: value });
      });

    bulletFolder.add(this.params, 'showTrails')
      .name('显示轨迹线')
      .onChange((value: boolean) => {
        this.renderModule.setShowTrails(value);
      });

    const obstacleFolder = this.gui.addFolder('障碍物参数');
    obstacleFolder.add(this.params, 'obstacleType', ['circle', 'rectangle', 'triangle'])
      .name('障碍物类型')
      .onChange((value: 'circle' | 'rectangle' | 'triangle') => {
        this.physicsEngine.setConfig({ obstacleType: value });
        this.renderModule.updateObstacle(this.physicsEngine.getObstacle());
      });

    obstacleFolder.add(this.params, 'collisionMode', ['bounce', 'penetrate'])
      .name('碰撞模式')
      .onChange((value: 'bounce' | 'penetrate') => {
        this.physicsEngine.setConfig({ collisionMode: value });
        this.renderModule.updateObstacle(this.physicsEngine.getObstacle());
      });

    this.displayFolder = this.gui.addFolder('实时数据');
    this.displayFolder.add(this.displayData, 'bulletCount')
      .name('子弹数量')
      .listen()
      .disable();

    this.displayFolder.add(this.displayData, 'bulletSpeed')
      .name('最新子弹速度')
      .listen()
      .disable()
      .decimals(2);

    this.displayFolder.add(this.displayData, 'bulletPosX')
      .name('X 坐标')
      .listen()
      .disable()
      .decimals(3);

    this.displayFolder.add(this.displayData, 'bulletPosY')
      .name('Y 坐标')
      .listen()
      .disable()
      .decimals(3);

    const actionFolder = this.gui.addFolder('操作');
    actionFolder.add(this.params, 'resetScene').name('重置场景');
    actionFolder.add(this.params, 'resetCamera').name('重置视角');
  }

  private handleResetScene(): void {
    this.physicsEngine.reset();
    this.renderModule.clearAll();
    this.renderModule.updateObstacle(this.physicsEngine.getObstacle());
  }

  private handleResetCamera(): void {
    this.renderModule.resetCamera();
  }

  public update(): void {
    const bullets = this.physicsEngine.getBullets();
    this.displayData.bulletCount = bullets.length;

    if (bullets.length > 0) {
      const lastBullet = bullets[bullets.length - 1];
      this.displayData.bulletSpeed = lastBullet.velocity.length();
      this.displayData.bulletPosX = lastBullet.position.x;
      this.displayData.bulletPosY = lastBullet.position.y;
    } else {
      this.displayData.bulletSpeed = 0;
      this.displayData.bulletPosX = 0;
      this.displayData.bulletPosY = 0;
    }
  }

  public getConfig(): PhysicsConfig {
    return {
      gravity: this.params.gravity,
      bulletSpeed: this.params.bulletSpeed,
      bulletAngle: this.params.bulletAngle,
      obstacleType: this.params.obstacleType,
      collisionMode: this.params.collisionMode
    };
  }
}
