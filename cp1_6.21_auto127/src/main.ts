import { SceneManager } from './SceneManager';

const container = document.getElementById('canvas-container');

if (!container) {
  throw new Error('Canvas container element not found');
}

const sceneManager = new SceneManager(container);

sceneManager.start();

window.addEventListener('beforeunload', () => {
  sceneManager.dispose();
});
