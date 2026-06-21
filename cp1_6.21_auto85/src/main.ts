import { initSceneManager } from './sceneManager';
import { initUIManager } from './uiManager';
import { dataManager } from './dataManager';
import { pathEngine } from './pathEngine';

class App {
  private sceneManager: ReturnType<typeof initSceneManager>;
  private uiManager: ReturnType<typeof initUIManager>;

  constructor() {
    this.sceneManager = initSceneManager('three-container');
    this.uiManager = initUIManager();

    this.setupInitialRoute();
    
    console.log('🏛️ 虚拟博物馆导览系统已启动');
    console.log(`📦 展品数量: ${dataManager.getExhibits().length}`);
    console.log(`🗺️ 展区数量: ${dataManager.getZones().length}`);
  }

  private setupInitialRoute(): void {
    const zones = dataManager.getZones();
    if (zones.length < 2) return;

    const startZone = zones[0];
    const endZone = zones[zones.length - 1];

    const startX = (startZone.bounds.minX + startZone.bounds.maxX) / 2;
    const startZ = (startZone.bounds.minZ + startZone.bounds.maxZ) / 2;
    const endX = (endZone.bounds.minX + endZone.bounds.maxX) / 2;
    const endZ = (endZone.bounds.minZ + endZone.bounds.maxZ) / 2;

    const rawPath = pathEngine.findPath(startX, startZ, endX, endZ);
    if (rawPath.length > 0) {
      const smoothedPath = pathEngine.smoothPath(rawPath, 3);
      this.sceneManager.setPath(smoothedPath);
    }
  }

  public dispose(): void {
    this.uiManager.dispose();
    this.sceneManager.dispose();
  }
}

let app: App | null = null;

function initApp(): App {
  if (app) return app;
  app = new App();
  return app;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

export { App, initApp, app };
