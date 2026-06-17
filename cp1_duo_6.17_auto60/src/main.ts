import { SceneModule } from './scene/SceneModule';
import { TransformControlsModule } from './controls/TransformControlsModule';
import { transformStore } from './store/useTransformStore';

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  transformStore.getState();

  const sceneModule = new SceneModule(container);
  const controlsModule = new TransformControlsModule(sceneModule);
  controlsModule.syncFromStore();

  console.log('[3D Transform Visualizer] Initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
